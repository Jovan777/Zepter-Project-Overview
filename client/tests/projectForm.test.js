import test from 'node:test';
import assert from 'node:assert/strict';
import {activityPayload, projectDraft, projectPayload, saveProjectWithActivities} from '../src/features/manager/projectForm.js';

const user = {_id: 'manager', sector: 'sector'};
const existing = {_id: 'project', title: 'Projekat', description: 'Opis', status: 'active', priority: 'high', sector: 'sector',
  owner: {_id: 'owner'}, members: [{_id: 'owner'}, {_id: 'member'}], dueDate: '2026-11-30T12:00:00Z', startDate: '2026-11-01T12:00:00Z'};

test('Project edit sends only changed fields and clears dates with null; team order is immaterial', () => {
  const baseline = projectDraft(existing, user);
  assert.deepEqual(projectPayload({...baseline, memberIds: ['member', 'owner']}, baseline), {});
  assert.deepEqual(projectPayload({...baseline, dueDate: '', startDate: '2026-11-09'}, baseline), {dueDate: null, startDate: '2026-11-09'});
  const body = projectPayload({...baseline, title: '  Novo ime  ', ownerId: 'member', memberIds: ['owner']}, baseline);
  assert.equal(body.title, 'Novo ime'); assert.equal(body.ownerId, 'member');
  assert.equal('sectorId' in body, false); assert.equal('progress' in body, false);
});

test('New project and activity payloads preserve existing API fields and normalize people', () => {
  const draft = projectDraft(null, user), body = projectPayload({...draft, title: ' Novi ', description: ' Opis ', memberIds: ['member', 'member']});
  assert.equal(body.sectorId, 'sector'); assert.deepEqual(body.memberIds, ['manager', 'member']);
  assert.equal(body.title, 'Novi'); assert.equal(body.dueDate, undefined);
  assert.deepEqual(activityPayload({title: ' Posao ', assigneeIds: ['member', 'member'], dueDate: ''}), {title: 'Posao', description: '', assigneeIds: ['member'], dueDate: undefined, priority: 'medium', status: 'planned', progress: 0});
});

test('Partial activity retry retains the project and skips activities already created', async () => {
  const session = {activities: new Map()}, calls = [], rows = [{id: 'a', title: 'A'}, {id: 'b', title: 'B'}];
  let fail = true;
  const request = async (path, options) => {
    calls.push({path, options});
    if (path === '/projects') return {project: {_id: 'saved'}};
    if (options.body.title === 'B' && fail) {fail = false; throw Object.assign(Error('Invalid'), {status: 422});}
    return {activity: {_id: options.body.title}};
  };
  const options = {request, draft: projectDraft(null, user), activities: rows};
  assert.deepEqual((await saveProjectWithActivities(session, options)).failures, ['b']);
  assert.deepEqual((await saveProjectWithActivities(session, options)).failures, []);
  assert.equal(calls.filter(call => call.path === '/projects').length, 1);
  assert.equal(calls.filter(call => call.options.body.title === 'A').length, 1);
  assert.equal(session.activities.size, 2);
});

test('Versioned project edit is sent once before initial activity creation', async () => {
  const session = {projectId: 'project', version: '2026-11-08T10:00:00.000Z', activities: new Map()}, calls = [];
  await saveProjectWithActivities(session, {request: async (path, options) => {calls.push({path, options}); return path === '/projects/project' ? {project: {_id: 'project'}} : {activity: {_id: 'activity'}};},
    draft: {...projectDraft(existing, user), priority: 'low'}, baseline: projectDraft(existing, user), activities: [{id: 'a', title: 'Aktivnost'}]});
  assert.equal(calls[0].options.method, 'PATCH'); assert.deepEqual(calls[0].options.body, {priority: 'low'});
  assert.equal(calls[0].options.headers['If-Match'], '"2026-11-08T10:00:00.000Z"');
  assert.equal(calls[1].path, '/activities/project/project');
});

test('Ambiguous project or activity response blocks blind retries', async () => {
  for (const stage of ['project', 'activity']) {
    const session = {activities: new Map()}, calls = [];
    const options = {draft: projectDraft(null, user), activities: [{id: 'a', title: 'A'}], request: async path => {
      calls.push(path); if (path === '/projects' && stage === 'activity') return {project: {_id: 'saved'}};
      throw Error('Network response lost');
    }};
    try {await saveProjectWithActivities(session, options);} catch {}
    const count = calls.length;
    assert.equal(session.uncertain, true);
    await assert.rejects(saveProjectWithActivities(session, options), /Proverite/);
    assert.equal(calls.length, count);
  }
});
