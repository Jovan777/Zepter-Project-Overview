import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Set ZEPTER_UI_FIXTURE=1 and start a fresh fixture with ZEPTER_UI_ROLE=manager.');
const base='http://127.0.0.1:4002';
const call=async(path,options={})=>{
 const response=await fetch(base+'/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(10000)});
 return {status:response.status,data:await response.json()};
};
const auth=await call('/auth/refresh',{method:'POST'});
assert.equal(auth.data.accessToken,'isolated-ui-fixture');assert.equal(auth.data.user.role,'manager');
const overview=await call('/dashboard/manager');assert.equal(overview.status,200);
assert.equal(overview.data.stats.totalProjects,3);assert.equal(overview.data.stats.activeProjects,2);
assert.equal(overview.data.stats.atRiskProjects,1);assert.equal(overview.data.stats.delayedActivities,1);
assert.equal(overview.data.stats.newIdeas,2);assert.equal(overview.data.stats.unreadPresidentComments,1);
assert.equal(overview.data.attentionTotal,1);assert.equal(overview.data.attentionProjects[0]._id,'f2'.repeat(12));
console.log('OK sector statistics, archived/foreign scope, closed-project late-work exclusion, attention and review ideas');
for(const [tab,total] of [['all',3],['active',2],['review',1],['on_track',1],['at_risk',1],['completed',1],['attention',1]]){
 const result=await call('/projects/sector?tab='+tab);assert.equal(result.status,200);assert.equal(result.data.total,total,tab);
 assert.equal(result.data.stats.totalProjects,3);
 if(tab==='review')assert.equal(result.data.items[0].status,'at_risk');
}
const second=await call('/projects/sector?limit=1&page=2');assert.equal(second.data.items.length,1);assert.equal(second.data.page,2);
assert.equal((await call('/projects/sector?q='+encodeURIComponent('.*'))).data.total,0);
const tampered=await call('/projects/sector?sectorId='+'f7'.repeat(12));assert.equal(tampered.data.total,3);
console.log('OK tabs, pagination, literal search and forged-sector isolation');
const parent=overview.data.sectorComment;
assert.equal((await call('/comments',{method:'POST',body:{targetType:'sector',targetId:overview.data.sector._id,parentId:parent._id,kind:'comment',body:'Prioriteti su primljeni. Pripremićemo pregled sektora.'}})).status,201);
assert.equal((await call('/dashboard/manager')).data.sectorComment.responseStatus,'answered');
const thread=await call('/comments?targetType=sector&targetId='+overview.data.sector._id);assert.ok(thread.data.items.some(x=>x.parent===parent._id));
console.log('OK manager answer to president sector instruction and answered status');
for(const path of ['/','/projects','/projects/new'])assert.equal((await fetch(base+path)).status,200);
console.log('OK frontend SPA entry points; visual/browser behavior remains a separate check');
