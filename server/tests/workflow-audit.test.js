import test from 'node:test';
import assert from 'node:assert/strict';
import projects from '../src/routes/projects.js';
import activities from '../src/routes/activities.js';
import worklogs from '../src/routes/worklogs.js';
import users from '../src/routes/users.js';
import sectors from '../src/routes/sectors.js';
import dashboard from '../src/routes/dashboard.js';
import requests from '../src/routes/requests.js';
import comments from '../src/routes/comments.js';
import {Project,Activity,WorkLog,User,Sector,Audit,Notification,Idea,Comment,DecisionRequest} from '../src/models/index.js';
import {safePage} from '../src/lib/utils.js';
import {canReadProject,managing} from '../src/lib/access.js';
import {updateProjectProgress} from '../src/services/progress.js';
import {withRoutes,query} from './helpers/http.mjs';
const self='11'.repeat(12),manager='22'.repeat(12),sector='33'.repeat(12),projectId='44'.repeat(12),activityId='55'.repeat(12),president='77'.repeat(12);
const account={_id:self,role:'employee',sector},boss={_id:manager,role:'manager',sector};
const routes=[['/projects',projects],['/activities',activities],['/worklogs',worklogs],['/users',users],['/sectors',sectors],['/dashboard',dashboard],['/requests',requests],['/comments',comments]];
const send=(base,path,body,method='POST')=>fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function fixture(t){
 const project={_id:projectId,sector,members:[self,manager],owner:manager,title:'Projekat',status:'active',progress:20,save:t.mock.fn(async()=>{})};
 const activity={_id:activityId,sector,project:projectId,assignees:[self],title:'Aktivnost',status:'in_progress',progress:20,save:t.mock.fn(async()=>{})};
 t.mock.method(Project,'findById',()=>query(project));t.mock.method(Activity,'findById',()=>query(activity));
 t.mock.method(Activity,'find',()=>query([activity]));t.mock.method(Project,'updateOne',async()=>({}));t.mock.method(Audit,'create',async()=>({}));
 t.mock.method(User,'find',filter=>query(filter.sector?[{_id:manager}]:filter._id?.$in?.map(_id=>({_id}))||[]));
 t.mock.method(Sector,'findById',()=>query({_id:sector,active:true,manager}));
 const created=t.mock.method(WorkLog,'create',async fields=>({_id:'66'.repeat(12),...fields}));
 const notifications=t.mock.method(Notification,'create',async fields=>fields);
 return {project,activity,created,notifications};
}
test('Missing sector rejects employee and manager scoped lists before all database queries',async t=>{
 for(const Model of [Project,Activity,WorkLog,User,Sector,Idea,DecisionRequest])t.mock.method(Model,'find',()=>{throw Error('Unscoped query');});
 for(const role of ['employee','manager'])await withRoutes({_id:self,role,sector:null},routes,async base=>{
  for(const path of ['/projects','/users','/sectors','/worklogs/team','/dashboard/overview','/requests'])assert.equal((await fetch(base+path)).status,403,path);
 });
});
test('An old project membership never crosses a transferred employee sector; missing sectors cannot grant manager rights',()=>{
 assert.equal(canReadProject({...account,sector:'aa'.repeat(12)},{sector,members:[self],owner:self}),false);
 assert.equal(managing({_id:manager,role:'manager'},undefined),false);
 assert.equal(canReadProject(boss,{sector,members:[]}),true);
 assert.equal(canReadProject({role:'president'},{sector,members:[]}),true);
});
test('Pagination always produces bounded integer skip and limit, including decimal and untrusted values',()=>{
 assert.deepEqual(safePage({page:'2.7',limit:'3.8'}),{page:2,limit:3,skip:3});
 assert.deepEqual(safePage({page:Infinity,limit:Infinity}),{page:10000,limit:50,skip:499950});
 assert.deepEqual(safePage({page:'bad',limit:-3}),{page:1,limit:1,skip:0});
});
test('Worklogs reject mismatched activity/project and progress without activity before writing',async t=>{
 const {activity,created}=fixture(t);
 await withRoutes(account,routes,async base=>{
  assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Urađeno',activityId,projectId:'aa'.repeat(12),updatedProgress:40})).status,422);
  assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Urađeno',updatedProgress:40})).status,422);
 });assert.equal(created.mock.callCount(),0);assert.equal(activity.save.mock.callCount(),0);
});
test('Standalone and project blockers generate working destinations and show the actual obstacle',async t=>{
 const {notifications}=fixture(t);
 await withRoutes(account,routes,async base=>{
  for(const [extra,link]of [[{},'/reports?scope=sector&type=daily&day=2026-11-08'],[{projectId},'/projects/'+projectId],[{activityId},'/activities/'+activityId]]){
   assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Rezultat',blockers:'Nedostaje materijal.',...extra})).status,201);
   const sent=notifications.mock.calls.at(-1).arguments[0];assert.equal(sent.link,link);assert.equal(sent.body,'Nedostaje materijal.');assert.equal(String(sent.user),manager);
  }
 });
});
test('Closed project cannot acquire unfinished work through activity patch or daily progress',async t=>{
 const {project,activity,created}=fixture(t);project.status='completed';activity.status='completed';activity.progress=100;
 await withRoutes(account,routes,async base=>{
  assert.equal((await send(base,'/activities/'+activityId,{status:'in_progress',progress:30},'PATCH')).status,409);
  activity.status='completed';activity.progress=100;
  assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Opis',activityId,updatedProgress:30})).status,409);
  assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Istorijski opis',activityId})).status,201);
 });assert.equal(activity.save.mock.callCount(),0);assert.equal(created.mock.callCount(),1);
});
test('Project date inversion rejects create and update; valid date changes remain supported',async t=>{
 const {project}=fixture(t);const create=t.mock.method(Project,'create',async()=>{throw Error('Invalid create');});
 await withRoutes(boss,routes,async base=>{
  assert.equal((await send(base,'/projects',{sectorId:sector,title:'Novi',startDate:'2026-12-20',dueDate:'2026-12-01'})).status,422);
  project.startDate=new Date('2026-12-10T12:00:00Z');project.dueDate=new Date('2026-12-20T12:00:00Z');
  assert.equal((await send(base,'/projects/'+projectId,{dueDate:'2026-12-01'},'PATCH')).status,422);
  assert.equal((await send(base,'/projects/'+projectId,{dueDate:'2026-12-30'},'PATCH')).status,200);
 });assert.equal(create.mock.callCount(),0);assert.equal(project.save.mock.callCount(),1);
});

