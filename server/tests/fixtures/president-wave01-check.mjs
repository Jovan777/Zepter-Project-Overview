import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Start an isolated president fixture with ZEPTER_UI_QA=1 first.');
const base='http://127.0.0.1:4002/api',sector='33'.repeat(12),cookies=[];
let passed=0;
const check=(value,message)=>{assert.ok(value,message);passed++;};
async function raw(path,options={}){
 const response=await fetch(base+path,{...options,headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4002',...options.headers},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(10000)});
 return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
try{
 const first=await raw('/auth/president-link',{method:'POST',body:{key:'p'.repeat(32)}});if(first.cookie)cookies.push(first.cookie);
 check(first.status===200&&first.data.user.role==='president','Personal link grants real president authentication.');
 const second=await raw('/auth/president-link',{method:'POST',body:{key:'p'.repeat(32)}});if(second.cookie)cookies.push(second.cookie);
 check(second.status===200&&second.cookie!==first.cookie,'Same link works for a new device.');
 const call=(path,options={})=>raw(path,{...options,headers:{Authorization:'Bearer '+first.data.accessToken,...options.headers}});
 check((await raw('/dashboard/president')).status===401,'Anonymous feed denied.');
 const overview=await call('/dashboard/president');check(overview.status===200,'Company overview responds.');
 check(overview.data.stats.activeProjects===3,'Active count excludes planned and closed projects.');
 check((await call('/projects?activeOnly=1')).data.total===overview.data.stats.activeProjects,'Active count opens precisely the active company project list.');
 check(overview.data.stats.attention===4,'Attention deduplicates delayed activities under at-risk and closed projects.');
 check(overview.data.sectors.total===5,'All five sectors are available.');
 for(const row of overview.data.sectors.items){
  const attention=await call('/dashboard/president/attention?sectorId='+row._id);
  check(attention.data.total===row.attentionCount,'Sector count equals its actual attention list.');
 }
 const page1=await call('/dashboard/president/attention?limit=2'),page2=await call('/dashboard/president/attention?limit=2&page=2');
 check(page1.data.items.length===2&&page2.data.items.length===2,'Attention pagination crosses categories without duplicates.');
 check(new Set([...page1.data.items,...page2.data.items].map(x=>x.key)).size===4,'Attention keys are unique.');
 for(const item of overview.data.attention.items)check((await call(item.link)).status===200,'Attention destination exists: '+item.kind);
 const detail=await call('/sectors/'+sector+'/president');
 check(detail.data.stats.activeProjects===2&&detail.data.stats.attention===3&&detail.data.stats.avgProgress===23,'Sector statistics match current projects.');
 const projects=await call('/sectors/'+sector+'/president/projects'),next=await call('/sectors/'+sector+'/president/projects?page=2');
 check(projects.data.total===11&&projects.data.items.length===8&&next.data.items.length===3,'Sector projects paginate all current items.');
 check(new Set([...projects.data.items,...next.data.items].map(x=>x._id)).size===11,'Project pagination has no repeats.');
 const existing=projects.data.items.find(x=>x._id==='44'.repeat(12));
 check(existing.commentCount===1&&existing.owner._id==='22'.repeat(12)&&existing.memberCount===3,'Real responsible person, team count and comment count.');
 check((await call('/sectors/'+sector+'/president/projects?tab=all')).data.total===12,'All projects includes completed work.');
 for(const q of ['.*','[','(','.'])check((await call('/sectors/'+sector+'/president/projects?q='+encodeURIComponent(q))).data.total===0,'Search treats metacharacters literally.');
 check((await call('/dashboard/president?q='+encodeURIComponent('.*'))).data.sectors.total===0,'Sector search treats metacharacters literally.');
 check((await call('/sectors/'+sector+'/president/projects?q='+encodeURIComponent('Oktobarska'))).data.total===1,'Project search returns matching real item.');
 check((await call('/sectors/not-an-id/president')).status===400,'Invalid sector is rejected.');
 check((await call('/sectors/'+'fa'.repeat(12)+'/president')).status===404,'Missing sector has a clear not found response.');
 for(const role of ['manager','employee']){
  const options={headers:{Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':role}};
  for(const path of ['/dashboard/president','/dashboard/president/attention','/sectors/'+sector+'/president','/sectors/'+sector+'/president/projects'])check((await call(path,options)).status===403,'President feed denied to '+role);
 }
 const posted=await call('/comments',{method:'POST',body:{targetType:'sector',targetId:sector,kind:'instruction',body:'Test: pripremite prioritete za pregled kompanije.'}});
 check(posted.status===201&&posted.data.comment.kind==='instruction','President can send a sector instruction.');
 const reply=await call('/comments',{method:'POST',headers:{Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':'manager'},body:{targetType:'sector',targetId:sector,parentId:posted.data.comment._id,kind:'comment',body:'Test: pripremili smo prioritete.'}});
 check(reply.status===201,'Sector manager can reply.');
 const thread=await call('/comments?targetType=sector&targetId='+sector);
 check(thread.data.items.some(x=>x._id===posted.data.comment._id&&x.responseStatus==='answered'),'Instruction displays answered status.');
 for(const scope of ['company','sector'])for(const type of ['daily','weekly']){
  const context=new URLSearchParams({scope,type,...(scope==='sector'?{id:sector}:{})});
  const report=await call('/reports/preview?'+context);
  check(report.status===200&&report.data.report.type===type&&report.data.report.scope===scope,'Correct report context '+scope+' '+type);
 }
 console.log('PASS '+passed+' presidential API/auth/workflow checks; isolated data only.');
}finally{
 for(const cookie of cookies)await raw('/auth/logout',{method:'POST',headers:{Cookie:cookie}});
 console.log('Test sessions logged out.');
}
