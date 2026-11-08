// Explicit, read-only business check. Login creates one session, which is revoked in finally.
import 'dotenv/config';
import fs from 'node:fs/promises';
if(process.env.ZEPTER_PRESIDENT_READ_CHECK!=='1')throw Error('Enable ZEPTER_PRESIDENT_READ_CHECK=1 explicitly.');
const url=new URL((await fs.readFile(new URL('../../private-access/predsednik-link.txt',import.meta.url),'utf8')).trim());
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.origin!==process.env.CLIENT_ORIGIN)throw Error('Local client origin is not confirmed.');
const base='http://127.0.0.1:'+(process.env.PORT||4000)+'/api';
let cookie,token,checks=0;
const check=(condition,message)=>{if(!condition)throw Error(message);checks++;};
async function get(path){
 const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});
 check(response.ok,'Read request failed with status '+response.status);
 return response.json();
}
try{
 const response=await fetch(base+'/auth/president-link',{method:'POST',headers:{'Content-Type':'application/json',Origin:url.origin},body:JSON.stringify({key:url.hash.slice(1)}),signal:AbortSignal.timeout(10000)});
 cookie=response.headers.get('set-cookie')?.split(';')[0];
 check(response.ok,'Personal access failed with status '+response.status);
 const auth=await response.json();token=auth.accessToken;check(auth.user.role==='president'&&!!token&&!!cookie,'President session was not confirmed.');
 const home=await get('/dashboard/president'),projects=await get('/projects?activeOnly=1');
 check(home.stats.activeProjects===projects.total,'Active project count differs from its destination.');
 const attention=await get('/dashboard/president/attention');check(home.stats.attention===attention.total&&attention.stats.all===attention.total,'Attention totals differ.');
 for(const tab of ['approvals','deadlines','comments','ideas']){const filtered=await get('/dashboard/president/attention?tab='+tab);check(filtered.total===attention.stats[tab],'Attention category total differs.');}
 const ideas=await get('/ideas/president');
 check(ideas.items.every(idea=>['forwarded','approved','rejected'].includes(idea.status)),'A private unforwarded idea escaped.');
 check(ideas.stats.total===ideas.total,'Idea totals differ.');
 if(ideas.items[0]){
  const item=ideas.items[0],detail=await get('/ideas/'+item._id),comments=await get('/comments?targetType=idea&targetId='+item._id);
  check(detail.idea.status===item.status,'Idea state differs from its card.');
  check(comments.total===item.commentCount,'Idea comment count differs.');
 }
 if(projects.items[0]){
  const project=projects.items[0],detail=await get('/projects/'+project._id),activities=await get('/activities/project/'+project._id);
  check(detail.project._id===project._id&&activities.items.every(a=>String(a.project?._id||a.project)===project._id),'Project/activity context differs.');
 }
 for(const sector of home.sectors.items){
  const detail=await get('/sectors/'+sector._id+'/president'),list=await get('/sectors/'+sector._id+'/president/projects');
  check(detail.stats.attention===sector.attentionCount,'Sector attention differs from the company feed.');
  check(list.items.every(p=>String(p.sector)===sector._id),'A project escaped its sector.');
 }
 for(const type of ['daily','weekly']){
  const company=await get('/reports/preview?scope=company&type='+type);check(company.report.scope==='company'&&company.report.type===type,'Company report context differs.');
  const id=home.sectors.items[0]?._id;if(id){const sector=await get('/reports/preview?scope=sector&id='+id+'&type='+type);check(sector.report.targetId===id&&sector.report.type===type,'Sector report context differs.');}
  const reader=await get('/reports/president?scope=company&type='+type);check(reader.context.scope==='company'&&reader.context.type===type,'Company reader context differs.');
  if(id){const selected=await get('/reports/president?scope=sector&id='+id+'&type='+type);check(String(selected.context.targetId)===id&&selected.context.type===type,'Sector reader context differs.');}
  if(projects.items[0]){const selected=await get('/reports/president?scope=project&id='+projects.items[0]._id+'&type='+type);check(selected.context.targetId===projects.items[0]._id&&selected.summaries.length===0,'Project reader context differs.');}
 }
 const published=await get('/reports?limit=1');if(published.items[0]){const saved=await get('/reports/president?reportId='+published.items[0]._id);check(saved.mode==='published'&&saved.reportId===published.items[0]._id,'Saved reader did not return the published report.');}
 const targets=await get('/reports/president/options?scope=employee');check(targets.items.every(row=>Object.keys(row).every(key=>['_id','name'].includes(key))),'Target options exposed extra account fields.');
 console.log('PASS '+checks+' live presidential read/auth checks. No business data changed; no credential values printed.');
}finally{
 if(cookie){
  const logout=await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:url.origin},signal:AbortSignal.timeout(10000)});
  if(!logout.ok)throw Error('Test session logout was not confirmed.');
  console.log('Live test session logged out.');
 }
}
