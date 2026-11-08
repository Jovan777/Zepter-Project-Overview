import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Start the explicit WAVE02/WAVE04 president QA fixture.');
const base='http://127.0.0.1:4002/api',sector='33'.repeat(12),project='44'.repeat(12),published='d5'.repeat(12),legacy='d6'.repeat(12),draft='d8'.repeat(12);
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;};
async function call(path,{role='president',method='GET',body}={}){const response=await fetch(base+path,{method,headers:{Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':role,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});return {status:response.status,data:await response.json()};}
for(const type of ['daily','weekly'])for(const [scope,id]of [['company',null],['sector',sector],['project',project],['employee','11'.repeat(12)]]){
 const result=await call('/reports/president?'+new URLSearchParams({scope,type,day:'2026-11-08',...(id?{id}:{})}));
 check(result.status===200,'Read '+scope+' '+type);check(result.data.context.scope===scope&&result.data.context.type===type,'Correct scope/type.');
 check(result.data.context.periodStart===(type==='daily'?'2026-11-08':'2026-11-02'),'Correct Belgrade period.');
 check(!JSON.stringify(result.data).includes('PRIVATE_DRAFT_WAVE04'),'No draft appears in reader.');
 if(scope==='project'||scope==='employee')check(result.data.summaries.length===0,'No unrelated sector report in personal/project view.');
}
const saved=(await call('/reports/president?reportId='+published)).data;
check(saved.mode==='published'&&saved.metrics.completedActivities===6,'Saved activity snapshot remains exact.');
check(saved.results.length===7&&saved.completedActivities.length===6,'Full evidence and activity lists are available.');
check(saved.metrics.problemReports===2&&saved.metrics.lateActivities===1,'Saved counters match the visible sources.');
check(saved.context.name==='Marketing'&&saved.summaries[0].results.includes('Objavljen'),'Actual sector and manager summary.');
const old=(await call('/reports/president?reportId='+legacy)).data;
check(old.metrics.completedActivities===3&&old.metrics.lateActivities===2&&old.completedActivities===null,'Legacy report retains numbers without fabricating a current list.');
check(old.results[0].text==='Stari snimak bez spiska aktivnosti.','Legacy evidence is immutable.');
check((await call('/reports/president?reportId='+draft)).status===403,'Draft is private.');
const next=(await call('/reports/president?scope=sector&id='+sector+'&type=weekly&day=2026-11-09')).data;
check(next.mode==='live'&&next.results.length===0,'Another week does not show old results.');
const earlier=(await call('/reports/president?scope=project&id='+project+'&type=weekly&day=2026-10-26')).data;
check(earlier.results.length===1&&earlier.results[0].text.includes('van izabranog'),'Project work entries are filtered to the selected week.');
const company=(await call('/reports/president?scope=company&type=weekly&day=2026-11-08')).data;
check(company.summaries.length===2&&company.summaries.every(row=>row.link.startsWith('/reports/')),'Company includes only matching published sector summaries.');
const options=(await call('/reports/president/options?scope=project')).data;
check(options.items.length===20&&options.total>20&&!options.items.some(row=>row._id===project),'Selector is genuinely paginated.');
const selected=(await call('/reports/president?scope=project&id='+project+'&type=weekly&day=2026-11-08')).data;
check(selected.context.name==='ZZ — projekat van prve stranice','Selected project remains named outside the first option page.');
const literal=(await call('/reports/president/options?scope=project&q='+encodeURIComponent('.*'))).data;
check(literal.total===0,'Search is literal.');
check((await call('/reports/president/options?scope=employee&q='+encodeURIComponent('Test Zaposleni'))).data.total===1,'Full employee names are searchable.');
for(const role of ['employee','manager'])for(const path of ['/reports/president?scope=company','/reports/president/options?scope=project','/dashboard/president/attention?tab=comments'])check((await call(path,{role})).status===403,'President endpoint denies '+role);
for(const query of ['scope=unknown','type=monthly','day=2026-02-30'])check((await call('/reports/president?'+query)).status===422,'Invalid report context rejected.');
const overview=(await call('/dashboard/president')).data,attention=(await call('/dashboard/president/attention?limit=50')).data;
check(overview.stats.attention===attention.total&&attention.stats.all===attention.total,'Home and attention totals agree.');
for(const row of overview.sectors.items)check((await call('/dashboard/president/attention?sectorId='+row._id)).data.total===row.attentionCount,'Sector counter agrees with scoped attention.');
for(const tab of ['approvals','deadlines','comments','ideas']){
 const response=(await call('/dashboard/president/attention?tab='+tab+'&limit=50')).data;
 check(response.total===attention.stats[tab],'Filter count '+tab);
 for(const item of response.items)check((await call(item.link.split('#')[0])).status===200,'Actual attention destination '+item.kind);
}
const replies=(await call('/dashboard/president/attention?tab=comments')).data;
check(replies.total===2,'Both answered instructions are present.');
const pending=replies.items.find(item=>item.sectorId===sector);
check(pending.link==='/sectors/'+sector+'?commentId='+pending.id+'#president-sector-thread','Sector response links to its own conversation and exact comment.');
const before=attention.total;
check((await call('/comments/'+pending.id+'/resolve',{method:'PATCH'})).status===200,'President resolves own answered instruction.');
const after=(await call('/dashboard/president/attention')).data;
check(after.total===before-1&&after.stats.comments===1,'Resolved response leaves the same shared total.');
check((await call('/dashboard/president')).data.stats.attention===after.total,'Home refresh agrees after resolution.');
check((await call('/dashboard/president/attention?tab=fake')).status===422,'Unknown attention filter rejected.');
console.log('PASS '+checks+' president report/attention checks; only isolated fixture data used.');
