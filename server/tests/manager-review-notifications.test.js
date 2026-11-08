import test from 'node:test';
import assert from 'node:assert/strict';
import ideas from '../src/routes/ideas.js';
import notifications from '../src/routes/notifications.js';
import {Idea,User,Notification,Audit} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';
const self='111111111111111111111111',author='222222222222222222222222',sector='333333333333333333333333',id='444444444444444444444444',foreign='555555555555555555555555';
const user={_id:self,role:'manager',sector},routes=[['/ideas',ideas],['/notifications',notifications]],stamp=new Date('2026-11-08T12:00:00Z');
const post=(base,action,note='',headers={})=>fetch(base+'/ideas/'+id+'/review',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({action,note})});
function fixture(t){
 const idea={_id:id,author,sector,status:'submitted',title:'Predlog',description:'Opis',updatedAt:stamp};
 t.mock.method(Idea,'findById',()=>query(idea));t.mock.method(Audit,'create',async()=>({}));
 t.mock.method(User,'find',filter=>query(filter.role==='president'?[{_id:foreign}]:[{_id:author},{_id:foreign}].filter(row=>filter._id?.$in?.includes(row._id))));
 t.mock.method(Notification,'create',async()=>({}));return idea;
}
test('Only manager of the idea sector may decide; other roles and missing sector reject before lookup',async t=>{
 const idea=fixture(t),update=t.mock.method(Idea,'findOneAndUpdate',()=>{throw Error('No write');});
 for(const account of [{...user,role:'employee'},{...user,role:'president'},{...user,role:'admin'},{...user,sector:null}])await withRoutes(account,routes,async base=>assert.equal((await post(base,'forward')).status,403));
 assert.equal(Idea.findById.mock.callCount(),0);idea.sector=foreign;
 await withRoutes(user,routes,async base=>assert.equal((await post(base,'forward')).status,403));assert.equal(update.mock.callCount(),0);
});
test('Revision requires an explanation and stale versions cannot write or notify',async t=>{
 fixture(t);const update=t.mock.method(Idea,'findOneAndUpdate',()=>{throw Error('No write');});
 await withRoutes(user,routes,async base=>{
  assert.equal((await post(base,'request_revision','  ')).status,422);
  assert.equal((await post(base,'forward','',{'If-Match':'"old"'})).status,409);
  assert.equal((await post(base,'bad')).status,422);
 });assert.equal(update.mock.callCount(),0);assert.equal(Notification.create.mock.callCount(),0);
});
test('Revision is one atomic versioned transition and the author receives the outcome',async t=>{
 const idea=fixture(t);t.mock.method(Idea,'findOneAndUpdate',async(filter,patch)=>{
  assert.deepEqual(filter,{_id:id,sector,status:{$in:['submitted','in_review']},updatedAt:stamp});Object.assign(idea,patch.$set);return idea;
 });
 await withRoutes(user,routes,async base=>{
  const response=await post(base,'request_revision','Dopunite rokove.',{'If-Match':'"'+stamp.toISOString()+'"'});assert.equal(response.status,200);
  assert.equal((await response.json()).idea.reviewNote,'Dopunite rokove.');assert.equal(idea.status,'revision_requested');
  assert.equal((await post(base,'forward')).status,409);
 });assert.equal(Audit.create.mock.callCount(),1);assert.equal(Notification.create.mock.calls[0].arguments[0].type,'idea_status');
});
test('Forward is atomic for legacy callers too; competing or repeated decisions do not notify twice',async t=>{
 const idea=fixture(t);let available=true;
 t.mock.method(Idea,'findOneAndUpdate',async(filter,patch)=>{
  assert.deepEqual(filter,{_id:id,sector,status:{$in:['submitted','in_review']}});
  if(!available)return null;available=false;return {...idea,...patch.$set};
 });
 await withRoutes(user,routes,async base=>{
  const first=await post(base,'forward','Za razmatranje.');assert.equal(first.status,200);const body=await first.json();assert.equal(body.idea.status,'forwarded');assert.ok(body.idea.forwardedAt);
  assert.equal((await post(base,'request_revision','Druga odluka.')).status,409);
 });assert.equal(Audit.create.mock.callCount(),1);assert.equal(Notification.create.mock.calls.filter(call=>call.arguments[0].type==='idea_forwarded').length,1);
});
test('Manager notification categories use real actor roles, remain recipient-scoped and paginate groups',async t=>{
 const calls=[];t.mock.method(User,'find',filter=>{assert.ok(['president','employee'].includes(filter.role));return query([{_id:author}]);});
 t.mock.method(Notification,'countDocuments',async filter=>{assert.equal(filter.user,self);return filter.readAt===null?2:4;});
 t.mock.method(Notification,'find',filter=>{calls.push(filter);return query([{_id:id,type:'comment',actor:{_id:author,role:'president'}}]);});
 await withRoutes(user,routes,async base=>{
  for(const category of ['all','president','employees','projects','ideas']){
   const response=await fetch(base+'/notifications?view=manager&grouped=true&page=1&limit=3&category='+category+'&user='+foreign);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
   const body=await response.json();assert.equal(body.unread,2);assert.equal(body.filteredUnread,2);
  }
 });
 for(const filter of calls)assert.equal(filter.user,self);
 assert.ok(calls.some(filter=>filter.actor?.$in[0]===author&&filter.type.$in.includes('comment')));
 assert.ok(calls.some(filter=>filter.link?.test('/activities/'+id)&&filter.type?.$nin.includes('comment')));
});
test('Manager notification view rejects other roles and unknown categories before querying',async t=>{
 const find=t.mock.method(Notification,'find',()=>{throw Error('No query');}),people=t.mock.method(User,'find',()=>{throw Error('No query');});
 for(const account of [{...user,role:'employee'},{...user,role:'president'},{...user,role:'admin'},{...user,sector:null}])await withRoutes(account,routes,async base=>assert.equal((await fetch(base+'/notifications?view=manager')).status,403));
 await withRoutes(user,routes,async base=>assert.equal((await fetch(base+'/notifications?view=manager&category=__proto__')).status,422));
 assert.equal(find.mock.callCount(),0);assert.equal(people.mock.callCount(),0);
});
