import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationDestination, notificationIcon, notificationTime} from '../src/features/employee/notifications.js';

test('Notification navigation accepts only known local resource paths', () => {
  const id = '111111111111111111111111';
  for (const resource of ['ideas', 'projects', 'activities', 'assignments', 'sectors', 'reports', 'requests']) assert.equal(notificationDestination(`/${resource}/${id}`), `/${resource}/${id}`);
  assert.equal(notificationDestination('/reports'), '/reports');
  for (const link of ['https://example.com', '//evil.test', 'javascript:alert(1)', '/login', '/api/admin/users', '/ideas/../admin', '/ideas/' + id + '?redirect=external', null, '']) assert.equal(notificationDestination(link), null);
});
test('Notification icons distinguish leadership instructions from ordinary comments', () => {
  assert.equal(notificationIcon({type: 'comment', title: 'Nova instrukcija', link: '/ideas/id'}), 'flag');
  assert.equal(notificationIcon({type: 'comment', title: 'Novi komentar'}), 'message');
  assert.equal(notificationIcon({type: 'idea_status', link: '/ideas/id'}), 'bulb');
});

test('Standalone blocker notifications accept only the exact local report period, never redirects or impossible dates',()=>{
 const link='/reports?scope=sector&type=daily&day=2026-11-08';assert.equal(notificationDestination(link),link);
 for(const value of [link+'&redirect=https://example.test','//example.test'+link,link.replace('2026-11-08','2026-02-30'),link.replace('scope=sector','scope=company')])assert.equal(notificationDestination(value),null);
});
test('Relative notification timestamps handle minutes, hours, invalid and future dates', () => {
  const now = Date.parse('2026-11-08T12:00:00Z');
  assert.equal(notificationTime('2026-11-08T11:50:00Z', now), 'Pre 10 min');
  assert.equal(notificationTime('2026-11-08T10:00:00Z', now), 'Pre 2 h');
  assert.equal(notificationTime('2026-11-08T12:05:00Z', now), 'Upravo sada');
  assert.equal(notificationTime('invalid', now), '');
});
