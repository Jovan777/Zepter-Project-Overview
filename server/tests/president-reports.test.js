import test from 'node:test';
import assert from 'node:assert/strict';
import reports from '../src/routes/reports.js';
import {reportView,presidentReport} from '../src/services/president-reports.js';
import {generateReport} from '../src/services/reports.js';
import {Report,Sector,Project,Activity,WorkLog,User} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';
const id=n=>String(n).repeat(24),sector=id(3),project=id(4),record=id(5),employee=id(2),account={_id:id(7),role:'president'};
function fixture(t){
 const target={_id:sector,name:'Test sektor'},p={_id:project,title:'Izabrani projekat',sector,status:'active',progress:50,archived:false};
 const saved={_id:record,sector,status:'published',type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',results:'Sačuvani rezultati',problems:'Sačuvani problem',nextSteps:'Sačuvani korak',publishedAt:'2026-11-08T12:00:00Z',generated:{stats:{completedActivities:12,lateActivities:3,workEntries:1},completed:[{day:'2026-11-06',text:'Istorijski rezultat.'}],blockers:[],nextSteps:[]}};
 t.mock.method(Sector,'findById',()=>query(target));t.mock.method(Project,'findById',()=>query(p));
 t.mock.method(Report,'findById',key=>query(key===record?saved:null));t.mock.method(Report,'find',()=>query([]));
 t.mock.method(Project,'find',()=>query([p]));t.mock.method(Activity,'find',()=>query([]));t.mock.method(WorkLog,'find',()=>query([]));
 return {saved,p,target};
}
test('A saved report uses only its published snapshot, never today’s project statistics',async t=>{
 const f=fixture(t);t.mock.method(Project,'find',()=>{throw Error('Historical reading must not generate today’s report');});t.mock.method(WorkLog,'find',()=>{throw Error('Historical reading must not fetch current logs');});
 await withRoutes(account,[['/reports',reports]],async base=>{
  const result=await fetch(base+'/reports/president?reportId='+record),body=await result.json();
  assert.equal(result.status,200);assert.equal(body.mode,'published');assert.equal(body.metrics.completedActivities,12);assert.equal(body.completedActivities,null);
  assert.equal(body.context.name,'Test sektor');assert.equal(body.results[0].text,'Istorijski rezultat.');assert.equal(body.summaries[0].problems,f.saved.problems);
 });
});
test('Missing old snapshot data stays unknown instead of fabricating zeros or a current snapshot',()=>{
 const data=reportView(null,{scope:'sector'},{saved:{_id:record},summaries:[]});
 assert.equal(data.metrics.completedActivities,null);assert.equal(data.metrics.lateActivities,null);assert.equal(data.completedActivities,null);assert.deepEqual(data.results,[]);
});
test('An exact published sector period is selected; another period or a project uses scoped evidence',async t=>{
 const f=fixture(t),filters=[],logs=[];
 t.mock.method(Report,'find',filter=>{filters.push(filter);return query(filter.sector===sector&&filter.type==='weekly'&&filter.periodStart==='2026-11-02'?[f.saved]:[]);});
 t.mock.method(WorkLog,'find',filter=>{logs.push(filter);return query([{day:'2026-11-09',user:{firstName:'Test',lastName:'Zaposleni'},project:{_id:project,title:'Izabrani projekat'},activity:{_id:id(6),title:'Aktivnost'},done:'Novi rezultat',blockers:'Prepreka',nextSteps:'Sledeći korak'}]);});
 const saved=await presidentReport(account,{scope:'sector',id:sector,type:'weekly',day:'2026-11-08'});assert.equal(saved.mode,'published');assert.equal(logs.length,0);
 const next=await presidentReport(account,{scope:'sector',id:sector,type:'weekly',day:'2026-11-09'});assert.equal(next.mode,'live');assert.equal(next.context.periodStart,'2026-11-09');assert.equal(next.results[0].activityId,id(6));
 const selected=await presidentReport(account,{scope:'project',id:project,type:'daily',day:'2026-11-09'});assert.equal(selected.context.name,'Izabrani projekat');assert.equal(selected.summaries.length,0);
 assert.deepEqual(logs.at(-1),{day:{$gte:'2026-11-09',$lte:'2026-11-09'},project});assert.ok(filters.some(filter=>filter.periodEnd==='2026-11-08'&&filter.status==='published'));
});
test('President endpoints reject other roles, drafts and malformed contexts before returning content',async t=>{
 const f=fixture(t);
 for(const role of ['employee','manager','admin'])await withRoutes({...account,role},[['/reports',reports]],async base=>{
  for(const path of ['/reports/president?scope=company','/reports/president/options?scope=project'])assert.equal((await fetch(base+path)).status,403);
 });
 await withRoutes(account,[['/reports',reports]],async base=>{
  f.saved.status='draft';assert.equal((await fetch(base+'/reports/president?reportId='+record)).status,403);
  assert.equal((await fetch(base+'/reports/president?reportId='+id(9))).status,404);
  for(const query of ['scope=other','type=monthly','day=2026-02-30'])assert.equal((await fetch(base+'/reports/president?'+query)).status,422);
  assert.equal((await fetch(base+'/reports/president?scope=sector')).status,400);
 });
});
test('A published report remains readable after its original sector is removed',async t=>{
 fixture(t);t.mock.method(Sector,'findById',()=>query(null));const result=await presidentReport(account,{reportId:record});assert.equal(result.context.name,'Sektor nije dostupan');assert.equal(result.results[0].text,'Istorijski rezultat.');
});
test('Report target search is paginated, literal and returns names without account secrets',async t=>{
 fixture(t);let filter,skip;
 t.mock.method(User,'find',value=>{filter=value;const q=query([{_id:employee,firstName:'Test',lastName:'Zaposleni',email:'private@fixture.test',passwordHash:'private'}]);q.skip=n=>{skip=n;return q;};return q;});t.mock.method(User,'countDocuments',async()=>25);
 await withRoutes(account,[['/reports',reports]],async base=>{const result=await fetch(base+'/reports/president/options?scope=employee&q='+encodeURIComponent('.*')+'&page=2'),data=await result.json();assert.equal(result.status,200);assert.equal(skip,20);assert.deepEqual(data.items,[{_id:employee,name:'Test Zaposleni'}]);assert.equal(data.total,25);assert.equal(filter.$or[0].firstName.$regex,'\\.\\*');assert.equal(filter.approval,'approved');});
});
test('Activity snapshots use Belgrade midnight and exclude alarms inside closed or archived projects',async t=>{
 const f=fixture(t),closed={_id:id(8),status:'completed'},archived={_id:id(9),status:'active',archived:true};
 t.mock.method(Project,'find',()=>query([f.p,closed,archived]));
 t.mock.method(Activity,'find',()=>query([
  {_id:id(1),title:'Danas',project,status:'review',dueDate:new Date('2026-10-24T22:30:00Z')},
  {_id:id(2),title:'Kasni',project,status:'in_progress',dueDate:new Date('2026-10-24T21:59:00Z')},
  {_id:id(3),title:'Završen projekat',project:closed._id,status:'blocked',dueDate:new Date('2026-10-20T12:00Z')},
  {_id:id(4),title:'Arhiva',project:archived._id,status:'blocked',dueDate:new Date('2026-10-20T12:00Z')},
  {_id:id(5),title:'Završeno',project,status:'completed',progress:100}
 ]));
 const value=await generateReport({scope:'project',id:project,type:'daily',day:'2026-10-25',now:new Date('2026-10-25T10:00:00Z')});
 assert.deepEqual(value.activitySnapshot.late.map(row=>row.title),['Kasni']);assert.equal(value.stats.lateActivities,1);assert.equal(value.activitySnapshot.completed[0].title,'Završeno');assert.equal(value.generatedAt,'2026-10-25T10:00:00.000Z');
});
