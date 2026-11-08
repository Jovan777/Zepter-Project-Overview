import {Types} from 'mongoose';
import {Project,Activity,Sector,Comment,Attachment,Assignment,DecisionRequest} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {requireId,safePage,belgradeDay} from '../lib/utils.js';
import {managerDayStart} from './manager.js';

const active=['active','at_risk','on_hold'],current=['planned',...active];
const ref=value=>String(value?._id||value);
const oid=id=>new Types.ObjectId(ref(id));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function presidentOnly(user){if(user.role!=='president')fail(403,'Pregled je namenjen predsedniku.');}
async function signals(user,sectorId,now){
 presidentOnly(user);const today=managerDayStart(now),scope=sectorId?{sector:oid(requireId(sectorId))}:{};
 const open={...scope,archived:false,status:{$in:current}};
 const risk={...open,$or:[{status:'at_risk'},{dueDate:{$lt:today}}]};
 const [openIds,riskIds]=await Promise.all([Project.distinct('_id',open),Project.distinct('_id',risk)]);
 // One project-level warning takes precedence over its delayed activities.
 return [
  {kind:'request',Model:DecisionRequest,filter:{...scope,status:'open'},path:'requests',order:{createdAt:1,_id:1}},
  {kind:'assignment',Model:Assignment,filter:{...scope,status:'blocked'},path:'assignments',order:{dueDate:1,_id:1}},
  {kind:'project',Model:Project,filter:risk,path:'projects',order:{dueDate:1,_id:1}},
  {kind:'activity',Model:Activity,filter:{...scope,status:{$ne:'completed'},$and:[{project:{$in:openIds}},{project:{$nin:riskIds}}],$or:[{status:'blocked'},{dueDate:{$lt:today}}]},path:'activities',order:{dueDate:1,_id:1}}
 ];
}
async function attentionFrom(groups,query={},now=new Date()){
 const {page,limit,skip}=safePage(query);
 const counts=await Promise.all(groups.map(g=>g.Model.countDocuments(g.filter)));
 let offset=skip,remaining=limit;const selected=[];
 for(let i=0;i<groups.length&&remaining;i++){
  if(offset>=counts[i]){offset-=counts[i];continue;}
  const group=groups[i],take=Math.min(remaining,counts[i]-offset);
  selected.push(group.Model.find(group.filter).select('title description blockers type status dueDate sector').populate('sector','name').sort(group.order).skip(offset).limit(take).lean().then(rows=>rows.map(row=>({
   key:group.kind+':'+ref(row),id:row._id,kind:group.kind,title:row.title,sectorId:row.sector?._id||row.sector,sectorName:row.sector?.name||'Sektor nije dostupan',status:row.status,dueDate:row.dueDate,
   description:(row.blockers||row.description||(group.kind==='project'?'Proverite ugrožen rok i napredak projekta.':'Potreban je pregled predsednika.')).slice(0,180),
   label:group.kind==='request'?({question:'Pitanje',approval:'Odobrenje',problem:'Problem'})[row.type]||'Zahtev':group.kind==='assignment'?'Blokirano':group.kind==='activity'?'Aktivnost':'Rok',link:'/'+group.path+'/'+row._id
  }))));
  remaining-=take;offset=0;
 }
 return {items:(await Promise.all(selected)).flat(),total:counts.reduce((a,b)=>a+b,0),page,limit,today:belgradeDay(now)};
}
export async function presidentAttention(user,query={},now=new Date()){
 const groups=await signals(user,query.sectorId,now);
 return attentionFrom(groups,query,now);
}
export async function presidentOverview(user,query={},now=new Date()){
 presidentOnly(user);
 if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>160))fail(422,'Pretraga može imati najviše 160 znakova.');
 const pagination=safePage({page:query.sectorPage,limit:20}),filter=query.q?.trim()?{name:{$regex:escape(query.q.trim()),$options:'i'}}:{};
 const [groups,rows,total,activeProjects]=await Promise.all([
  signals(user,null,now),Sector.find(filter).select('name active description').sort({active:-1,name:1,_id:1}).skip(pagination.skip).limit(pagination.limit).lean(),Sector.countDocuments(filter),Project.countDocuments({archived:false,status:{$in:active}})
 ]);
 const sectorIds=rows.map(row=>row._id),counts=await Promise.all(groups.map(g=>g.Model.aggregate([{$match:{...g.filter,sector:{$in:sectorIds}}},{$group:{_id:'$sector',count:{$sum:1}}}])));
 const attention=await attentionFrom(groups,{page:query.attentionPage,limit:4},now);
 return {stats:{activeProjects,attention:attention.total},attention,sectors:{items:rows.map(row=>({...row,attentionCount:counts.flat().filter(x=>ref(x._id)===ref(row)).reduce((n,x)=>n+x.count,0)})),total,page:pagination.page,limit:pagination.limit},today:belgradeDay(now)};
}
export async function presidentSector(user,id,now=new Date()){
 presidentOnly(user);requireId(id);const sector=await Sector.findById(id).select('name description active manager').populate('manager','firstName lastName jobTitle').lean();
 if(!sector)fail(404,'Sektor nije pronađen.');
 const scope={sector:oid(id),archived:false},[activeProjects,average,attention]=await Promise.all([
  Project.countDocuments({...scope,status:{$in:active}}),
  Project.aggregate([{$match:{...scope,status:{$in:current}}},{$group:{_id:null,avgProgress:{$avg:'$progress'}}}]),
  presidentAttention(user,{sectorId:id,limit:4},now)
 ]);
 return {sector,stats:{activeProjects,attention:attention.total,avgProgress:average.length?Math.round(average[0].avgProgress||0):null},attention};
}
export async function presidentSectorProjects(user,id,query={},now=new Date()){
 presidentOnly(user);requireId(id);
 if(!await Sector.exists({_id:id}))fail(404,'Sektor nije pronađen.');
 const tab=query.tab||'current';if(!['current','all'].includes(tab))fail(422,'Nepoznat prikaz projekata.');
 if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>160))fail(422,'Pretraga može imati najviše 160 znakova.');
 const filter={sector:oid(id),archived:false,...(tab==='current'?{status:{$in:current}}:{})};
 if(query.q?.trim())filter.title={$regex:escape(query.q.trim()),$options:'i'};
 const {page,limit,skip}=safePage({...query,limit:8}),today=managerDayStart(now);
 const [rows,total]=await Promise.all([Project.find(filter).select('title status progress dueDate updatedAt sector owner members').populate('owner','firstName lastName').sort({updatedAt:-1,_id:-1}).skip(skip).limit(limit).lean(),Project.countDocuments(filter)]);
 const ids=rows.map(row=>row._id),[comments,images,reviews,problems]=await Promise.all([
  Comment.aggregate([{$match:{targetType:'project',targetId:{$in:ids}}},{$group:{_id:'$targetId',count:{$sum:1}}}]),
  Attachment.aggregate([{$match:{targetType:'project',targetId:{$in:ids},mime:{$in:['image/png','image/jpeg','image/webp']}}},{$sort:{createdAt:-1,_id:-1}},{$group:{_id:'$targetId',thumbnailId:{$first:'$_id'}}}]),
  Activity.distinct('project',{project:{$in:ids},status:'review'}),Activity.distinct('project',{project:{$in:ids},status:{$ne:'completed'},$or:[{status:'blocked'},{dueDate:{$lt:today}}]})
 ]);
 return {items:rows.map(({members,...row})=>({...row,memberCount:members?.length||0,commentCount:comments.find(x=>ref(x._id)===ref(row))?.count||0,thumbnailId:images.find(x=>ref(x._id)===ref(row))?.thumbnailId||null,hasReview:reviews.some(x=>ref(x)===ref(row)),onTrack:row.status==='active'&&(!row.dueDate||new Date(row.dueDate)>=today)&&!problems.some(x=>ref(x)===ref(row))})),page,limit,total};
}
