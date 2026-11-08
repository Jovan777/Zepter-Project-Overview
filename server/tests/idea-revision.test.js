import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../src/routes/ideas.js';
import comments from '../src/routes/comments.js';
import {Idea, User, Audit, Notification, Comment} from '../src/models/index.js';
import {withRoutes, query} from './helpers/http.mjs';

const self = '111111111111111111111111', manager = '222222222222222222222222', sector = '333333333333333333333333', id = '444444444444444444444444';
const user = {_id: self, role: 'employee', sector};
const initial = () => ({_id: id, author: self, sector, title: 'Predlog', description: 'Opis', benefit: '', reviewNote: 'Dopunite plan.', revisionCount: 0, status: 'revision_requested', updatedAt: new Date('2026-11-08T10:00:00Z')});
const headers = value => ({'Content-Type': 'application/json', 'If-Match': `"${value.updatedAt.toISOString()}"`});
function events(t) {
  t.mock.method(Audit, 'create', async () => ({}));
  t.mock.method(User, 'find', () => query([{_id: manager}]));
  return t.mock.method(Notification, 'create', async fields => fields);
}
test('Author saves a versioned revision and resubmits once with latest version and manager notification', async t => {
  let row = initial();
  t.mock.method(Idea, 'findById', async () => ({...row}));
  const update = t.mock.method(Idea, 'findOneAndUpdate', async (filter, patch) => {
    if (row.status !== filter.status || (filter.updatedAt && +row.updatedAt !== +filter.updatedAt)) return null;
    row = {...row, ...patch.$set, revisionCount: row.revisionCount + (patch.$inc?.revisionCount || 0), updatedAt: new Date(+row.updatedAt + 1000)}; return {...row};
  });
  const notify = events(t);
  await withRoutes(user, [['/ideas', routes]], async base => {
    const before = {...row};
    const save = await fetch(base + '/ideas/' + id, {method: 'PATCH', headers: headers(row), body: JSON.stringify({description: 'Dopunjen plan'})});
    assert.equal(save.status, 200); assert.equal(row.status, 'revision_requested');
    assert.equal(notify.mock.callCount(), 0);
    assert.equal((await fetch(base + '/ideas/' + id + '/resubmit', {method: 'POST', headers: headers(before)})).status, 409);
    assert.equal((await fetch(base + '/ideas/' + id + '/resubmit', {method: 'POST', headers: headers(row)})).status, 200);
    assert.equal(row.status, 'submitted'); assert.equal(row.reviewNote, ''); assert.equal(row.revisionCount, 1);
    assert.equal((await fetch(base + '/ideas/' + id + '/resubmit', {method: 'POST', headers: headers(row)})).status, 409);
  });
  assert.equal(update.mock.calls[0].arguments[0].author, self);
  assert.equal(update.mock.calls[0].arguments[0].status, 'revision_requested');
  assert.equal(notify.mock.callCount(), 1); assert.equal(notify.mock.calls[0].arguments[0].type, 'idea_resubmitted');
});
test('Stale version, atomic race, forbidden author fields and non-revision status cannot overwrite idea', async t => {
  const row = initial();
  t.mock.method(Idea, 'findById', async () => ({...row}));
  const update = t.mock.method(Idea, 'findOneAndUpdate', async () => null);
  const notify = events(t);
  await withRoutes(user, [['/ideas', routes]], async base => {
    const patch = (body, h = headers(row)) => fetch(base + '/ideas/' + id, {method: 'PATCH', headers: h, body: JSON.stringify(body)});
    assert.equal((await patch({title: 'Changed'}, {...headers(row), 'If-Match': '"old"'})).status, 409);
    assert.equal((await patch({sector, status: 'forwarded'})).status, 422);
    assert.equal((await patch({title: 'Changed'})).status, 409);
    assert.equal((await fetch(base + '/ideas/' + id + '/resubmit', {method: 'POST', headers: headers(row)})).status, 409);
    row.status = 'submitted';
    assert.equal((await patch({title: 'Changed'})).status, 409);
  });
  assert.equal(update.mock.callCount(), 2); assert.equal(notify.mock.callCount(), 0);
});
test('Employee answers a leadership comment on own idea but cannot post to a colleague idea', async t => {
  const row = initial(), parentId = '555555555555555555555555';
  const parent = {_id: parentId, author: manager, targetType: 'idea', targetId: id, kind: 'instruction', responseStatus: 'open', save: async () => {}};
  t.mock.method(Idea, 'findById', async () => row);
  t.mock.method(Comment, 'findById', async () => parent);
  const create = t.mock.method(Comment, 'create', async fields => ({_id: '666666666666666666666666', ...fields}));
  events(t);
  await withRoutes(user, [['/comments', comments]], async base => {
    const send = () => fetch(base + '/comments', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({targetType: 'idea', targetId: id, parentId, kind: 'comment', body: 'Dopuniću predlog.'})});
    assert.equal((await send()).status, 201); assert.equal(parent.responseStatus, 'answered');
    row.author = manager;
    assert.equal((await send()).status, 403);
  });
  assert.equal(create.mock.callCount(), 1); assert.equal(create.mock.calls[0].arguments[0].parent, parentId);
});
