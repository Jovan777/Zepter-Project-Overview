import test from 'node:test';
import assert from 'node:assert/strict';
import comments from '../src/routes/comments.js';
import {Comment,Project} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';
const target='44'.repeat(12),focus='55'.repeat(12),president={_id:'77'.repeat(12),role:'president'};
test('A conversation deep link computes the focused page within its authorized target with stable timestamp ties',async t=>{
 t.mock.method(Project,'findById',async()=>({_id:target,sector:'33'.repeat(12),members:[]}));
 const date=new Date('2026-11-08T12:00Z');let offset,order;
 t.mock.method(Comment,'findOne',filter=>{assert.equal(filter.targetType,'project');assert.equal(filter.targetId,target);assert.equal(filter._id,focus);return query({_id:focus,createdAt:date});});
 t.mock.method(Comment,'countDocuments',async filter=>{assert.equal(filter.targetId,target);if(filter.$or){assert.deepEqual(filter.$or,[{createdAt:{$lt:date}},{createdAt:date,_id:{$lt:focus}}]);return 25;}return 45;});
 t.mock.method(Comment,'find',()=>{const q=query([{_id:focus,body:'Focused instruction'}]);q.skip=value=>{offset=value;return q;};q.sort=value=>{order=value;return q;};return q;});
 await withRoutes(president,[['/comments',comments]],async base=>{const response=await fetch(base+'/comments?targetType=project&targetId='+target+'&focus='+focus+'&limit=20');const data=await response.json();assert.equal(response.status,200);assert.equal(data.page,2);assert.equal(data.focusId,focus);assert.equal(offset,20);assert.deepEqual(order,{createdAt:1,_id:1});assert.equal(data.total,45);});
});
test('A comment ID from a different conversation cannot disclose or influence page calculations',async t=>{
 t.mock.method(Project,'findById',async()=>({_id:target,sector:'33'.repeat(12),members:[]}));
 t.mock.method(Comment,'findOne',filter=>{assert.equal(filter.targetId,target);return query(null);});
 const count=t.mock.method(Comment,'countDocuments',async()=>{throw Error('No foreign conversation count');});
 await withRoutes(president,[['/comments',comments]],async base=>{assert.equal((await fetch(base+'/comments?targetType=project&targetId='+target+'&focus='+focus)).status,404);});assert.equal(count.mock.callCount(),0);
});
