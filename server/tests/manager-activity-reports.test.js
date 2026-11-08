import test from 'node:test';
import assert from 'node:assert/strict';
import activities from '../src/routes/activities.js';
import reports from '../src/routes/reports.js';
import {Activity,Project,Audit,WorkLog,Report,User,Notification} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';

const manager='111111111111111111111111',employee='222222222222222222222222',sector='333333333333333333333333',projectId='444444444444444444444444',activityId='555555555555555555555555',foreign='666666666666666666666666';
const account={_id:manager,role:'manager',sector},routes=[['/activities',activities],['/reports',reports]];
const activityUrl='/activities/'+activityId;
function fixture(t){
 const project={_id:projectId,sector,members:[manager,employee],owner:manager};
 const activity={_id:activityId,project:projectId,sector,title:'Stari naziv',description:'Opis',assignees:[employee],priority:'medium',status:'in_progress',progress:50,actualWork:'Urađeni posao',updatedAt:new Date('2026-11-08T10:00:00Z')};
 t.mock.method(Project,'findById',()=>query(project));t.mock.method(Activity,'findById',()=>query(activity));
 return {project,activity};
}
test('Activity history rejects employees and other roles before looking up data',async t=>{
 const find=t.mock.method(Activity,'findById',()=>{throw Error('Must not query');});
 for(const role of ['employee','president','admin'])await withRoutes({...account,role},routes,async base=>assert.equal((await fetch(base+activityUrl+'/history')).status,403));
 await withRoutes({...account,sector:null},routes,async base=>assert.equal((await fetch(base+activityUrl+'/history')).status,403));
 assert.equal(find.mock.callCount(),0);
});
test('Manager cannot read activity history in another sector',async t=>{
 const {project}=fixture(t);project.sector=foreign;
 const audit=t.mock.method(Audit,'find',()=>{throw Error('No audit query allowed');});
 await withRoutes(account,routes,async base=>assert.equal((await fetch(base+activityUrl+'/history')).status,403));
 assert.equal(audit.mock.callCount(),0);
});
test('Activity history scopes worklogs and events and emits only approved fields without IP/contact data',async t=>{
 fixture(t);const filters=[];
 const event={_id:manager,entity:'Activity',entityId:activityId,action:'activity.updated',ip:'private-ip',actor:{_id:employee,firstName:'Test',lastName:'Zaposleni',email:'private-contact'},details:{fields:['progress','actualWork','secret'],secret:'private'},createdAt:new Date()};
 const log={_id:employee,user:{_id:employee,firstName:'Test',lastName:'Zaposleni',email:'private-contact'},day:'2026-11-08',done:'Posao',nextSteps:'Dalje',blockers:'',minutes:80,private:'private-value'};
 const pages=[];
 const paged=items=>{const q=query(items);q.skip=value=>{pages.push(value);return q;};return q;};
 t.mock.method(Audit,'find',filter=>{filters.push(filter);return paged([event]);});t.mock.method(Audit,'countDocuments',async()=>24);
 t.mock.method(WorkLog,'find',filter=>{filters.push(filter);return paged([log]);});t.mock.method(WorkLog,'countDocuments',async()=>31);
 await withRoutes(account,routes,async base=>{
  const response=await fetch(base+activityUrl+'/history?page=2&worklogPage=3&limit=10&userId='+foreign+'&sectorId='+foreign);assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.events.page,2);assert.equal(body.worklogs.page,3);assert.deepEqual(pages,[10,20]);
  assert.deepEqual(body.events.items[0].fields,['progress','actualWork']);assert.equal(body.worklogs.items[0].done,'Posao');
  assert.equal(JSON.stringify(body).includes('private'),false);assert.equal(JSON.stringify(body).includes('secret'),false);
 });
 assert.deepEqual(filters[0],{entity:'Activity',entityId:activityId,action:{$in:['activity.created','activity.updated']}});
 assert.deepEqual(filters[1],{activity:activityId,project:projectId,sector});
});
test('Manager updates activity metadata, assigned members and progress using versioned existing API',async t=>{
 const {activity}=fixture(t);const member={_id:manager,sector,role:'manager'};
 t.mock.method(User,'find',filter=>query(filter.sector?[member]:[]));t.mock.method(Notification,'create',async()=>({}));
 t.mock.method(Activity,'find',()=>query([{progress:100},{progress:0}]));
 const progress=t.mock.method(Project,'updateOne',async()=>({modifiedCount:1}));
 const audit=t.mock.method(Audit,'create',async()=>({}));
 const atomic=t.mock.method(Activity,'findOneAndUpdate',async(filter,patch)=>{assert.equal(filter.updatedAt,activity.updatedAt);return {...activity,...patch.$set,updatedAt:new Date('2026-11-08T11:00:00Z')};});
 await withRoutes(account,routes,async base=>{
  const response=await fetch(base+activityUrl,{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':'"2026-11-08T10:00:00.000Z"'},body:JSON.stringify({title:'Novi naziv',description:'Novi cilj',assigneeIds:[manager],dueDate:null,priority:'high',status:'completed'})});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.activity.progress,100);assert.equal(body.activity.dueDate,null);assert.equal(body.activity.actualWork,'Urađeni posao');assert.equal(body.projectProgress,50);
 });
 assert.equal(atomic.mock.callCount(),1);assert.equal(progress.mock.callCount(),1);assert.ok(audit.mock.calls[0].arguments[0].details.fields.includes('assigneeIds'));
});
test('Manager report list forces session sector, filters type and paginates drafts and published reports',async t=>{
 const filters=[],offsets=[];
 t.mock.method(Report,'find',filter=>{filters.push(filter);const q=query([{_id:manager,type:filter.type,status:'draft'},{_id:employee,type:filter.type,status:'published'}]);q.skip=n=>{offsets.push(n);return q;};return q;});
 t.mock.method(Report,'countDocuments',async filter=>{assert.equal(filter.sector,sector);return 22;});
 await withRoutes(account,routes,async base=>{for(const type of ['daily','weekly']){const response=await fetch(base+'/reports?type='+type+'&page=2&limit=10&sectorId='+foreign);assert.equal(response.status,200);const body=await response.json();assert.equal(body.page,2);assert.equal(body.total,22);assert.deepEqual(body.items.map(item=>item.status),['draft','published']);}});
 assert.deepEqual(filters,[{sector,type:'daily'},{sector,type:'weekly'}]);assert.deepEqual(offsets,[10,10]);
});
test('Report list rejects employees, missing manager sector and invalid types without querying reports',async t=>{
 const find=t.mock.method(Report,'find',()=>{throw Error('No query');});
 for(const user of [{...account,role:'employee'},{...account,sector:null}])await withRoutes(user,routes,async base=>assert.equal((await fetch(base+'/reports')).status,403));
 await withRoutes(account,routes,async base=>assert.equal((await fetch(base+'/reports?type=unknown')).status,422));
 assert.equal(find.mock.callCount(),0);
});
test('Saved report details stay in sector and president sees only published content',async t=>{
 const record={_id:manager,sector,status:'draft',results:'Pregled'};t.mock.method(Report,'findById',()=>query(record));
 await withRoutes(account,routes,async base=>{assert.equal((await fetch(base+'/reports/'+manager)).status,200);record.sector=foreign;assert.equal((await fetch(base+'/reports/'+manager)).status,403);});
 record.sector=sector;
 await withRoutes({...account,role:'president'},routes,async base=>{assert.equal((await fetch(base+'/reports/'+manager)).status,403);record.status='published';assert.equal((await fetch(base+'/reports/'+manager)).status,200);});
});