test('Closed work may retain its unchanged status/progress when recording history or clarifying the work description',async t=>{
 const {project,activity,created}=fixture(t);project.status='completed';activity.status='completed';activity.progress=100;
 await withRoutes(account,routes,async base=>{
  assert.equal((await send(base,'/worklogs',{day:'2026-11-08',done:'Istorijski opis',activityId,updatedProgress:100})).status,201);
  assert.equal(activity.save.mock.callCount(),0);
  assert.equal((await send(base,'/activities/'+activityId,{status:'completed',progress:100,actualWork:'Preciziran opis završenog posla.'},'PATCH')).status,200);
 });assert.equal(created.mock.callCount(),1);assert.equal(activity.save.mock.callCount(),1);
});
test('Activity created at 100 percent goes to review until explicitly completed',async t=>{
 fixture(t);const create=t.mock.method(Activity,'create',async fields=>({_id:activityId,...fields}));
 await withRoutes(boss,routes,async base=>{
  const response=await send(base,'/activities/project/'+projectId,{title:'Pregled',progress:100,status:'in_progress'});
  assert.equal(response.status,201);assert.equal((await response.json()).activity.status,'review');
 });assert.equal(create.mock.callCount(),1);
});
test('An unforwarded idea cannot notify the president via an explicitly addressed comment',async t=>{
 fixture(t);const idea={_id:activityId,sector,author:self,status:'submitted'};
 t.mock.method(Idea,'findById',()=>query(idea));const create=t.mock.method(Comment,'create',async()=>{throw Error('No comment');});
 await withRoutes(account,routes,async base=>assert.equal((await send(base,'/comments',{targetType:'idea',targetId:activityId,body:'Privatna dopuna',addressedTo:[president]})).status,403));
 assert.equal(create.mock.callCount(),0);assert.equal(Notification.create.mock.callCount(),0);
});

test('A reply on an unforwarded idea also withholds its notification from the president',async t=>{
 fixture(t);t.mock.method(Idea,'findById',()=>query({_id:activityId,sector,author:self,status:'revision_requested'}));
 t.mock.method(User,'find',filter=>query(filter.role==='president'?[{_id:president}]:filter.sector?[{_id:manager}]:filter._id?.$in.map(_id=>({_id}))||[]));
 t.mock.method(Comment,'findById',()=>query({_id:'aa'.repeat(12),author:president,targetType:'idea',targetId:activityId,responseStatus:'answered'}));
 t.mock.method(Comment,'create',async fields=>({_id:'bb'.repeat(12),...fields}));
 await withRoutes(account,routes,async base=>assert.equal((await send(base,'/comments',{targetType:'idea',targetId:activityId,body:'Privatna dopuna',parentId:'aa'.repeat(12)})).status,201));
 assert.ok(Notification.create.mock.callCount()>0);assert.ok(Notification.create.mock.calls.every(call=>String(call.arguments[0].user)!==president));
});

test('Forwarded idea comments still reach an explicitly addressed president',async t=>{
 fixture(t);t.mock.method(Idea,'findById',()=>query({_id:activityId,sector,author:self,status:'forwarded'}));
 t.mock.method(User,'find',filter=>query(filter.role==='president'?[{_id:president}]:filter.sector?[{_id:manager}]:filter._id?.$in.map(_id=>({_id}))||[]));
 t.mock.method(Comment,'create',async fields=>({_id:'bb'.repeat(12),...fields}));
 await withRoutes(account,routes,async base=>assert.equal((await send(base,'/comments',{targetType:'idea',targetId:activityId,body:'Odgovor predsedniku',addressedTo:[president]})).status,201));
 assert.ok(Notification.create.mock.calls.some(call=>String(call.arguments[0].user)===president));
});

test('Concurrent activity changes recalculate a project in order and cannot restore an old average',async t=>{
 let release,reads=0;const gate=new Promise(resolve=>{release=resolve;}),saved=[];
 t.mock.method(Activity,'find',()=>({select:()=>++reads===1?gate:Promise.resolve([{progress:90}])}));
 t.mock.method(Project,'updateOne',async(_filter,patch)=>{saved.push(patch.$set.progress);});
 const first=updateProjectProgress(projectId);await new Promise(resolve=>setImmediate(resolve));
 const second=updateProjectProgress(projectId);await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,1);
 release([{progress:20}]);assert.deepEqual(await Promise.all([first,second]),[20,90]);assert.deepEqual(saved,[20,90]);
});
test('A failed progress calculation releases its queue and the next calculation still succeeds',async t=>{
 let reads=0;t.mock.method(Activity,'find',()=>({select:async()=>{if(++reads===1)throw Error('Transient read failure');return [{progress:80}];}}));
 t.mock.method(Project,'updateOne',async()=>({}));
 const first=updateProjectProgress(projectId),second=updateProjectProgress(projectId);
 await assert.rejects(first,/Transient/);assert.equal(await second,80);assert.equal(await updateProjectProgress(projectId),80);
});
