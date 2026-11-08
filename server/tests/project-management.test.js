import test from 'node:test';
import assert from 'node:assert/strict';
import projects from '../src/routes/projects.js';
import activities from '../src/routes/activities.js';
import {Project, Activity, User, Sector, Audit, Notification} from '../src/models/index.js';
import {withRoutes, query} from './helpers/http.mjs';

const manager='111111111111111111111111', member='222222222222222222222222', sector='333333333333333333333333', projectId='444444444444444444444444', foreign='555555555555555555555555';
const account={_id:manager,role:'manager',sector}, routes=[['/projects',projects],['/activities',activities]];
const request=(base,path,body,method='PATCH',headers={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
function fixture(t) {
  const project={_id:projectId,sector,title:'Test',description:'Opis',status:'active',priority:'medium',owner:manager,members:[manager,member],progress:20,updatedAt:new Date('2026-11-08T10:00:00Z'),save:t.mock.fn(async()=>{})};
  const people=[{_id:manager,sector,role:'manager'},{_id:member,sector,role:'employee'}];
  t.mock.method(Project,'findById',()=>query(project));
  t.mock.method(Sector,'findById',()=>query({_id:sector,active:true,manager}));
  t.mock.method(User,'find',filter=>query(filter.sector&&filter.sector!==sector?[]:people.filter(person=>filter._id.$in.includes(person._id))));
  t.mock.method(Activity,'distinct',async()=>[member]);
  t.mock.method(Activity,'exists',async()=>null);
  t.mock.method(Activity,'find',()=>query([{progress:20},{progress:0}]));
  t.mock.method(Project,'updateOne',async()=>({modifiedCount:1}));
  t.mock.method(Audit,'create',async()=>({}));
  const notifications=t.mock.method(Notification,'create',async fields=>fields);
  return {project,notifications};
}

test('Manager creates a project in own sector, including owner in the team and notifying members',async t=>{
  const {notifications}=fixture(t), create=t.mock.method(Project,'create',async fields=>({_id:projectId,...fields}));
  await withRoutes(account,routes,async base=>{
    const response=await request(base,'/projects',{sectorId:sector,title:'Novi projekat',description:'Opis',ownerId:manager,memberIds:[member],dueDate:'2026-12-01'},'POST');
    assert.equal(response.status,201);const body=await response.json();assert.deepEqual(body.project.members,[member,manager]);
    assert.equal(body.project.dueDate,'2026-12-01T12:00:00.000Z');
    assert.equal((await request(base,'/projects',{sectorId:foreign,title:'Tuđi sektor'},'POST')).status,403);
  });
  assert.equal(create.mock.callCount(),1);assert.equal(notifications.mock.calls[0].arguments[0].user,member);
});

test('Employees cannot create/edit projects; manager cannot edit a foreign sector or add foreign people',async t=>{
  const {project}=fixture(t);
  const create=t.mock.method(Project,'create',async()=>{throw Error('Must not create');});
  await withRoutes({...account,role:'employee'},routes,async base=>{
    assert.equal((await request(base,'/projects',{sectorId:sector,title:'Forbidden'},'POST')).status,403);
    assert.equal((await request(base,'/projects/'+projectId,{title:'Forbidden'})).status,403);
  });
  await withRoutes(account,routes,async base=>{
    assert.equal((await request(base,'/projects/'+projectId,{memberIds:[foreign]})).status,422);
    project.sector=foreign;assert.equal((await request(base,'/projects/'+projectId,{title:'Forbidden'})).status,403);
  });assert.equal(create.mock.callCount(),0);assert.equal(project.save.mock.callCount(),0);
});

test('Team edit retains owner and refuses removal of a member with existing activity assignments',async t=>{
  const {project}=fixture(t);
  await withRoutes(account,routes,async base=>{
    assert.equal((await request(base,'/projects/'+projectId,{memberIds:[member]})).status,200);
    assert.deepEqual(project.members,[member,manager]);
    const count=project.save.mock.callCount();
    assert.equal((await request(base,'/projects/'+projectId,{memberIds:[manager]})).status,409);
    assert.equal(project.save.mock.callCount(),count);
  });
});

test('Project dates can be cleared and startDate edited through a versioned atomic patch',async t=>{
  const {project}=fixture(t);
  const atomic=t.mock.method(Project,'findOneAndUpdate',async(filter,patch)=>{
    assert.deepEqual(filter,{_id:projectId,updatedAt:project.updatedAt});
    assert.equal(patch.$set.dueDate,null);assert.equal(patch.$set.startDate.toISOString(),'2026-11-09T12:00:00.000Z');
    return {...project,...patch.$set,updatedAt:new Date('2026-11-08T10:01:00Z')};
  });
  await withRoutes(account,routes,async base=>{
    const response=await request(base,'/projects/'+projectId,{dueDate:null,startDate:'2026-11-09'},'PATCH',{'If-Match':'"2026-11-08T10:00:00.000Z"'});
    assert.equal(response.status,200);assert.equal((await response.json()).project.updatedAt,'2026-11-08T10:01:00.000Z');
  });assert.equal(atomic.mock.callCount(),1);assert.equal(project.save.mock.callCount(),0);
});

test('Stale project version and competing atomic write do not overwrite project data',async t=>{
  const {project}=fixture(t), atomic=t.mock.method(Project,'findOneAndUpdate',async()=>null);
  await withRoutes(account,routes,async base=>{
    assert.equal((await request(base,'/projects/'+projectId,{title:'Stale'},'PATCH',{'If-Match':'"old"'})).status,409);
    assert.equal(atomic.mock.callCount(),0);
    assert.equal((await request(base,'/projects/'+projectId,{title:'Race'},'PATCH',{'If-Match':'"2026-11-08T10:00:00.000Z"'})).status,409);
  });assert.equal(project.save.mock.callCount(),0);
});

test('Project completion still rejects unfinished activities',async t=>{
  const {project}=fixture(t);t.mock.method(Activity,'exists',async()=>({_id:member}));
  await withRoutes(account,routes,async base=>assert.equal((await request(base,'/projects/'+projectId,{status:'completed'})).status,409));
  assert.equal(project.save.mock.callCount(),0);
});

test('Activity creation requires project write access and assignees from its team',async t=>{
  const {project}=fixture(t), create=t.mock.method(Activity,'create',async fields=>({_id:foreign,...fields}));
  await withRoutes(account,routes,async base=>{
    const response=await request(base,'/activities/project/'+projectId,{title:'Novi zadatak',assigneeIds:[member]},'POST');
    assert.equal(response.status,201);assert.deepEqual((await response.json()).activity.assignees,[member]);
    project.members=[manager];assert.equal((await request(base,'/activities/project/'+projectId,{title:'Invalid',assigneeIds:[member]},'POST')).status,422);
    project.members=[manager,member];project.status='completed';assert.equal((await request(base,'/activities/project/'+projectId,{title:'Closed'},'POST')).status,409);
    project.status='active';project.sector=foreign;assert.equal((await request(base,'/activities/project/'+projectId,{title:'Foreign'},'POST')).status,403);
  });assert.equal(create.mock.callCount(),1);
  project.sector=sector;
  await withRoutes({...account,role:'employee'},routes,async base=>assert.equal((await request(base,'/activities/project/'+projectId,{title:'Forbidden'},'POST')).status,403));
});
