import test from 'node:test';
import assert from 'node:assert/strict';
import {projectStatus, belgradeDate, deadlineLabel, countLabel} from '../src/features/employee/presentation.js';
import {activityDraft, changeActivityDraft, sameActivityDraft, validateAttachment} from '../src/features/employee/activityForm.js';

test('Review badge refers to the current employee activities and preserves risk/terminal states', () => {
  assert.equal(projectStatus({status: 'active', myActivities: [{status: 'review'}]}).label, 'Na proveri');
  assert.equal(projectStatus({status: 'active', myActivities: []}).label, 'U toku');
  assert.equal(projectStatus({status: 'at_risk', myActivities: [{status: 'review'}]}).label, 'Rok ugrožen');
  assert.equal(projectStatus({status: 'completed', myActivities: [{status: 'review'}]}).label, 'Završeno');
});
test('Deadlines use Belgrade calendar day across midnight and daylight saving time', () => {
  assert.equal(belgradeDate('2026-11-07T23:30:00Z'), '2026-11-08');
  assert.equal(belgradeDate('2026-07-07T22:30:00Z'), '2026-07-08');
  assert.equal(deadlineLabel({dueDate: '2026-11-07T23:30:00Z'}, '2026-11-08').label, 'Danas');
  assert.equal(deadlineLabel({dueDate: '2026-11-07T12:00:00Z'}, '2026-11-08').label, 'Rok prošao');
});
test('Serbian counts handle teens and numbers ending in 1–4', () => {
  const label = n => countLabel(n, 'nova poruka', 'nove poruke', 'novih poruka');
  for (const n of [1, 21, 101]) assert.equal(label(n), 'nova poruka');
  for (const n of [2, 3, 4, 22, 104]) assert.equal(label(n), 'nove poruke');
  for (const n of [0, 5, 11, 12, 13, 14, 111, 114]) assert.equal(label(n), 'novih poruka');
});
test('Activity controls agree with backend completion and review rules', () => {
  const initial = activityDraft({status: 'in_progress', progress: 70});
  assert.equal(changeActivityDraft(initial, 'status', 'completed').progress, 100);
  assert.equal(changeActivityDraft(initial, 'progress', 100).status, 'review');
  assert.equal(changeActivityDraft({status: 'completed', progress: 100}, 'progress', 60).status, 'in_progress');
  assert.equal(sameActivityDraft(initial, {...initial}), true);
  assert.equal(sameActivityDraft(initial, {...initial, actualWork: 'Promena'}), false);
});
test('Attachment selection follows server formats and limits, including double extensions', () => {
  const config = {maxBytes: 2000, extensions: ['.pdf', '.png', '.docx']};
  assert.equal(validateAttachment({name: 'DOKUMENT.PDF', size: 2000}, config), '');
  assert.ok(validateAttachment({name: 'slika.png.exe', size: 1}, config));
  assert.ok(validateAttachment({name: 'dizajn.fig', size: 1}, config));
  assert.ok(validateAttachment({name: 'slika.png', size: 2001}, config));
  assert.ok(validateAttachment({name: 'slika.png', size: 0}, config));
});
