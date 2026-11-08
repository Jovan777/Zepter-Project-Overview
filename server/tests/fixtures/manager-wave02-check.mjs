import assert from 'node:assert/strict';
if (process.env.ZEPTER_UI_FIXTURE !== '1') throw Error('Set ZEPTER_UI_FIXTURE=1 and start the isolated manager fixture.');
const base = 'http://127.0.0.1:4002/api';
const call = async (path, {method = 'GET', body, headers = {}} = {}) => {
  const response = await fetch(base + path, {method, headers: {'Content-Type': 'application/json', ...headers},
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000)});
  return {status: response.status, data: await response.json()};
};
const auth = await call('/auth/refresh', {method: 'POST'});
assert.equal(auth.data.accessToken, 'isolated-ui-fixture');
assert.equal(auth.data.user.role, 'manager');
const user = auth.data.user, sector = user.sector;
const people = await call('/sectors/' + sector + '/people');
assert.equal(people.status, 200);
const employee = people.data.items.find(person => person.role === 'employee');
const created = await call('/projects', {method: 'POST', body: {sectorId: sector, title: 'Wave 02 isolated project', description: 'Memory-only test',
  ownerId: user._id, memberIds: [employee._id], dueDate: '2027-01-31', startDate: '2026-11-09'}});
assert.equal(created.status, 201);
const id = created.data.project._id;
assert.equal(created.data.project.progress, 0);
assert.ok(created.data.project.members.includes(user._id));
assert.ok(created.data.project.members.includes(employee._id));
console.log('OK project creation, sector people and effective owner/team');

const activity = await call('/activities/project/' + id, {method: 'POST', body: {title: 'Initial activity', assigneeIds: [employee._id], dueDate: '2027-01-20'}});
assert.equal(activity.status, 201);
const tasks = await call('/activities/project/' + id);
assert.equal(tasks.data.items.length, 1);
assert.equal(tasks.data.items[0].assignees[0]._id, employee._id);
const removal = await call('/projects/' + id, {method: 'PATCH', body: {memberIds: [user._id]}});
assert.equal(removal.status, 409);
const fresh = (await call('/projects/' + id)).data.project;
assert.ok(fresh.members.some(person => person._id === employee._id));
const header = {'If-Match': `"${fresh.updatedAt}"`};
const updated = await call('/projects/' + id, {method: 'PATCH', headers: header, body: {title: 'Updated isolated project', dueDate: null, startDate: '2026-11-10'}});
assert.equal(updated.status, 200);
assert.equal(updated.data.project.dueDate, null);
assert.equal(updated.data.project.startDate, '2026-11-10T12:00:00.000Z');
assert.equal((await call('/projects/' + id, {method: 'PATCH', headers: {'If-Match': '"stale"'}, body: {title: 'Must not overwrite'}})).status, 409);
console.log('OK activity assignment, protected member removal, nullable dates and stale-version rejection');

const parent = await call('/comments', {method: 'POST', body: {targetType: 'project', targetId: id, kind: 'instruction', body: 'Follow the project plan.'}});
assert.equal(parent.status, 201);
const response = await call('/comments', {method: 'POST', body: {targetType: 'project', targetId: id, kind: 'comment', parentId: parent.data.comment._id, body: 'Plan confirmed.'}});
assert.equal(response.status, 201);
const thread = (await call(`/comments?targetType=project&targetId=${id}`)).data;
assert.equal(thread.total, 2);
assert.ok(thread.items.some(comment => comment.parent === parent.data.comment._id));
assert.equal((await call('/comments/' + parent.data.comment._id + '/resolve', {method: 'PATCH'})).status, 200);
assert.equal((await call('/projects/' + id, {method: 'PATCH', body: {status: 'completed'}})).status, 409);
assert.equal((await call('/projects/' + id, {method: 'PATCH', body: {status: 'cancelled'}})).status, 200);
assert.equal((await call('/activities/project/' + id, {method: 'POST', body: {title: 'Closed project activity'}})).status, 409);
assert.equal((await call('/projects/' + 'f6'.repeat(12))).status, 403);
console.log('OK contextual instructions/replies, resolution, closed project guard and foreign-sector read denial');
console.log('All wave 02 API checks passed in the isolated fixture; no MongoDB connection.');
