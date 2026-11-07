import test from 'node:test';
import assert from 'node:assert/strict';
import activityRoutes from '../src/routes/activities.js';
import projectRoutes from '../src/routes/projects.js';
import commentRoutes from '../src/routes/comments.js';
import worklogRoutes from '../src/routes/worklogs.js';
import {Activity, Project, Comment, WorkLog, Audit, User} from '../src/models/index.js';
import {withRoutes, query} from './helpers/http.mjs';

const self = '111111111111111111111111', other = '222222222222222222222222';
const sector = '333333333333333333333333', projectId = '444444444444444444444444', activityId = '555555555555555555555555', commentId = '666666666666666666666666';
const user = {_id: self, role: 'employee', sector};
const routes = [['/activities', activityRoutes], ['/projects', projectRoutes], ['/comments', commentRoutes], ['/worklogs', worklogRoutes]];
function fixture(t) {
  const project = {_id: projectId, sector, owner: other, members: [self, other], progress: 20};
  const activity = {_id: activityId, sector, project: projectId, assignees: [self], status: 'in_progress', progress: 40, updatedAt: new Date('2026-11-07T10:00:00Z'), save: t.mock.fn(async () => {})};
  t.mock.method(Project, 'findById', async () => project);
  t.mock.method(Activity, 'findById', async () => activity);
  t.mock.method(Activity, 'find', () => query([{progress: activity.progress}, {progress: 0}]));
  const update = t.mock.method(Project, 'updateOne', async (_filter, patch) => {project.progress = patch.$set.progress;});
  t.mock.method(User, 'find', () => query([]));
  t.mock.method(Audit, 'create', async () => ({}));
  return {project, activity, update};
}
const patch = (base, body, headers = {}) => fetch(`${base}/activities/${activityId}`, {method: 'PATCH', headers: {'Content-Type': 'application/json', ...headers}, body: JSON.stringify(body)});
const post = (base, path, body) => fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});

