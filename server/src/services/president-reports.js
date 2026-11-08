import {Report,Sector,Project,User} from '../models/index.js';
import {generateReport,authorizeReport} from './reports.js';
import {presidentOnly} from './president.js';
import {belgradeDay,periodRange,requireId,safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';

const ref=value=>String(value?._id||value||'');
const number=value=>Number.isFinite(value)?value:null;
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const rows=value=>Array.isArray(value)?value.map(row=>({text:row.text||'',day:row.day,employee:row.employee,project:row.project,activity:row.activity,projectId:row.projectId,activityId:row.activityId})):[];
const activities=value=>Array.isArray(value)?value.map(row=>({id:row.id,title:row.title,projectId:row.projectId,project:row.project,progress:row.progress,dueDate:row.dueDate})):null;
export function reportView(generated,context,{saved=null,summaries=[]}={}){
 const snapshot=generated?.activitySnapshot,completed=activities(snapshot?.completed),late=activities(snapshot?.late),blockers=rows(generated?.blockers);
 return {context,mode:saved?'published':'live',asOf:snapshot?.asOf||generated?.generatedAt||saved?.publishedAt||null,reportId:saved?._id||null,
  metrics:{completedActivities:completed?.length??number(generated?.stats?.completedActivities),lateActivities:late?.length??number(generated?.stats?.lateActivities),problemReports:blockers.length+summaries.filter(r=>r.problems?.trim()).length,workEntries:number(generated?.stats?.workEntries)},
  results:rows(generated?.completed),completedActivities:completed,lateActivities:late,blockers,nextSteps:rows(generated?.nextSteps),summaries};
}
async function namedTarget(scope,id,allowMissing=false){
 if(scope==='company')return {name:'Cela kompanija',targetId:null};
 requireId(id);
 const Model=scope==='sector'?Sector:scope==='project'?Project:User;
 const target=await Model.findById(id).select('_id name title firstName lastName sector').lean();
 if(!target){if(allowMissing)return {targetId:id,name:'Sektor nije dostupan'};fail(404,'Izabrani '+(scope==='sector'?'sektor':scope==='project'?'projekat':'zaposleni')+' nije pronađen.');}
 return {targetId:target._id,name:scope==='sector'?target.name:scope==='project'?target.title:[target.firstName,target.lastName].filter(Boolean).join(' '),...(scope==='project'?{sectorId:ref(target.sector)}:{})};
}
const summary=(report,sectorName)=>({id:report._id,sectorId:ref(report.sector),sectorName:sectorName||report.sector?.name||'Sektor nije dostupan',results:report.results||'',problems:report.problems||'',nextSteps:report.nextSteps||'',link:'/reports/'+report._id});
export async function presidentReport(user,query={}){
 presidentOnly(user);
 if(query.reportId){
  const saved=await Report.findById(requireId(query.reportId)).lean();
  if(!saved)fail(404,'Izveštaj nije pronađen.');if(saved.status!=='published')fail(403,'Izveštaj još nije objavljen.');
  const target=await namedTarget('sector',ref(saved.sector),true);
  return reportView(saved.generated,{scope:'sector',...target,type:saved.type,periodStart:saved.periodStart,periodEnd:saved.periodEnd},{saved,summaries:[summary(saved,target.name)]});
 }
 const {scope='company',type='daily',day=belgradeDay()}=query;
 if(!['company','sector','project','employee'].includes(scope))fail(422,'Nepoznat nivo izveštaja.');
 const {start,end}=periodRange(type,day);
 if(scope!=='company')requireId(query.id);
 await authorizeReport(user,scope,query.id);
 const target=await namedTarget(scope,query.id),context={scope,...target,type,periodStart:start,periodEnd:end};
 const published=['company','sector'].includes(scope)?await Report.find({status:'published',type,periodStart:start,periodEnd:end,...(scope==='sector'?{sector:query.id}:{})}).populate('sector','name').sort({publishedAt:-1,_id:1}).lean():[];
 if(scope==='sector'&&published.length)return reportView(published[0].generated,context,{saved:published[0],summaries:[summary(published[0],target.name)]});
 const generated=await generateReport({scope,id:query.id,type,day});
 return reportView(generated,context,{summaries:published.map(r=>summary(r))});
}
export async function presidentReportOptions(user,query={}){
 presidentOnly(user);const scope=query.scope;
 if(!['sector','project','employee'].includes(scope))fail(422,'Izaberite sektor, projekat ili zaposlenog.');
 if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>160))fail(422,'Pretraga može imati najviše 160 znakova.');
 const Model=scope==='sector'?Sector:scope==='project'?Project:User,field=scope==='sector'?'name':scope==='project'?'title':'firstName';
 const filter=scope==='employee'?{approval:'approved',role:{$in:['employee','manager']}}:scope==='project'?{archived:false}:{};
 if(query.q?.trim()){
  const regex={$regex:escape(query.q.trim()),$options:'i'};
  if(scope==='employee'){const tokens=query.q.trim().split(/\s+/).map(word=>({$or:[{firstName:{$regex:escape(word),$options:'i'}},{lastName:{$regex:escape(word),$options:'i'}}]}));Object.assign(filter,tokens.length===1?tokens[0]:{$and:tokens});}
  else filter[field]=regex;
 }
 const {page,limit,skip}=safePage({...query,limit:20});
 const [items,total]=await Promise.all([Model.find(filter).select('_id name title firstName lastName').sort({[field]:1,_id:1}).skip(skip).limit(limit).lean(),Model.countDocuments(filter)]);
 return {items:items.map(item=>({_id:item._id,name:scope==='sector'?item.name:scope==='project'?item.title:[item.firstName,item.lastName].filter(Boolean).join(' ')})),total,page,limit};
}
