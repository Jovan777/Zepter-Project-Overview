import test from 'node:test';
import assert from 'node:assert/strict';
import reports from '../src/routes/reports.js';
import ideas from '../src/routes/ideas.js';
import {Report,Project,Activity,WorkLog,Idea,Sector,Audit,User,Notification} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';

const self='111111111111111111111111',sector='333333333333333333333333',id='444444444444444444444444',foreign='555555555555555555555555';
const account={_id:self,role:'manager',sector},routes=[['/reports',reports],['/ideas',ideas]];
const stamp=new Date('2026-11-08T12:00:00Z'),version='"'+stamp.toISOString()+'"';
const post=(url,body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
function reportFixture(t){
 const report={_id:id,sector,type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',status:'draft',results:'Sačuvana dopuna',updatedAt:stamp,generated:{stats:{workEntries:1}}};
 t.mock.method(Report,'findOne',()=>query(report));t.mock.method(Report,'findById',()=>query(report));
 t.mock.method(Sector,'findById',()=>query({_id:sector,name:'Test sektor'}));
 t.mock.method(Project,'find',()=>query([{_id:id,title:'Projekat',progress:80,status:'active'}]));
 t.mock.method(Activity,'find',()=>query([{status:'completed',progress:100}]));
 t.mock.method(WorkLog,'find',()=>query([{day:'2026-11-07',done:'Stvaran rezultat',user:{firstName:'Test',lastName:'Zaposleni'}}]));
 t.mock.method(Audit,'create',async()=>({}));
 t.mock.method(User,'find',()=>query([{_id:foreign}]));t.mock.method(Notification,'create',async()=>({}));
 return report;
}
test('Prepare is manager-only, sector-bound and continues an existing weekly draft without writing',async t=>{
 const record=reportFixture(t),save=t.mock.method(Report,'findOneAndUpdate',()=>{throw Error('Read must not write');});
 await withRoutes(account,routes,async base=>{
  const response=await fetch(base+'/reports/prepare?type=weekly&day=2026-11-08&sectorId='+foreign);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const body=await response.json();assert.equal(body.report.results,record.results);assert.equal(body.period.start,'2026-11-02');assert.equal(body.period.end,'2026-11-08');assert.equal(body.sector._id,sector);
  assert.deepEqual(Report.findOne.mock.calls[0].arguments[0],{sector,type:'weekly',periodStart:'2026-11-02'});
  record.status='published';record.generated=null;
  const legacy=await (await fetch(base+'/reports/prepare?type=weekly&day=2026-11-08')).json();
  assert.equal(legacy.generated,null);assert.equal(Project.find.mock.callCount(),0);
 });
 for(const user of [{...account,role:'employee'},{...account,role:'president'},{...account,role:'admin'},{...account,sector:null}])await withRoutes(user,routes,async base=>assert.equal((await fetch(base+'/reports/prepare')).status,403));
 assert.equal(save.mock.callCount(),0);
});
test('Prepare generates actual source data for a new valid period and rejects invalid type/date',async t=>{
 reportFixture(t);t.mock.method(Report,'findOne',()=>query(null));
 await withRoutes(account,routes,async base=>{
  const response=await fetch(base+'/reports/prepare?type=daily&day=2026-11-08');assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.report,null);assert.equal(body.generated.completed[0].text,'Stvaran rezultat');assert.equal(body.generated.stats.avgProgress,80);
  for(const query of ['type=bad','day=2026-02-30'])assert.equal((await fetch(base+'/reports/prepare?'+query)).status,422);
 });
});
test('Creating for an existing period cannot silently overwrite a draft; stale updates and foreign sectors are rejected',async t=>{
 reportFixture(t);const write=t.mock.method(Report,'findOneAndUpdate',()=>{throw Error('No write');});
 await withRoutes(account,routes,async base=>{
  const body={sectorId:sector,type:'weekly',day:'2026-11-08',results:'Moj unos'};
  assert.equal((await post(base+'/reports',body,{'If-None-Match':'*'})).status,409);
  assert.equal((await post(base+'/reports',body,{'If-Match':'"stale"'})).status,409);
  assert.equal((await post(base+'/reports',{...body,sectorId:foreign},{'If-Match':version})).status,403);
  assert.equal((await post(base+'/reports/'+id+'/publish',{}, {'If-Match':'"stale"'})).status,409);
 });assert.equal(write.mock.callCount(),0);
});
test('Conditional save regenerates source data and uses an atomic draft/version guard',async t=>{
 const record=reportFixture(t);
 const update=t.mock.method(Report,'findOneAndUpdate',async(filter,patch)=>{
  assert.deepEqual(filter,{_id:id,status:'draft',updatedAt:stamp});assert.equal(patch.$set.generated.stats.workEntries,1);
  assert.equal(patch.$set.results,'Moji rezultati');return {...record,...patch.$set,updatedAt:new Date(+stamp+1)};
 });
 await withRoutes(account,routes,async base=>{
  const response=await post(base+'/reports',{sectorId:sector,type:'weekly',day:'2026-11-08',results:'Moji rezultati',problems:'',nextSteps:'Nastavak'},{'If-Match':version});
  assert.equal(response.status,201);assert.equal((await response.json()).report.status,'draft');
 });assert.equal(update.mock.callCount(),1);
});
test('Missing saved version, unauthorized roles and published edits never reach a write',async t=>{
 const record=reportFixture(t),update=t.mock.method(Report,'findOneAndUpdate',()=>{throw Error('Must not write');});
 const body={sectorId:sector,type:'weekly',day:'2026-11-08'};
 for(const user of [{...account,role:'employee'},{...account,role:'president'},{...account,sector:null}])await withRoutes(user,routes,async base=>assert.equal((await post(base+'/reports',body)).status,403));
 t.mock.method(Report,'findOne',()=>query(null));
 await withRoutes(account,routes,async base=>assert.equal((await post(base+'/reports',body,{'If-Match':version})).status,409));
 record.status='published';
 await withRoutes(account,routes,async base=>assert.equal((await fetch(base+'/reports/'+id,{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':version},body:JSON.stringify({results:'Changed'})})).status,403));
 assert.equal(update.mock.callCount(),0);
});
test('Competing save/publish cannot overwrite a newer draft or notify the president',async t=>{
 reportFixture(t);t.mock.method(Report,'findOneAndUpdate',async()=>null);
 await withRoutes(account,routes,async base=>{
  assert.equal((await post(base+'/reports',{sectorId:sector,type:'weekly',day:'2026-11-08',results:'Text'},{'If-Match':version})).status,409);
  assert.equal((await post(base+'/reports/'+id+'/publish',{}, {'If-Match':version})).status,409);
  assert.equal((await fetch(base+'/reports/'+id,{method:'PATCH',headers:{'Content-Type':'application/json','If-Match':version},body:JSON.stringify({results:'Text'})})).status,409);
  assert.equal((await fetch(base+'/reports/'+id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({results:'Legacy text'})})).status,409);
 });assert.equal(Notification.create.mock.callCount(),0);assert.equal(Audit.create.mock.callCount(),0);
});
test('Publishing a saved version atomically freezes the report and notifies the president once',async t=>{
 const record=reportFixture(t);t.mock.method(Report,'findOneAndUpdate',async(filter,patch)=>{
  assert.deepEqual(filter,{_id:id,status:'draft',updatedAt:stamp});Object.assign(record,patch.$set);return record;
 });
 await withRoutes(account,routes,async base=>{
  const response=await post(base+'/reports/'+id+'/publish',{}, {'If-Match':version});assert.equal(response.status,200);const body=await response.json();assert.equal(body.report.status,'published');assert.equal(body.report.results,'Sačuvana dopuna');assert.ok(body.report.publishedAt);
  assert.equal((await post(base+'/reports/'+id+'/publish',{}, {'If-Match':version})).status,409);
  assert.equal((await post(base+'/reports',{sectorId:sector,type:'weekly',day:'2026-11-08'},{'If-Match':version})).status,409);
 });assert.equal(Notification.create.mock.callCount(),1);
 await withRoutes({...account,role:'president'},routes,async base=>assert.equal((await fetch(base+'/reports/'+id)).status,200));
});
test('Manager idea feed groups review states, counts the entire sector and keeps pagination scoped',async t=>{
 const find=t.mock.method(Idea,'find',()=>query([{_id:id,status:'in_review',author:{firstName:'Test',lastName:'Autor'}}]));
 const count=t.mock.method(Idea,'countDocuments',async filter=>filter.status?.$in?10:filter.status==='revision_requested'?5:filter.status==='forwarded'?9:24);
 await withRoutes(account,routes,async base=>{
  const response=await fetch(base+'/ideas/sector?tab=review&page=2&limit=3&sectorId='+foreign+'&authorId='+foreign);assert.equal(response.status,200);
  const body=await response.json();assert.deepEqual(body.stats,{total:24,review:10,revision:5,forwarded:9});assert.equal(body.page,2);assert.equal(body.limit,3);
 });assert.deepEqual(find.mock.calls[0].arguments[0],{sector,status:{$in:['submitted','in_review']}});for(const call of count.mock.calls)assert.equal(call.arguments[0].sector,sector);
});
test('Sector idea feed rejects other roles, missing sector and unknown filters before any query',async t=>{
 const find=t.mock.method(Idea,'find',()=>{throw Error('No query');});
 for(const user of [{...account,role:'employee'},{...account,role:'president'},{...account,role:'admin'},{...account,sector:null}])await withRoutes(user,routes,async base=>assert.equal((await fetch(base+'/ideas/sector')).status,403));
 await withRoutes(account,routes,async base=>assert.equal((await fetch(base+'/ideas/sector?tab=__proto__')).status,422));
 await withRoutes({...account,sector:null},routes,async base=>assert.equal((await fetch(base+'/ideas')).status,403));
 assert.equal(find.mock.callCount(),0);
});
