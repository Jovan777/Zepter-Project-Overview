import test from 'node:test';
import assert from 'node:assert/strict';
import routes from '../src/routes/ideas.js';
import {Idea, Attachment, Audit, User, Notification} from '../src/models/index.js';
import {withRoutes, query} from './helpers/http.mjs';

const self = '111111111111111111111111', sector = '333333333333333333333333', id = '444444444444444444444444';
const user = {_id: self, role: 'employee', sector};
test('Employee idea feed scopes every count/list to author and groups both review statuses', async t => {
  const find = t.mock.method(Idea, 'find', () => query([{_id: id, title: 'Own', status: 'in_review'}]));
  const count = t.mock.method(Idea, 'countDocuments', filter => Promise.resolve(filter.status === 'revision_requested' ? 1 : 4));
  const images = t.mock.method(Attachment, 'find', () => query([{_id: 'image-id', targetId: id}]));
  await withRoutes(user, [['/ideas', routes]], async base => {
    const response = await fetch(base + '/ideas/mine?tab=review&author=other&sector=other&limit=2&page=2');
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.stats, {total: 4, revision: 1});
    assert.equal(body.items[0].thumbnailId, 'image-id');
    assert.equal(body.page, 2); assert.equal(body.limit, 2);
  });
  assert.deepEqual(find.mock.calls[0].arguments[0], {author: self, status: {$in: ['submitted', 'in_review']}});
  assert.deepEqual(count.mock.calls.map(call => call.arguments[0]), [{author: self, status: {$in: ['submitted', 'in_review']}}, {author: self}, {author: self, status: 'revision_requested'}]);
  assert.deepEqual(images.mock.calls[0].arguments[0].targetId, {$in: [id]});
});
test('Idea feed rejects other roles and invalid tabs before database access; empty feeds skip attachment lookup', async t => {
  const find = t.mock.method(Idea, 'find', () => query([]));
  t.mock.method(Idea, 'countDocuments', async () => 0);
  const attachments = t.mock.method(Attachment, 'find', () => {throw Error('No images for empty list');});
  for (const role of ['admin', 'president', 'manager']) await withRoutes({...user, role}, [['/ideas', routes]], async base => {
    assert.equal((await fetch(base + '/ideas/mine')).status, 403);
  });
  await withRoutes(user, [['/ideas', routes]], async base => {
    assert.equal((await fetch(base + '/ideas/mine?tab=__proto__')).status, 422);
    const body = await (await fetch(base + '/ideas/mine?tab=revision')).json();
    assert.deepEqual(body.stats, {total: 0, revision: 0});
    assert.deepEqual(body.items, []);
  });
  assert.equal(find.mock.callCount(), 1); assert.equal(attachments.mock.callCount(), 0);
});
test('Idea creation derives sector/author/status from session and notifies only approved managers', async t => {
  const create = t.mock.method(Idea, 'create', async data => ({_id: id, ...data}));
  t.mock.method(Audit, 'create', async () => ({}));
  const manager = '222222222222222222222222';
  const recipients = t.mock.method(User, 'find', () => query([{_id: manager}]));
  const notify = t.mock.method(Notification, 'create', async fields => fields);
  await withRoutes(user, [['/ideas', routes]], async base => {
    const post = body => fetch(base + '/ideas', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    const draft = {title: 'Nova ideja', description: 'Opis predloga', benefit: 'Bolji rad'};
    assert.equal((await post({...draft, sector: 'other', author: 'other', status: 'forwarded'})).status, 422);
    assert.equal((await post({...draft, title: '  '})).status, 422);
    const response = await post(draft);
    assert.equal(response.status, 201);
    assert.equal((await response.json()).idea.status, 'submitted');
    assert.deepEqual(create.mock.calls[0].arguments[0], {...draft, sector, author: self, status: 'submitted'});
  });
  assert.equal(recipients.mock.calls[0].arguments[0].sector, sector);
  assert.equal(recipients.mock.calls[0].arguments[0].role, 'manager');
  assert.equal(recipients.mock.calls[0].arguments[0].approval, 'approved');
  assert.equal(notify.mock.calls[0].arguments[0].user, manager);
  assert.equal(notify.mock.calls[0].arguments[0].link, '/ideas/' + id);
});
test('Creation requires an employee/manager sector; colleague idea stays private even within the same sector', async t => {
  const create = t.mock.method(Idea, 'create', () => {throw Error('Must not create');});
  for (const account of [{...user, sector: null}, {...user, role: 'president'}, {...user, role: 'admin'}]) {
    await withRoutes(account, [['/ideas', routes]], async base => {
      assert.equal((await fetch(base + '/ideas', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title: 'Title', description: 'Description'})})).status, 403);
    });
  }
  t.mock.method(Idea, 'findById', async () => ({_id: id, author: '222222222222222222222222', sector, status: 'forwarded'}));
  await withRoutes(user, [['/ideas', routes]], async base => {
    assert.equal((await fetch(base + '/ideas/' + id)).status, 403);
    assert.equal((await fetch(base + '/ideas/' + id, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title: 'Changed'})})).status, 403);
  });
  assert.equal(create.mock.callCount(), 0);
});
