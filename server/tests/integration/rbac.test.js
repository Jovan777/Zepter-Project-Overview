// Explicit integration suite against an already running LOCAL demo API.
// Business data is read-only; login/logout create/revoke authentication sessions.
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.API_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;
const url = new URL(base);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only a local demo API is permitted');
assert.ok(process.env.DEMO_SEED_PASSWORD, 'Set DEMO_SEED_PASSWORD in server/.env');
const sessions = [];
async function call(route, session) {
  const response = await fetch(base + '/api' + route, {
    headers: session ? {Authorization: `Bearer ${session.token}`} : {},
    signal: AbortSignal.timeout(10000)
  });
  return {status: response.status, data: await response.json()};
}
async function login(tag) {
  const response = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: tag + '@demo.zepter.test', password: process.env.DEMO_SEED_PASSWORD}),
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.status, 200, `Demo login failed: ${tag}`);
  const data = await response.json();
  const session = {token: data.accessToken, user: data.user, cookie: response.headers.getSetCookie()[0]?.split(';')[0]};
  sessions.push(session);
  return session;
}

test('Live demo authorization boundaries (no business data changes)', async t => {
  try {
    const admin = await login('admin');
    const president = await login('predsednik');
    const manager = await login('rukovodilac.mkt');
    const otherManager = await login('rukovodilac.it');
    const employee = await login('zaposleni1.mkt');
    const otherEmployee = await login('zaposleni1.it');
    const ownProjects = await call('/projects', employee);
    const foreignProjects = await call('/projects', otherManager);
    assert.equal(ownProjects.status, 200);
    assert.equal(foreignProjects.status, 200);
    const foreign = foreignProjects.data.items[0];
    assert.ok(foreign, 'IT demo project fixture required');

    const denied = [
      ['Anonymous cannot read projects', '/projects', null, 401],
      ['Employee cannot administer users', '/admin/users', employee, 403],
      ['Manager cannot administer users', '/admin/users', manager, 403],
      ['President cannot administer users', '/admin/users', president, 403],
      ['Employee cannot read team logs', '/worklogs/team', employee, 403],
      ['Employee cannot read company report', '/reports/preview?scope=company', employee, 403],
      ['Employee cannot read another employee report', `/reports/preview?scope=employee&id=${otherEmployee.user._id}`, employee, 403],
      ['Employee cannot read another sector project', `/projects/${foreign._id}`, employee, 403],
      ['Manager cannot read another sector project', `/projects/${foreign._id}`, manager, 403],
      ['Employee cannot read another sector', `/sectors/${otherManager.user.sector}`, employee, 403],
      ['Manager cannot read another sector logs', `/worklogs/team?sectorId=${otherManager.user.sector}`, manager, 403],
      ['Manager cannot read another sector report', `/reports/preview?scope=sector&id=${otherManager.user.sector}`, manager, 403],
      ['Employee cannot read another sector profile', `/users/${otherEmployee.user._id}`, employee, 403]
    ];
    for (const [name, route, session, status] of denied) {
      await t.test(name, async () => assert.equal((await call(route, session)).status, status));
    }
    await t.test('Administrator can list accounts', async () => {
      assert.equal((await call('/admin/users', admin)).status, 200);
    });
    await t.test('President can read another sector project', async () => {
      assert.equal((await call(`/projects/${foreign._id}`, president)).status, 200);
    });
    await t.test('Employee can read own personal report', async () => {
      assert.equal((await call(`/reports/preview?scope=employee&id=${employee.user._id}`, employee)).status, 200);
    });
    await t.test('Colleague profile only lists projects visible to employee', async () => {
      const profile = await call(`/users/${manager.user._id}`, employee);
      assert.equal(profile.status, 200);
      const ownIds = new Set(ownProjects.data.items.map(p => p._id));
      assert.ok(profile.data.projects.every(p => ownIds.has(p._id)));
    });
    const ideas = await call('/ideas', otherManager);
    assert.equal(ideas.status, 200);
    const privateIdea = ideas.data.items.find(i => i.status !== 'forwarded');
    assert.ok(privateIdea, 'Unforwarded IT idea fixture required');
    await t.test('President cannot read unforwarded ideas', async () => {
      assert.equal((await call(`/ideas/${privateIdea._id}`, president)).status, 403);
    });
    await t.test('Manager cannot read ideas in another sector', async () => {
      assert.equal((await call(`/ideas/${privateIdea._id}`, manager)).status, 403);
    });
    await t.test('Foreign project attachments are protected', async () => {
      const route = `/attachments/target/project/${foreign._id}`;
      assert.equal((await call(route, employee)).status, 403);
      assert.equal((await call(route, president)).status, 200);
    });
    const mine = await call('/projects/mine?limit=50', employee);
    await t.test('Personal project list contains only accessible projects and assigned activities', async () => {
      assert.equal(mine.status, 200);
      const ownIds = new Set(ownProjects.data.items.map(p => p._id));
      assert.equal(mine.data.total, ownProjects.data.total);
      assert.ok(mine.data.items.every(p => ownIds.has(p._id)));
      for (const project of mine.data.items) {
        const source = await call(`/activities/project/${project._id}`, employee);
        const assigned = source.data.items.filter(a => a.assignees.some(u => u._id === employee.user._id));
        assert.deepEqual(project.myActivities.map(a => a._id).sort(), assigned.map(a => a._id).sort());
      }
    });
    await t.test('Caller cannot override identity or sector of personal project list', async () => {
      const overridden = await call(`/projects/mine?limit=50&sectorId=${otherEmployee.user.sector}&userId=${otherEmployee.user._id}`, employee);
      assert.equal(overridden.status, 200);
      assert.deepEqual(overridden.data.items.map(p => p._id), mine.data.items.map(p => p._id));
    });
    await t.test('Personal search treats regex symbols literally', async () => {
      const search = await call('/projects/mine?q=' + encodeURIComponent('.*'), employee);
      assert.equal(search.status, 200);
      assert.equal(search.data.total, ownProjects.data.items.filter(p => p.title.includes('.*')).length);
    });
    await t.test('Project tabs preserve real project states and personal review assignments', async () => {
      for (const tab of ['active', 'review', 'completed']) {
        const response = await call('/projects/mine?tab=' + tab, employee);
        assert.equal(response.status, 200);
        assert.ok(response.data.items.every(p => tab === 'review' ? p.myActivities.some(a => a.status === 'review') : tab === 'completed' ? p.status === 'completed' : ['active', 'at_risk', 'on_hold'].includes(p.status)));
      }
      assert.equal((await call('/projects/mine?tab=invalid', employee)).status, 422);
    });
    await t.test('Employee home feed only returns accessible activities and leadership comments', async () => {
      const overview = await call('/dashboard/employee', employee);
      assert.equal(overview.status, 200);
      assert.equal(overview.data.stats.totalProjects, ownProjects.data.total);
      assert.ok(overview.data.projects.length <= 2);
      const targets = [...overview.data.activities.items.map(a => '/activities/' + a._id), ...overview.data.attention.map(a => a.link), ...overview.data.latestComments.map(c => c.link)];
      for (const route of new Set(targets)) assert.equal((await call(route, employee)).status, 200, route);
      assert.ok(overview.data.latestComments.every(c => ['president', 'manager'].includes(c.author?.role)));
      const tampered = await call(`/dashboard/employee?sectorId=${otherEmployee.user.sector}&userId=${otherEmployee.user._id}`, employee);
      assert.equal(tampered.status, 200);
      assert.deepEqual(tampered.data.stats, overview.data.stats);
    });
    await t.test('Other roles cannot use the personal employee feed', async () => {
      for (const session of [admin, president, manager]) {
        assert.equal((await call('/dashboard/employee', session)).status, 403);
        assert.equal((await call('/projects/mine', session)).status, 403);
      }
    });
    await t.test('Upload configuration requires authentication and exposes only formats and a size limit', async () => {
      assert.equal((await call('/attachments/config')).status, 401);
      const config = await call('/attachments/config', employee);
      assert.equal(config.status, 200);
      assert.ok(Number.isInteger(config.data.maxBytes) && config.data.maxBytes > 0);
      assert.ok(config.data.extensions.includes('.png') && config.data.extensions.includes('.pdf'));
      assert.deepEqual(Object.keys(config.data).sort(), ['extensions', 'maxBytes']);
    });
    await t.test('Activity detail returns the project context, assigned people and a usable save version', async () => {
      const project = mine.data.items.find(p => p.myActivities.length);
      assert.ok(project, 'Assigned activity fixture required');
      const detail = await call('/activities/' + project.myActivities[0]._id, employee);
      assert.equal(detail.status, 200);
      assert.equal(detail.data.project._id, project._id);
      assert.ok(detail.data.activity.assignees.some(person => person._id === employee.user._id));
      assert.ok(Number.isFinite(Date.parse(detail.data.activity.updatedAt)));
    });
  } finally {
    for (const session of sessions) {
      if (session.cookie) {
        const response = await fetch(base + '/api/auth/logout', {
          method: 'POST', headers: {Cookie: session.cookie}, signal: AbortSignal.timeout(10000)
        });
        assert.equal(response.status, 200, 'Test session cleanup');
      }
    }
  }
});
