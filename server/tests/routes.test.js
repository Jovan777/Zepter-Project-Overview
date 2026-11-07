import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import userRoutes from '../src/routes/users.js';
import reportRoutes from '../src/routes/reports.js';
import authRoutes from '../src/routes/auth.js';
import projectRoutes from '../src/routes/projects.js';
import dashboardRoutes from '../src/routes/dashboard.js';
import {User, Project, Report, Session, Activity, Idea, Comment, Notification, Sector, Attachment} from '../src/models/index.js';
import bcrypt from 'bcryptjs';
import {randomBytes} from 'node:crypto';
import {errorHandler} from '../src/lib/errors.js';

// Exercise actual HTTP routes against in-memory model doubles; never connect to MongoDB.
const self = '111111111111111111111111';
const colleague = '222222222222222222222222';
const sector = '333333333333333333333333';
const reportId = '444444444444444444444444';
async function withApp(user, run) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {req.user = user; next();});
  app.use('/users', userRoutes);
  app.use('/reports', reportRoutes);
  app.use('/auth', authRoutes);
  app.use('/projects', projectRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {await run(`http://127.0.0.1:${server.address().port}`);}
  finally {await new Promise(resolve => server.close(resolve));}
}

test('Colleague profile filters projects by both people before projecting fields', async t => {
  const projects = [{title: 'Shared project', sector}];
  t.mock.method(User, 'findById', () => ({select: async () => ({_id: colleague, sector})}));
  const find = t.mock.method(Project, 'find', () => ({select: async () => projects}));
  await withApp({_id: self, role: 'employee', sector}, async base => {
    const response = await fetch(`${base}/users/${colleague}`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).projects, projects);
    assert.deepEqual(find.mock.calls[0].arguments[0], {
      $and: [{$or: [{owner: colleague}, {members: colleague}]}, {$or: [{owner: self}, {members: self}]}],
      archived: false
    });
  });
});

test('Manager profile query remains restricted to the manager sector', async t => {
  t.mock.method(User, 'findById', () => ({select: async () => ({_id: colleague, sector})}));
  const find = t.mock.method(Project, 'find', () => ({select: async () => []}));
  await withApp({_id: self, role: 'manager', sector}, async base => {
    assert.equal((await fetch(`${base}/users/${colleague}`)).status, 200);
    assert.equal(find.mock.calls[0].arguments[0].sector, sector);
  });
});

test('President and employee cannot edit or publish report drafts', async t => {
  const find = t.mock.method(Report, 'findById', () => {throw Error('Must reject before database lookup');});
  for (const role of ['president', 'employee']) {
    await withApp({_id: self, role, sector}, async base => {
      assert.equal((await fetch(`${base}/reports/${reportId}`, {
        method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({results: 'Changed'})
      })).status, 403);
      assert.equal((await fetch(`${base}/reports/${reportId}/publish`, {method: 'POST'})).status, 403);
    });
  }
  assert.equal(find.mock.callCount(), 0);
});

test('Manager and admin can edit a draft; published reports stay locked', async t => {
  let saved = 0;
  const report = {sector, status: 'draft', save: async () => {saved++;}};
  t.mock.method(Report, 'findById', async () => report);
  // Audit writes are stubbed as well, so no collection is touched.
  const {Audit} = await import('../src/models/index.js');
  t.mock.method(Audit, 'create', async () => ({}));
  for (const role of ['manager', 'admin']) {
    await withApp({_id: self, role, sector}, async base => {
      const update = () => fetch(`${base}/reports/${reportId}`, {
        method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({results: 'Updated'})
      });
      report.status = 'draft';
      assert.equal((await update()).status, 200);
      report.status = 'published';
      assert.equal((await update()).status, 403);
    });
  }
  assert.equal(saved, 2);
});

test('Pending, rejected and disabled accounts cannot log in even with a valid password', async t => {
  const password = randomBytes(24).toString('hex');
  const user = {passwordHash: await bcrypt.hash(password, 4), approval: 'pending'};
  t.mock.method(User, 'findOne', () => ({select: async () => user}));
  const create = t.mock.method(Session, 'create', () => {throw Error('Unapproved account must not create a session');});
  await withApp({}, async base => {
    for (const approval of ['pending', 'rejected', 'disabled']) {
      user.approval = approval;
      const response = await fetch(`${base}/auth/login`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: 'fixture@example.test', password})
      });
      assert.equal(response.status, 403, approval);
      assert.equal(response.headers.has('set-cookie'), false);
    }
  });
  assert.equal(create.mock.callCount(), 0);
});

test('Personal employee endpoints reject other roles before querying any data', async t => {
  const find = t.mock.method(Project, 'find', () => {throw Error('No data lookup is allowed');});
  for (const role of ['manager', 'president', 'admin']) {
    await withApp({_id: self, role, sector}, async base => {
      assert.equal((await fetch(`${base}/dashboard/employee`)).status, 403);
      assert.equal((await fetch(`${base}/projects/mine`)).status, 403);
    });
  }
  assert.equal(find.mock.callCount(), 0);
});

test('Employee without a sector cannot request a personal data feed', async () => {
  await withApp({_id: self, role: 'employee'}, async base => {
    assert.equal((await fetch(`${base}/dashboard/employee`)).status, 403);
    assert.equal((await fetch(`${base}/projects/mine`)).status, 403);
  });
});

test('Employee without projects receives a valid empty overview and project list', async t => {
  const query = result => {
    const q = {lean: async () => result, then: (ok, fail) => Promise.resolve(result).then(ok, fail)};
    for (const key of ['select', 'sort', 'skip', 'limit', 'populate']) q[key] = () => q;
    return q;
  };
  for (const model of [Project, Activity, Idea, User, Comment, Attachment]) t.mock.method(model, 'find', () => query([]));
  for (const model of [Project, Activity, Notification]) t.mock.method(model, 'countDocuments', async () => 0);
  t.mock.method(Activity, 'distinct', async () => []);
  t.mock.method(Sector, 'findById', () => query({name: 'Test sector'}));
  await withApp({_id: self, role: 'employee', sector}, async base => {
    const response = await fetch(`${base}/dashboard/employee`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.stats.totalProjects, 0);
    assert.equal(data.stats.activeProjects, 0);
    assert.equal(data.stats.pendingActivities, 0);
    assert.deepEqual(data.projects, []);
    assert.deepEqual(data.attention, []);
    assert.deepEqual(data.latestComments, []);
    assert.deepEqual(data.activities.items, []);
    const projects = await fetch(`${base}/projects/mine`);
    assert.equal(projects.status, 200);
    assert.deepEqual((await projects.json()).items, []);
  });
});
