import crypto from 'node:crypto';
import {companySectors} from '../data/company-catalog.js';
import {canonicalLocalEmail} from '../lib/account-email.js';
export {canonicalLocalEmail} from '../lib/account-email.js';

const id=(namespace,type,key)=>crypto.createHash('sha256').update(`${namespace}:${type}:${key}`).digest('hex').slice(0,24);
export const legacySeedId=(type,key)=>id('zepter-demo-v1',type,key);
export const companySeedId=(type,key)=>id('zepter-company-v2',type,key);
const legacyTitles={MKT:['Redizajn web sajta','Oktobarska kampanja ZepterClub','E-commerce katalog'],IT:['Migracija CMS platforme','Management Overview PWA','Automatizacija BI izveštaja'],SALES:['CRM segmentacija kupaca','Program saradnje sa partnerima','Praćenje follow-up aktivnosti'],FIN:['Mesečni kontroling izveštaj','Budžet narednog kvartala','Elektronska obrada faktura'],LOG:['Praćenje statusa zaliha','Optimizacija rokova isporuke','Digitalne otpremnice']};
export function cleanCompanyText(value){
 if(typeof value==='string')return canonicalLocalEmail(value.replace(/DEMO\s*\|\s*/gi,'').replace(/Demo Predsednik/g,'Philip Zepter').replace(/Demo Administrator/g,'Administrator Zepter').replace(/Demo Kandidat/g,'Kandidat Zepter'));
 if(value instanceof Date||value?._bsontype==='ObjectId'||Buffer.isBuffer(value))return value;
 if(Array.isArray(value))return value.map(cleanCompanyText);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cleanCompanyText(item)]));
 return value;
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fields={Project:['title','description'],Activity:['title','description','actualWork','nextStep','blockers'],Idea:['title','description','benefit','reviewNote'],Report:['results','problems','nextSteps','generated'],WorkLog:['done','nextSteps','blockers'],Comment:['body'],Attachment:['originalName'],Assignment:['title','description','response'],DecisionRequest:['title','description','decision'],Notification:['title','body']};
export const companySeedProjection={User:'_id firstName lastName email role updatedAt',Sector:'_id name code description active manager updatedAt',...Object.fromEntries(Object.entries(fields).map(([name,keys])=>[name,'_id updatedAt '+keys.join(' ')]))};
companySeedProjection.Project+=' status archived';

// The plan contains only changed display fields and new unassigned plans. It
// never contains passwords, role assignments, link/session keys or audit edits.
export function planCompanySeed(snapshot){
 const operations=[],sectorIds=new Map(),projects=snapshot.Project||[],activities=snapshot.Activity||[];
 function patch(model,row,after){
  const set=Object.fromEntries(Object.entries(after).filter(([key,value])=>!equal(row[key],value)));
  if(!Object.keys(set).length)return;
  operations.push({model,id:String(row._id),kind:'update',before:Object.fromEntries(Object.keys(set).map(key=>[key,row[key]])),after:set,updatedAt:row.updatedAt||null});
 }
 for(const sector of companySectors){
  const matches=(snapshot.Sector||[]).filter(row=>row.code===sector.code||row.code===sector.legacy||cleanCompanyText(row.name).toLocaleLowerCase('sr-Latn')===sector.name.toLocaleLowerCase('sr-Latn'));
  if(matches.length>1)throw Error('Postoje dva zapisa za isti sektor. Potrebno je ručno usaglašavanje bez brisanja.');
  const row=matches[0],sid=row?String(row._id):companySeedId('sector',sector.code);sectorIds.set(sector.code,sid);
  if(row)patch('Sector',row,{name:sector.name,code:sector.code,description:!row.description||/^Testni sektor:/.test(row.description)?sector.description:cleanCompanyText(row.description)});
  else operations.push({model:'Sector',id:sid,kind:'insert',after:{_id:sid,name:sector.name,code:sector.code,description:sector.description,active:true}});
 }
 const users=snapshot.User||[],emails=new Map();
 for(const user of users){
  const next=canonicalLocalEmail(user.email)?.toLowerCase();
  if(emails.has(next)&&emails.get(next)!==String(user._id))throw Error('Nova lokalna mejl adresa je već zauzeta. Nalozi nisu spojeni niti prepisani.');
  emails.set(next,String(user._id));
  const change={email:next};
  if(user.firstName==='Demo'&&user.role==='president'){change.firstName='Philip';change.lastName='Zepter';}
  else if(user.firstName==='Demo'&&user.role==='admin'){change.firstName='Administrator';change.lastName='Zepter';}
  else if(user.firstName==='Demo'){change.firstName='Kandidat';change.lastName=user.lastName==='Kandidat'?'Zepter':user.lastName;}
  patch('User',user,change);
 }
 for(const [model,keys]of Object.entries(fields))for(const row of snapshot[model]||[]){
  const after={};for(const key of keys)if(row[key]!==undefined)after[key]=cleanCompanyText(row[key]);
  if(model==='Project')for(const sector of companySectors.filter(item=>item.legacy)){
   sector.projects.forEach((project,index)=>{
    if(String(row._id)===legacySeedId('project',`${sector.legacy}:p${index}`)&&row.title==='DEMO | '+legacyTitles[sector.code][index])after.title=project.title;
   });
  }
  patch(model,row,after);
 }
 // No invented employees or completed work: missing catalog projects start at
 // zero, with no owner or assignees, until the administrator assigns real staff.
 for(const sector of companySectors)sector.projects.forEach((project,index)=>{
  const pid=sector.legacy?legacySeedId('project',`${sector.legacy}:p${index}`):companySeedId('project',`${sector.code}:${index}`);
  const existing=projects.find(row=>String(row._id)===pid);
  if(!existing)operations.push({model:'Project',id:pid,kind:'insert',after:{_id:pid,sector:sectorIds.get(sector.code),title:project.title,description:project.description,status:'planned',priority:'medium',progress:0,members:[],archived:false}});
  if(!existing||!sector.legacy&&!existing.archived&&!['completed','cancelled'].includes(existing.status))project.tasks.forEach((title,task)=>{
   const aid=companySeedId('activity',`${pid}:${task}`);
   if(!activities.some(row=>String(row._id)===aid))operations.push({model:'Activity',id:aid,kind:'insert',after:{_id:aid,sector:sectorIds.get(sector.code),project:pid,title,description:'Planirana aktivnost u okviru projekta „'+project.title+'“.',assignees:[],status:'planned',progress:0,priority:'medium'}});
  });
 });
 return operations;
}

export async function applyCompanySeed(operations,models){
 const result={inserted:0,updated:0};
 for(const operation of operations){
  const Model=models[operation.model];
  if(operation.kind==='insert'){
   if(await Model.exists({_id:operation.id}))throw Error('Plan je zastareo: zapis je u međuvremenu dodat. Ponovite pregled.');
   await Model.create(operation.after);result.inserted++;
  }else{
   const filter={_id:operation.id,updatedAt:operation.updatedAt||{$exists:false}};
   const written=await Model.updateOne(filter,{$set:operation.after},{runValidators:true,timestamps:false});
   if(written.matchedCount!==1)throw Error('Plan je zastareo: zapis je promenjen tokom primene. Preostale izmene nisu nastavljene; sačuvana je rezervna kopija.');
   result.updated++;
  }
 }
 return result;
}
