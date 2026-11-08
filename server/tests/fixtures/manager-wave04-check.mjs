// Writes only to the explicitly enabled, authenticated in-memory UI fixture.
import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Set ZEPTER_UI_FIXTURE=1.');
const origin='http://127.0.0.1:4002';
const session=await (await fetch(origin+'/api/auth/refresh',{method:'POST'})).json();
assert.equal(session.accessToken,'isolated-ui-fixture');assert.equal(session.user.role,'manager');
const sector=session.user.sector;
async function call(path,{body,method='GET',headers={},status=200}={}){
 const response=await fetch(origin+'/api'+path,{method,headers:{Authorization:'Bearer isolated-ui-fixture',...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const result=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(result)}`);return result;
}
const initial=await call('/ideas/sector');assert.deepEqual(initial.stats,{total:4,review:2,revision:1,forwarded:1});
for(let i=0;i<9;i++)await call('/ideas',{method:'POST',status:201,body:{title:'Izolovana ideja '+i,description:'Predlog za proveru paginacije, bez stvarne baze.'}});
const page1=await call('/ideas/sector?tab=review&limit=10'),page2=await call('/ideas/sector?tab=review&limit=10&page=2&sectorId='+ 'f7'.repeat(12));
assert.equal(page1.items.length,10);assert.equal(page2.items.length,1);assert.equal(page2.stats.total,13);assert.equal(page2.stats.review,11);
assert.equal(new Set([...page1.items,...page2.items].map(row=>row._id)).size,11);
for(const tab of ['revision','forwarded']){const response=await call('/ideas/sector?tab='+tab);assert.equal(response.items.length,1);assert.equal(response.stats.total,13);}
await call('/ideas/'+'ac'.repeat(12),{status:403});
console.log('OK sector idea counts, grouped review states, filtering, stable pagination and foreign-sector denial');

const prepared=await call('/reports/prepare?type=weekly&day=2026-11-15');assert.equal(prepared.report,null);assert.equal(prepared.period.start,'2026-11-09');assert.equal(prepared.period.end,'2026-11-15');
const body={sectorId:sector,type:'weekly',day:'2026-11-15',results:'Izolovani rezultat — početni nacrt',problems:'Test prepreka',nextSteps:'Test naredni koraci'};
const saved=await call('/reports',{method:'POST',body,headers:{'If-None-Match':'*'},status:201});
assert.equal(saved.report.status,'draft');assert.ok(saved.report.updatedAt);
const continued=await call('/reports/prepare?type=weekly&day=2026-11-12');assert.equal(continued.report._id,saved.report._id);assert.equal(continued.report.results,body.results);
await call('/reports',{method:'POST',body,headers:{'If-None-Match':'*'},status:409});
const version={'If-Match':'"'+saved.report.updatedAt+'"'};
const updated=await call('/reports',{method:'POST',body:{...body,results:'Dopunjen i potvrđen izveštaj'},headers:version,status:201});
assert.equal(updated.report.results,'Dopunjen i potvrđen izveštaj');
await call('/reports',{method:'POST',body,headers:version,status:409});
await call('/reports/'+updated.report._id+'/publish',{method:'POST',headers:version,status:409});
const published=await call('/reports/'+updated.report._id+'/publish',{method:'POST',headers:{'If-Match':'"'+updated.report.updatedAt+'"'}});
assert.equal(published.report.status,'published');assert.equal(published.report.results,updated.report.results);assert.ok(published.report.publishedAt);
await call('/reports/'+published.report._id+'/publish',{method:'POST',status:409});
await call('/reports/'+published.report._id,{method:'PATCH',body:{results:'Neovlašćena promena objavljenog'},status:403});
await call('/reports',{method:'POST',body,headers:{'If-Match':'"'+published.report.updatedAt+'"'},status:409});
const final=await call('/reports/prepare?type=weekly&day=2026-11-11');assert.equal(final.report.status,'published');
const notifications=await call('/notifications?limit=50');assert.equal(notifications.items.some(row=>row.type==='report_published'),false);
console.log('OK prepare, create, continue saved draft, versioned save, stale and duplicate rejection, publish once, immutable published content');
console.log('All wave04 checks passed; no MongoDB connection.');
