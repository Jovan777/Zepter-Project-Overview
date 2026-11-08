import test from 'node:test';
import assert from 'node:assert/strict';
import dashboard from '../src/routes/dashboard.js';
import projects from '../src/routes/projects.js';
import comments from '../src/routes/comments.js';
import {managerProjects, managerOverview, managerDayStart} from '../src/services/manager.js';
import {Project, Activity, Sector, Idea, User, Attachment, Comment, Notification, Audit} from '../src/models/index.js';
import {withRoutes, query} from './helpers/http.mjs';

const self='111111111111111111111111', sector='333333333333333333333333', projectId='444444444444444444444444', president='777777777777777777777777';
const user={_id:self,role:'manager',sector};
const now=new Date('2026-11-08T09:00:00Z');
function empty(t) {
  t.mock.method(Sector,'findById',()=>query({_id:sector,name:'IT'}));
  for(const Model of [Project,Activity,Idea])t.mock.method(Model,'distinct',async()=>[]);
  for(const Model of [Project,Activity,Idea,Comment,Attachment,User])t.mock.method(Model,'find',()=>query([]));
  for(const Model of [Project,Activity,Idea,Comment,Notification])t.mock.method(Model,'countDocuments',async()=>0);
  t.mock.method(Comment,'findOne',()=>query(null));
}
test('Manager endpoints reject other roles and missing sector before any database access', async t=>{
  const find=t.mock.method(Sector,'findById',()=>{throw Error('Must reject first');});
  for(const account of [{...user,role:'employee'},{...user,role:'president'},{...user,role:'admin'},{...user,sector:null}]) {
    await withRoutes(account,[['/dashboard',dashboard],['/projects',projects]],async base=>{
      assert.equal((await fetch(base+'/dashboard/manager')).status,403);
      assert.equal((await fetch(base+'/projects/sector')).status,403);
    });
  }
  assert.equal(find.mock.callCount(),0);
});
test('Empty manager sector returns zero counters and safe empty sections; names come from sector',async t=>{
  empty(t);
  const overview=await managerOverview(user,{},now), list=await managerProjects(user,{},now);
  assert.equal(overview.sector.name,'IT');assert.equal(overview.stats.totalProjects,0);assert.equal(overview.stats.delayedActivities,0);
  assert.deepEqual(overview.attentionProjects,[]);assert.deepEqual(overview.ideas,[]);assert.equal(overview.sectorComment,null);
  assert.deepEqual(list.items,[]);assert.equal(list.stats.atRiskProjects,0);
});
test('Project feed enforces sector, escapes literal search, paginates and preserves global status counters',async t=>{
  empty(t);
  const find=t.mock.method(Project,'find',()=>query([{_id:projectId,title:'Own',sector,status:'active',dueDate:new Date('2026-11-15'),owner:{firstName:'Test',lastName:'Manager'},members:[self]}]));
  const count=t.mock.method(Project,'countDocuments',async filter=>filter.status==='active'?3:filter.status==='at_risk'?1:filter.status==='on_hold'?1:0);
  t.mock.method(Activity,'find',()=>query([{project:projectId,status:'review'},{project:projectId,status:'in_progress',dueDate:new Date('2026-11-07')} ]));
  t.mock.method(Attachment,'find',()=>query([{_id:'image',targetId:projectId}]));
  const result=await managerProjects(user,{q:'.*',page:2.7,limit:3.4,sectorId:'foreign',userId:'other'},now);
  const filter=find.mock.calls[0].arguments[0];
  assert.equal(filter.sector,sector);assert.equal(filter.archived,false);assert.equal(filter.title.$regex,'\\.\\*');
  assert.equal(result.page,2);assert.equal(result.limit,3);
  assert.equal(result.stats.activeProjects,5);assert.equal(result.stats.atRiskProjects,1);
  assert.ok(count.mock.calls.every(call=>call.arguments[0].sector===sector));
  assert.equal(result.items[0].memberCount,1);assert.equal(result.items[0].hasReview,true);assert.equal(result.items[0].delayedActivities,1);assert.equal(result.items[0].onTrack,false);assert.equal(result.items[0].thumbnailId,'image');
});
test('Review filter uses all sector activities, and on-track excludes overdue/blocked work and terminal projects',async t=>{
  empty(t);t.mock.method(Project,'distinct',async()=>[projectId]);
  const activity=t.mock.method(Activity,'distinct',async()=>[projectId]);
  const find=t.mock.method(Project,'find',()=>query([]));
  await managerProjects(user,{tab:'review'},now);
  assert.deepEqual(find.mock.calls[0].arguments[0]._id,{$in:[projectId]});
  assert.equal(activity.mock.calls[0].arguments[1].sector,sector);
  assert.equal(activity.mock.calls[0].arguments[1].status,'review');
  await managerProjects(user,{tab:'on_track'},now);
  const filter=find.mock.calls[1].arguments[0];assert.equal(filter.status,'active');assert.deepEqual(filter._id,{$nin:[projectId]});
  assert.equal(filter.$or[1].dueDate.$gte.toISOString(),'2026-11-07T23:00:00.000Z');
  assert.deepEqual(activity.mock.calls[1].arguments[1].status,{$ne:'completed'});
  await assert.rejects(managerProjects(user,{tab:'invalid'},now));await assert.rejects(managerProjects(user,{sort:'invalid'},now));await assert.rejects(managerProjects(user,{q:{$ne:''}},now));
});
test('Overdue boundary is Belgrade midnight across UTC day boundaries and DST transitions',()=>{
 assert.equal(managerDayStart(new Date('2026-11-07T23:30:00Z')).toISOString(),'2026-11-07T23:00:00.000Z');
 assert.equal(managerDayStart(new Date('2026-07-07T22:30:00Z')).toISOString(),'2026-07-07T22:00:00.000Z');
 assert.equal(managerDayStart(new Date('2026-03-29T12:00:00Z')).toISOString(),'2026-03-28T23:00:00.000Z');
 assert.equal(managerDayStart(new Date('2026-10-25T12:00:00Z')).toISOString(),'2026-10-24T22:00:00.000Z');
});
test('Overview excludes closed/archived projects from late work and scopes president content and unread counters',async t=>{
  empty(t);
  const pDistinct=t.mock.method(Project,'distinct',async()=>[projectId]);
  const aDistinct=t.mock.method(Activity,'distinct',async field=>field==='_id'?['555555555555555555555555']:[projectId]);
  t.mock.method(Idea,'distinct',async()=>['bbbbbbbbbbbbbbbbbbbbbbbb']);
  t.mock.method(User,'find',()=>query([{_id:president}]));
  const comment=t.mock.method(Comment,'find',()=>query([{_id:'comment',targetType:'project',targetId:projectId,body:'Review',author:{_id:president,role:'president'}}]));
  const note=t.mock.method(Comment,'findOne',()=>query({_id:'note',targetType:'sector',targetId:sector}));
  const unread=t.mock.method(Notification,'countDocuments',async()=>2);
  const count=t.mock.method(Activity,'countDocuments',async()=>3);
  const result=await managerOverview(user,{sectorId:'foreign',userId:'other'},now);
  assert.equal(result.stats.delayedActivities,3);assert.equal(result.stats.unreadPresidentComments,2);
  assert.ok(pDistinct.mock.calls.some(call=>call.arguments[1].status?.$in?.includes('active')));
  assert.deepEqual(count.mock.calls[0].arguments[0].project,{$in:[projectId]});assert.equal(count.mock.calls[0].arguments[0].sector,sector);
  assert.ok(aDistinct.mock.calls.every(call=>call.arguments[1].sector===sector));
  const targets=comment.mock.calls[0].arguments[0].$or;assert.deepEqual(targets[0],{targetType:'sector',targetId:sector});
  assert.deepEqual(note.mock.calls[0].arguments[0].author,{$in:[president]});
  assert.equal(unread.mock.calls[0].arguments[0].user,self);assert.equal(unread.mock.calls[0].arguments[0].readAt,null);
  assert.ok(unread.mock.calls[0].arguments[0].link.$in.includes('/projects/'+projectId));
  assert.equal(result.presidentComments.items[0].link,'/projects/'+projectId);
});
test('Manager reply to own sector president comment stays contextual and marks instruction answered',async t=>{
  const parentId='999999999999999999999999';
  t.mock.method(Sector,'findById',async()=>({_id:sector}));
  const parent={_id:parentId,author:president,targetType:'sector',targetId:sector,responseStatus:'open',save:async()=>{}};
  t.mock.method(Comment,'findById',async()=>parent);
  const create=t.mock.method(Comment,'create',async fields=>({_id:'cccccccccccccccccccccccc',...fields}));
  t.mock.method(Audit,'create',async()=>({}));t.mock.method(User,'find',()=>query([{_id:president}]));t.mock.method(Notification,'create',async fields=>fields);
  await withRoutes(user,[['/comments',comments]],async base=>{
    const response=await fetch(base+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({targetType:'sector',targetId:sector,parentId,kind:'comment',body:'Pripremićemo pregled.'})});
    assert.equal(response.status,201);assert.equal(parent.responseStatus,'answered');
  });
  assert.equal(create.mock.calls[0].arguments[0].parent,parentId);assert.equal(create.mock.calls[0].arguments[0].targetId,sector);
});
