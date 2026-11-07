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
