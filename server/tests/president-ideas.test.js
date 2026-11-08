import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import ideas from '../src/routes/ideas.js';
import {Idea,Comment,Notification,Audit,User,IdeaRead} from '../src/models/index.js';
import {deliverPendingIdeaDecisions} from '../src/services/idea-decisions.js';
import {withRoutes,query} from './helpers/http.mjs';
const id='11'.repeat(12),sector='33'.repeat(12),manager='22'.repeat(12),author='44'.repeat(12),president='77'.repeat(12),otherManager='88'.repeat(12);
const account={_id:president,role:'president',approval:'approved'};
function fixture(t){
 const state={idea:{_id:id,title:'Test predlog',status:'forwarded',sector,author,reviewedBy:manager,updatedAt:new Date('2026-11-08T12:00:00Z')},commentFails:false};
 const stores={Comment:new Map(),Notification:new Map(),Audit:new Map()},users=[{_id:manager,sector,role:'manager',approval:'approved'},{_id:otherManager,sector,role:'manager',approval:'approved'},{_id:author,sector,role:'employee',approval:'approved'}];
 const copy=()=>state.idea?{...state.idea,decision:state.idea.decision?{...state.idea.decision}:undefined,toJSON(){const value={...this};delete value.toJSON;delete value.decisionDelivery;return value;}}:null;
 const matches=(row,filter)=>Object.entries(filter).every(([key,value])=>{const actual=key.split('.').reduce((v,k)=>v?.[k],row);return value?.$in?value.$in.map(String).includes(String(actual)):String(actual)===String(value);});
 t.mock.method(Idea,'findById',key=>query(String(key)===id?copy():null));
 t.mock.method(Idea,'findOneAndUpdate',(filter,patch)=>{if(!matches(state.idea,filter))return query(null);Object.assign(state.idea,patch.$set);state.idea.updatedAt=new Date(state.idea.updatedAt.getTime()+1);return query(copy());});
 t.mock.method(Idea,'updateOne',async(filter,patch)=>{if(matches(state.idea,filter)&&patch.$set?.['decision.deliveryStatus'])state.idea.decision.deliveryStatus=patch.$set['decision.deliveryStatus'];return {modifiedCount:1};});
 t.mock.method(Idea,'find',()=>query(state.idea?.decision?.deliveryStatus==='pending'?[copy()]:[]));
 t.mock.method(User,'find',filter=>query(users.filter(row=>matches(row,filter))));
 for(const [name,Model]of Object.entries({Comment,Notification,Audit})){
  const store=stores[name];
  t.mock.method(Model,'updateOne',async(filter,patch)=>{
   if(name==='Comment'&&state.commentFails){state.commentFails=false;throw Error('Synthetic delivery outage');}
   const key=String(filter._id);if(store.has(key))return {upsertedCount:0};
   store.set(key,{_id:key,...patch.$setOnInsert});return {upsertedCount:1};
  });
  t.mock.method(Model,'exists',async filter=>store.has(String(filter._id))?{_id:filter._id}:null);
  t.mock.method(Model,'findById',key=>query(store.get(String(key))));
 }
 return {state,stores,stamp:()=>'"'+state.idea.updatedAt.toISOString()+'"'};
}
async function post(base,path,body,stamp){
 const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(stamp?{'If-Match':stamp}:{})},body:JSON.stringify(body)});
 return {status:response.status,body:await response.json()};
}
test('Approval requires actual next steps, a version and an untampered request before mutating the idea',async t=>{
 const f=fixture(t);
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  for(const comment of ['', '  '])assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'approve',comment,requestId:randomUUID()},f.stamp())).status,422);
  assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Plan',requestId:randomUUID()})).status,428);
  assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Plan',requestId:randomUUID()},'"stale"')).status,409);
  assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Plan',requestId:randomUUID(),by:manager},f.stamp())).status,422);
 });assert.equal(f.state.idea.status,'forwarded');assert.equal(f.stores.Comment.size,0);
});
test('Only the president can decide or retry delivery, including from another sector or a privileged admin role',async t=>{
 const f=fixture(t);
 for(const role of ['employee','manager','admin'])await withRoutes({...account,role},[['/ideas',ideas]],async base=>{
  assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'reject',requestId:randomUUID()},f.stamp())).status,403);
  assert.equal((await post(base,'/ideas/'+id+'/decision/deliver',{})).status,403);
 });
 f.state.idea.status='submitted';
 await withRoutes(account,[['/ideas',ideas]],async base=>assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'reject',requestId:randomUUID()},f.stamp())).status,403));
 assert.equal(f.stores.Comment.size,0);
});
test('Approval creates one instruction for the forwarding manager, one decision and private delivery metadata',async t=>{
 const f=fixture(t),comment='Pripremite plan sa rokovima i odgovornim osobama.';
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const result=await post(base,'/ideas/'+id+'/decision',{action:'approve',comment,requestId:randomUUID()},f.stamp());
  assert.equal(result.status,200);assert.equal(result.body.idea.status,'approved');assert.equal(result.body.idea.decision.note,comment);assert.equal(result.body.idea.decision.deliveryStatus,'complete');
  assert.equal(Object.hasOwn(result.body.idea,'decisionDelivery'),false);
 });
 const instruction=[...f.stores.Comment.values()][0];assert.equal(instruction.kind,'instruction');assert.equal(instruction.body,comment);assert.deepEqual(instruction.addressedTo,[manager]);
 assert.equal(f.stores.Notification.size,2);assert.equal([...f.stores.Notification.values()].filter(n=>n.user===manager&&n.type==='instruction').length,1);
 assert.equal([...f.stores.Notification.values()].some(n=>n.user===otherManager),false);assert.equal(f.stores.Audit.size,1);
});
test('Rejection is terminal without an extra required comment',async t=>{
 const f=fixture(t);
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const result=await post(base,'/ideas/'+id+'/decision',{action:'reject',requestId:randomUUID()},f.stamp());assert.equal(result.status,200);assert.equal(result.body.idea.status,'rejected');
  assert.equal((await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Promena',requestId:randomUUID()},f.stamp())).status,409);
 });assert.equal(f.stores.Comment.size,0);
});
test('Identical concurrent requests and explicit delivery retries cannot duplicate comments, notifications or audit',async t=>{
 const f=fixture(t),body={action:'approve',comment:'Sledeći koraci.',requestId:randomUUID()},stamp=f.stamp();
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const replies=await Promise.all([post(base,'/ideas/'+id+'/decision',body,stamp),post(base,'/ideas/'+id+'/decision',body,stamp)]);
  assert.deepEqual(replies.map(r=>r.status),[200,200]);
  assert.equal((await post(base,'/ideas/'+id+'/decision/deliver',{})).status,200);
 });assert.equal(f.stores.Comment.size,1);assert.equal(f.stores.Notification.size,2);assert.equal(f.stores.Audit.size,1);
});
test('Two distinct concurrent decisions yield one winner without an orphan instruction from the loser',async t=>{
 const f=fixture(t),stamp=f.stamp();
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const replies=await Promise.all(['Prvi plan.','Drugi plan.'].map(comment=>post(base,'/ideas/'+id+'/decision',{action:'approve',comment,requestId:randomUUID()},stamp)));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,409]);
 });assert.equal(f.stores.Comment.size,1);assert.equal([...f.stores.Comment.values()][0].body,f.state.idea.decision.note);
});
test('A failed comment delivery leaves a durable decision and the recovery worker finishes it once after the client is gone',async t=>{
 const f=fixture(t);f.state.commentFails=true;
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const result=await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Sačuvani naredni koraci.',requestId:randomUUID()},f.stamp());
  assert.equal(result.status,202);assert.equal(result.body.idea.status,'approved');assert.equal(result.body.idea.decision.deliveryStatus,'pending');assert.equal(result.body.idea.decision.note,'Sačuvani naredni koraci.');
 });assert.equal(f.stores.Comment.size,0);
 await deliverPendingIdeaDecisions();await deliverPendingIdeaDecisions();
 assert.equal(f.state.idea.decision.deliveryStatus,'complete');assert.equal(f.stores.Comment.size,1);assert.equal(f.stores.Notification.size,2);assert.equal(f.stores.Audit.size,1);
});
test('Personal read markers reject all other roles before any read-state query',async t=>{
 const read=t.mock.method(IdeaRead,'distinct',()=>{throw Error('Unscoped query');});
 for(const role of ['employee','manager','admin'])await withRoutes({...account,role},[['/ideas',ideas]],async base=>{
  assert.equal((await fetch(base+'/ideas/president')).status,403);
  assert.equal((await post(base,'/ideas/'+id+'/read',{})).status,403);
 });assert.equal(read.mock.callCount(),0);
});
test('Approval cannot report successful delivery when the sector has no active manager',async t=>{
 const f=fixture(t);t.mock.method(User,'find',filter=>query(filter.role==='manager'?[]:[{_id:author}]));
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  const result=await post(base,'/ideas/'+id+'/decision',{action:'approve',comment:'Naredni koraci se čuvaju do isporuke.',requestId:randomUUID()},f.stamp());
  assert.equal(result.status,202);assert.equal(result.body.idea.decision.deliveryStatus,'pending');
 });assert.equal(f.stores.Comment.size,0);assert.equal(f.state.idea.status,'approved');
});
test('President feed ignores forged read-state ownership and keeps the current actor in both queries',async t=>{
 const reads=t.mock.method(IdeaRead,'distinct',async()=>[]);
 const comments=t.mock.method(Comment,'distinct',async()=>[]);
 t.mock.method(Idea,'find',()=>query([]));t.mock.method(Idea,'countDocuments',async()=>0);
 await withRoutes(account,[['/ideas',ideas]],async base=>{
  assert.equal((await fetch(base+'/ideas/president?tab=new&userId='+manager+'&authorId='+manager)).status,200);
 });assert.deepEqual(reads.mock.calls[0].arguments[1],{user:president});
 assert.deepEqual(comments.mock.calls[0].arguments[1],{targetType:'idea',author:president});
});
