import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {Activity, Project, Attachment, Audit} from '../src/models/index.js';
import {withRoutes} from './helpers/http.mjs';

// Real uploads/downloads are tested only in a newly created OS temporary directory.
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'zepter-attachment-tests-'));
process.env.UPLOAD_DIR = folder;
process.env.MAX_UPLOAD_MB = '0.01';
const {default: attachmentRoutes} = await import('../src/routes/attachments.js');
const png = await fs.readFile(new URL('../../client/public/icons/icon-192.png', import.meta.url));
after(async () => {
  if (path.dirname(path.resolve(folder)) !== path.resolve(os.tmpdir()) || !path.basename(folder).startsWith('zepter-attachment-tests-')) throw Error('Unsafe fixture cleanup path');
  await fs.rm(folder, {recursive: true, force: true});
});
const self = '111111111111111111111111', other = '222222222222222222222222', sector = '333333333333333333333333';
const projectId = '444444444444444444444444', activityId = '555555555555555555555555', attachmentId = '666666666666666666666666';
const user = {_id: self, role: 'employee', sector};
function fixture(t) {
  const project = {_id: projectId, sector, owner: other, members: [self, other]};
  const activity = {_id: activityId, sector, project: projectId, assignees: [self]};
  t.mock.method(Project, 'findById', async () => project);
  t.mock.method(Activity, 'findById', async () => activity);
  t.mock.method(Audit, 'create', async () => ({}));
  return {project, activity};
}
async function upload(base, content, name = 'primer.png') {
  const body = new FormData(); body.append('file', new Blob([content], {type: 'image/png'}), name);
  return fetch(`${base}/attachments?targetType=activity&targetId=${activityId}`, {method: 'POST', body});
}
test('Attachment config exposes actual limits; own image uploads, downloads privately and can be removed', async t => {
  fixture(t);
  let metadata;
  t.mock.method(Attachment, 'create', async fields => {metadata = {_id: attachmentId, ...fields, deleteOne: async () => {}}; return metadata;});
  t.mock.method(Attachment, 'findById', async () => metadata);
  await withRoutes(user, [['/attachments', attachmentRoutes]], async base => {
    const config = await (await fetch(base + '/attachments/config')).json();
    assert.equal(config.maxBytes, Math.floor(0.01 * 1024 * 1024));
    assert.ok(config.extensions.includes('.png'));
    assert.equal(config.extensions.includes('.fig'), false);
    assert.equal((await upload(base, png)).status, 201);
    assert.equal(metadata.owner, self);
    assert.equal(metadata.mime, 'image/png');
    const download = await fetch(`${base}/attachments/${attachmentId}`);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get('cache-control'), 'no-store');
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
    assert.equal((await fetch(`${base}/attachments/${attachmentId}`, {method: 'DELETE'})).status, 200);
    await assert.rejects(fs.access(path.join(folder, metadata.fileName)));
  });
});
test('Spoofed image, unsupported format and oversized upload are rejected without creating metadata', async t => {
  fixture(t);
  const create = t.mock.method(Attachment, 'create', async () => {throw Error('Invalid files must never create metadata');});
  await withRoutes(user, [['/attachments', attachmentRoutes]], async base => {
    const before = await fs.readdir(folder);
    assert.equal((await upload(base, 'not an image')).status, 422);
    assert.equal((await upload(base, png, 'dizajn.fig')).status, 422);
    assert.equal((await upload(base, Buffer.alloc(25000))).status, 413);
    assert.equal(create.mock.callCount(), 0);
    assert.deepEqual(await fs.readdir(folder), before);
  });
});
test('Read access does not permit upload to a colleague activity or removal of a colleague file', async t => {
  const {activity, project} = fixture(t);
  const remove = t.mock.fn(async () => {});
  const create = t.mock.method(Attachment, 'create', async () => {throw Error('Unauthorized upload');});
  t.mock.method(Attachment, 'findById', async () => ({_id: attachmentId, owner: other, targetType: 'activity', targetId: activityId, deleteOne: remove}));
  await withRoutes(user, [['/attachments', attachmentRoutes]], async base => {
    activity.assignees = [other];
    assert.equal((await upload(base, png)).status, 403);
    assert.equal((await fetch(`${base}/attachments/${attachmentId}`, {method: 'DELETE'})).status, 403);
    project.members = [other];
    assert.equal((await fetch(`${base}/attachments/${attachmentId}`)).status, 403);
    assert.equal(create.mock.callCount(), 0);
    assert.equal(remove.mock.callCount(), 0);
  });
});
