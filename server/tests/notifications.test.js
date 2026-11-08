import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../src/routes/notifications.js';
import {Notification} from '../src/models/index.js';
import {notificationFilter} from '../src/lib/notificationFilters.js';
import {withRoutes, query} from './helpers/http.mjs';

const self = '111111111111111111111111', id = '444444444444444444444444';
const user = {_id: self, role: 'employee'};
test('Notification categories retain session user scope, including legacy instruction records', () => {
  for (const category of ['all', 'tasks', 'projects', 'ideas', 'guidance']) assert.equal(notificationFilter(self, category).user, self);
  assert.ok(notificationFilter(self, 'tasks').link.test('/activities/' + id));
  assert.ok(notificationFilter(self, 'tasks').link.test('/assignments/' + id));
  assert.equal(notificationFilter(self, 'projects').link.test('/ideas/' + id), false);
  assert.deepEqual(notificationFilter(self, 'guidance').$or, [{type: 'instruction'}, {type: 'comment', title: 'Nova instrukcija'}]);
  assert.throws(() => notificationFilter(self, '__proto__'));
  assert.throws(() => notificationFilter(self, {user: 'other'}));
});
test('Grouped pagination fills the boundary page with unread then read items without dropping either group', async t => {
  const rows = [{_id: 'unread', readAt: null}, {_id: 'read-1', readAt: new Date()}, {_id: 'read-2', readAt: new Date()}];
  const calls = [];
  t.mock.method(Notification, 'countDocuments', async filter => filter.readAt === null ? 3 : 5);
  t.mock.method(Notification, 'find', filter => {
    const record = {filter}; calls.push(record);
    const q = query([]); q.skip = n => {record.skip = n; return q;}; q.limit = n => {record.limit = n; return q;};
    q.then = (ok, fail) => Promise.resolve(filter.readAt === null ? [rows[0]] : [rows[1]]).then(ok, fail);
    return q;
  });
  await withRoutes(user, [['/notifications', routes]], async base => {
    const body = await (await fetch(base + '/notifications?grouped=true&page=2&limit=2&category=ideas&user=other')).json();
    assert.deepEqual(body.items.map(x => x._id), ['unread', 'read-1']);
    assert.equal(body.filteredUnread, 3); assert.equal(body.unread, 3);
    assert.equal(body.total, 5);
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].filter.user, self); assert.ok(calls[0].filter.link.test('/ideas/' + id));
  assert.equal(calls[0].skip, 2); assert.equal(calls[0].limit, 1);
  assert.deepEqual(calls[1].filter.readAt, {$ne: null}); assert.equal(calls[1].skip, 0); assert.equal(calls[1].limit, 1);
});
test('Later grouped pages skip only the consumed read rows; invalid categories never query', async t => {
  t.mock.method(Notification, 'countDocuments', async filter => filter.readAt === null ? 3 : 10);
  let readSkip;
  const find = t.mock.method(Notification, 'find', filter => {
    assert.deepEqual(filter.readAt, {$ne: null}); const q = query([]); q.skip = n => {readSkip = n; return q;}; return q;
  });
  await withRoutes(user, [['/notifications', routes]], async base => {
    assert.equal((await fetch(base + '/notifications?category=invalid')).status, 422);
    assert.equal((await fetch(base + '/notifications?grouped=true&page=3&limit=2')).status, 200);
  });
  assert.equal(find.mock.callCount(), 1); assert.equal(readSkip, 1);
});
test('Read and read-all operations cannot mark another user notifications', async t => {
  const one = t.mock.method(Notification, 'findOneAndUpdate', async () => null);
  const all = t.mock.method(Notification, 'updateMany', async () => ({modifiedCount: 2}));
  await withRoutes(user, [['/notifications', routes]], async base => {
    assert.equal((await fetch(base + `/notifications/${id}/read`, {method: 'PATCH'})).status, 404);
    const response = await fetch(base + '/notifications/read-all', {method: 'POST'});
    assert.deepEqual(await response.json(), {updated: 2});
  });
  assert.deepEqual(one.mock.calls[0].arguments[0], {_id: id, user: self});
  assert.deepEqual(all.mock.calls[0].arguments[0], {user: self, readAt: null});
});
