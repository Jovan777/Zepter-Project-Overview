import test from 'node:test';
import assert from 'node:assert/strict';
import {isWorkspaceLinkActive, workspaceLinks} from '../src/features/workspace/navigation.js';

test('Shared navigation keeps each role’s existing destinations', () => {
  assert.deepEqual(workspaceLinks.employee.map(([path]) => path), ['/', '/projects', '/ideas', '/notifications']);
  assert.deepEqual(workspaceLinks.manager.map(([path]) => path), ['/', '/projects', '/reports', '/ideas']);
});

test('Project and idea deep links retain the relevant navigation context', () => {
  for (const path of ['/projects', '/projects/new', '/projects/444444444444444444444444', '/activities/555555555555555555555555']) {
    assert.equal(isWorkspaceLinkActive(path, '/projects'), true, path);
    assert.equal(isWorkspaceLinkActive(path, '/'), false, path);
    assert.equal(isWorkspaceLinkActive(path, '/ideas'), false, path);
  }
  for (const path of ['/ideas', '/ideas/new', '/ideas/b2b2b2b2b2b2b2b2b2b2b2b2']) {
    assert.equal(isWorkspaceLinkActive(path, '/ideas'), true, path);
    assert.equal(isWorkspaceLinkActive(path, '/projects'), false, path);
  }
  assert.equal(isWorkspaceLinkActive('/reports/new', '/reports'), true);
  assert.equal(isWorkspaceLinkActive('/projects-other', '/projects'), false);
  assert.equal(isWorkspaceLinkActive('/', '/'), true);
});
