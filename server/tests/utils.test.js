import test from 'node:test';
import assert from 'node:assert/strict';
import {periodRange,validDay,dateValue} from '../src/lib/utils.js';
import {averageProgress} from '../src/services/progress.js';
import {canReadProject,managing} from '../src/lib/access.js';

test('Weekly period starts Monday and ends Sunday',()=>{
 assert.deepEqual(periodRange('weekly','2026-11-07'),{start:'2026-11-02',end:'2026-11-08'});
});
test('Daily period uses exact day',()=>{
 assert.deepEqual(periodRange('daily','2026-11-07'),{start:'2026-11-07',end:'2026-11-07'});
});
test('Reject invalid dates',()=>{
 assert.equal(validDay('2026-02-30'),false);
 assert.equal(validDay('2026-02-28'),true);
});
test('Project progress is derived from activities',()=>{
 assert.equal(averageProgress([]),0);
 assert.equal(averageProgress([{progress:70},{progress:100},{progress:0}]),57);
});
test('Employee only sees assigned projects',()=>{
 const u={_id:'u1',role:'employee',sector:'s1'};
 assert.equal(canReadProject(u,{sector:'s1',members:['u1'],owner:'u2'}),true);
 assert.equal(canReadProject(u,{sector:'s1',members:['u2'],owner:'u2'}),false);
 assert.equal(managing(u,'s1'),false);
});
test('Manager writes own sector only',()=>{
 const u={_id:'u1',role:'manager',sector:'s1'};
 assert.equal(managing(u,'s1'),true);
 assert.equal(managing(u,'s2'),false);
});
