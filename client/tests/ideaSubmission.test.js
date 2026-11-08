import test from 'node:test';
import assert from 'node:assert/strict';
import {sendIdea} from '../src/features/employee/ideaSubmission.js';

test('Attachment retry reuses the created idea and skips successful files', async () => {
  const session = {ideaId: null, uploaded: new Set()}, calls = [], states = [];
  const files = ['one.png', 'two.png'].map((name, id) => ({id, file: new File(['png'], name, {type: 'image/png'})}));
  let fail = true;
  const request = async (url, options) => {
    calls.push({url, options});
    if (url === '/ideas') return {idea: {_id: 'created'}};
    if (options.body.get('file').name === 'two.png' && fail) throw Error('Upload failed');
    return {};
  };
  const args = {request, draft: {title: ' Title ', description: ' Description ', benefit: ' '}, files, onFile: (id, value) => states.push({id, ...value})};
  assert.deepEqual(await sendIdea(session, args), {ideaId: 'created', failures: [1]});
  fail = false;
  assert.deepEqual(await sendIdea(session, args), {ideaId: 'created', failures: []});
  assert.equal(calls.filter(call => call.url === '/ideas').length, 1);
  assert.deepEqual(calls[0].options.body, {title: 'Title', description: 'Description', benefit: ''});
  assert.equal(calls.filter(call => call.options.body instanceof FormData && call.options.body.get('file').name === 'one.png').length, 1);
  assert.equal(states.at(-1).status, 'done');
});
test('Failed creation never uploads files or records a created ID', async () => {
  const session = {ideaId: null, uploaded: new Set()}; let calls = 0;
  await assert.rejects(sendIdea(session, {request: async url => {calls++; assert.equal(url, '/ideas'); throw Error('Validation');}, draft: {title: 'A', description: 'B', benefit: ''}, files: [{id: 1, file: new File(['x'], 'x.png')}] }), /Validation/);
  assert.equal(calls, 1); assert.equal(session.ideaId, null);
});