test('Employee saves own activity and project progress reflects the actual activity average', async t => {
  const {activity, project} = fixture(t);
  await withRoutes(user, routes, async base => {
    const response = await patch(base, {status: 'completed', progress: 70, actualWork: 'Završen zadatak', nextStep: '', blockers: ''});
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.activity.status, 'completed');
    assert.equal(result.activity.progress, 100);
    assert.equal(project.progress, 50);
    assert.equal(activity.save.mock.callCount(), 1);
  });
});
test('Project member cannot update a colleague activity or alter manager-only activity fields', async t => {
  const {activity} = fixture(t);
  await withRoutes(user, routes, async base => {
    activity.assignees = [other];
    assert.equal((await patch(base, {progress: 75})).status, 403);
    activity.assignees = [self];
    for (const body of [{title: 'Forbidden'}, {dueDate: '2026-12-01'}, {assigneeIds: [other]}, {priority: 'urgent'}]) {
      assert.equal((await patch(base, body)).status, 422);
    }
    assert.equal(activity.save.mock.callCount(), 0);
  });
});
test('Stale activity version is rejected without persisting or recalculating progress', async t => {
  const {activity, update} = fixture(t);
  const atomic = t.mock.method(Activity, 'findOneAndUpdate', async () => {throw Error('Must reject stale version');});
  await withRoutes(user, routes, async base => {
    assert.equal((await patch(base, {progress: 80}, {'If-Match': '"2026-11-07T09:00:00.000Z"'})).status, 409);
    assert.equal(activity.save.mock.callCount(), 0);
    assert.equal(atomic.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 0);
  });
});
test('Conditional update uses an atomic timestamp check and returns the new version', async t => {
  const {activity} = fixture(t);
  const nextVersion = new Date('2026-11-07T11:00:00Z');
  const atomic = t.mock.method(Activity, 'findOneAndUpdate', async (_filter, patch) => ({...activity, ...patch.$set, updatedAt: nextVersion}));
  await withRoutes(user, routes, async base => {
    const response = await patch(base, {status: 'in_progress', progress: 75, actualWork: 'Novi unos'}, {'If-Match': '"2026-11-07T10:00:00.000Z"'});
    assert.equal(response.status, 200);
    assert.equal((await response.json()).activity.updatedAt, nextVersion.toISOString());
    assert.deepEqual(atomic.mock.calls[0].arguments[0], {_id: activityId, updatedAt: new Date('2026-11-07T10:00:00Z')});
    assert.equal(atomic.mock.calls[0].arguments[1].$set.actualWork, 'Novi unos');
    assert.equal(activity.save.mock.callCount(), 0);
  });
});
test('A competing write between read and save returns a conflict instead of an unconditional save', async t => {
  const {activity, update} = fixture(t);
  t.mock.method(Activity, 'findOneAndUpdate', async () => null);
  await withRoutes(user, routes, async base => {
    assert.equal((await patch(base, {progress: 80}, {'If-Match': '"2026-11-07T10:00:00.000Z"'})).status, 409);
    assert.equal(activity.save.mock.callCount(), 0);
    assert.equal(update.mock.callCount(), 0);
  });
});
test('Employee cannot change project metadata, including when listed as project owner', async t => {
  const {project} = fixture(t); project.owner = self;
  await withRoutes(user, routes, async base => {
    const response = await fetch(`${base}/projects/${projectId}`, {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({title: 'Forbidden'})});
    assert.equal(response.status, 403);
  });
});
test('Reply stays in its project conversation, marks the parent answered and preserves its parent id', async t => {
  fixture(t);
  const parent = {_id: commentId, author: other, targetType: 'project', targetId: projectId, responseStatus: 'open', save: t.mock.fn(async () => {})};
  t.mock.method(Comment, 'findById', async () => parent);
  const create = t.mock.method(Comment, 'create', async data => ({_id: '777777777777777777777777', ...data}));
  await withRoutes(user, routes, async base => {
    const body = {targetType: 'project', targetId: projectId, body: 'Odgovor', parentId: commentId};
    assert.equal((await post(base, '/comments', body)).status, 201);
    assert.equal(create.mock.calls[0].arguments[0].parent, commentId);
    assert.equal(parent.responseStatus, 'answered');
    assert.equal(parent.save.mock.callCount(), 1);
    parent.targetType = 'activity'; parent.targetId = activityId;
    assert.equal((await post(base, '/comments', body)).status, 422);
    assert.equal(create.mock.callCount(), 1);
  });
});
test('Employee may comment but cannot issue instructions or comment on an inaccessible project', async t => {
  const {project} = fixture(t);
  const create = t.mock.method(Comment, 'create', async data => ({_id: commentId, ...data}));
  await withRoutes(user, routes, async base => {
    const body = {targetType: 'project', targetId: projectId, body: 'Komentar'};
    assert.equal((await post(base, '/comments', body)).status, 201);
    assert.equal((await post(base, '/comments', {...body, kind: 'instruction'})).status, 403);
    project.members = [other];
    assert.equal((await post(base, '/comments', body)).status, 403);
    assert.equal(create.mock.callCount(), 1);
  });
});
test('Logging a completed activity at 100% keeps completed; foreign activity cannot produce a worklog', async t => {
  const {activity} = fixture(t); activity.status = 'completed'; activity.progress = 100;
  const create = t.mock.method(WorkLog, 'create', async data => ({_id: commentId, ...data}));
  await withRoutes(user, routes, async base => {
    const body = {day: '2026-11-07', activityId, done: 'Završen posao', updatedProgress: 100};
    assert.equal((await post(base, '/worklogs', body)).status, 201);
    assert.equal(activity.status, 'completed');
    assert.equal(create.mock.calls[0].arguments[0].activity, activityId);
    activity.assignees = [other];
    assert.equal((await post(base, '/worklogs', body)).status, 403);
    assert.equal(create.mock.callCount(), 1);
  });
});
