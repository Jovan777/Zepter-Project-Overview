import test from 'node:test';
import assert from 'node:assert/strict';
import {commentDate,commentFilters} from '../src/features/president/commentPresentation.js';
test('Comment dates use Belgrade calendar days around UTC midnight and daylight saving',()=>{
 const now=new Date('2026-11-09T00:15Z');assert.match(commentDate('2026-11-08T23:30Z',now),/^Danas, 00:30$/);assert.match(commentDate('2026-11-08T21:00Z',now),/^Juče, 22:00$/);
 assert.match(commentDate('2026-10-25T00:30Z',new Date('2026-10-25T14:00Z')),/^Danas, 02:30$/);assert.equal(commentDate('invalid'),null);assert.equal(commentDate(null),null);
});
test('Independent response/type filters preserve valid combinations and bound page inputs',()=>{
 assert.deepEqual(commentFilters(new URLSearchParams('status=answered&targetType=idea&page=2.8')),{status:'answered',targetType:'idea',page:2});
 assert.deepEqual(commentFilters(new URLSearchParams('status=garbage&targetType=constructor&page=-2')),{status:'all',targetType:'all',page:1});
 assert.equal(commentFilters(new URLSearchParams('page=Infinity')).page,10000);
});
