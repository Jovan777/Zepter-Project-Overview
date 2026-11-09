import {Types} from 'mongoose';
import {Project,Activity,Sector,Comment,Attachment,Assignment,DecisionRequest,Idea} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {requireId,safePage,belgradeDay} from '../lib/utils.js';
import {managerDayStart} from './manager.js';

const active=['active','at_risk','on_hold'],current=['planned',...active];
const ref=value=>String(value?._id||value);
const oid=id=>new Types.ObjectId(ref(id));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function presidentOnly(user){if(user.role!=='president')fail(403,'Pregled je namenjen predsedniku.');}
async function answeredInstructions(user,sectorId){
 const candidates=await Comment.find({author:user._id,kind:'instruction',responseStatus:'answered'}).select('_id targetType targetId').lean(),targets=new Map(),parents=new Map();
 await Promise.all([['sector',Sector],['project',Project],['activity',Activity],['idea',Idea],['assignment',Assignment],['request',DecisionRequest]].map(async([type,Model])=>{
  const ids=candidates.filter(c=>c.targetType===type).map(c=>c.targetId);if(!ids.length)return;
  const filter={_id:{$in:ids},...(sectorId?(type==='sector'?{_id:oid(sectorId)}:{sector:oid(sectorId)}):{}),...(type==='idea'?{status:{$in:['forwarded','approved','rejected']}}:{})};
  const read=Model.find(filter).select('_id title name sector');if(type!=='sector')read.populate('sector','name');const rows=await read.lean();
  for(const row of rows)targets.set(type+':'+ref(row),{title:row.title||row.name,sectorId:type==='sector'?row._id:row.sector?._id||row.sector,sectorName:type==='sector'?row.name:row.sector?.name||'Sektor nije dostupan'});
 }));
 for(const c of candidates){const target=targets.get(c.targetType+':'+ref(c.targetId));if(target)parents.set(ref(c),target);}
 return {kind:'comment',Model:Comment,filter:{author:user._id,kind:'instruction',responseStatus:'answered',_id:{$in:[...parents.keys()]}},order:{updatedAt:1,_id:1},parents};
}
async function signals(user,sectorId,now){
 presidentOnly(user);const today=managerDayStart(now),scope=sectorId?{sector:oid(requireId(sectorId))}:{};
 const open={...scope,archived:false,status:{$in:current}};
 const risk={...open,$or:[{status:'at_risk'},{dueDate:{$lt:today}}]};
 const [openIds,riskIds,instructions]=await Promise.all([Project.distinct('_id',open),Project.distinct('_id',risk),answeredInstructions(user,sectorId)]);
 // One project-level warning takes precedence over its delayed activities.
 return [
  {kind:'request',Model:DecisionRequest,filter:{...scope,status:'open'},path:'requests',order:{createdAt:1,_id:1}},
  {kind:'assignment',Model:Assignment,filter:{...scope,status:'blocked'},path:'assignments',order:{dueDate:1,_id:1}},
  {kind:'project',Model:Project,filter:risk,path:'projects',order:{dueDate:1,_id:1}},
  {kind:'activity',Model:Activity,filter:{...scope,status:{$ne:'completed'},$and:[{project:{$in:openIds}},{project:{$nin:riskIds}}],$or:[{status:'blocked'},{dueDate:{$lt:today}}]},path:'activities',order:{dueDate:1,_id:1}},
  {kind:'idea',Model:Idea,filter:{...scope,status:'forwarded'},path:'ideas',order:{forwardedAt:1,createdAt:1,_id:1}},
  instructions
 ];
}
const categories=['all','approvals','deadlines','comments','ideas'];
function forCategory(groups,tab,today){
 if(tab==='all')return groups;
 if(tab==='comments'||tab==='ideas')return groups.filter(g=>g.kind===(tab==='comments'?'comment':'idea'));
 if(tab==='approvals')return groups.filter(g=>g.kind==='request').map(g=>({...g,filter:{$and:[g.filter,{type:'approval'}]}}));
 return groups.filter(g=>['project','activity'].includes(g.kind)).map(g=>g.kind==='activity'?{...g,filter:{$and:[g.filter,{dueDate:{$lt:today}}]}}:g);
}
const defaultCount=group=>group.Model.countDocuments(group.filter);
async function attentionFrom(groups,query={},now=new Date(),count=defaultCount){
 const {page,limit,skip}=safePage(query);
 const counts=await Promise.all(groups.map(count));
 let offset=skip,remaining=limit;const selected=[];
 for(let i=0;i<groups.length&&remaining;i++){
  if(offset>=counts[i]){offset-=counts[i];continue;}
  const group=groups[i],take=Math.min(remaining,counts[i]-offset);
  const read=group.Model.find(group.filter).select('title description blockers body targetType targetId type status dueDate sector createdAt updatedAt');if(group.kind!=='comment')read.populate('sector','name');
  selected.push(read.sort(group.order).skip(offset).limit(take).lean().then(rows=>rows.map(row=>group.kind==='comment'?{
   key:'comment:'+ref(row),id:row._id,kind:'comment',...group.parents.get(ref(row)),title:group.parents.get(ref(row))?.title||'Odgovor na instrukciju',status:'answered',description:'Stigao je odgovor. Vaša instrukcija: '+(row.body||'').slice(0,130),label:'Čeka pregled',timestamp:row.updatedAt||row.createdAt,
   link:'/'+({sector:'sectors',project:'projects',activity:'activities',idea:'ideas',assignment:'assignments',request:'requests'})[row.targetType]+'/'+row.targetId+'?commentId='+row._id+(({sector:'#president-sector-thread',project:'#president-project-comments',activity:'#president-activity-comments',idea:'#president-idea-comments'})[row.targetType]||'')
  }:{
   key:group.kind+':'+ref(row),id:row._id,kind:group.kind,title:row.title,sectorId:row.sector?._id||row.sector,sectorName:row.sector?.name||'Sektor nije dostupan',status:row.status,dueDate:row.dueDate,
   description:(row.blockers||row.description||(group.kind==='project'?'Proverite ugrožen rok i napredak projekta.':'Potreban je pregled predsednika.')).slice(0,180),timestamp:row.updatedAt||row.createdAt,
   label:group.kind==='request'?({question:'Pitanje',approval:'Odobrenje',problem:'Problem'})[row.type]||'Zahtev':group.kind==='assignment'?'Blokirano':group.kind==='activity'?(row.dueDate&&new Date(row.dueDate)<managerDayStart(now)?'Kasni':'Blokirano'):group.kind==='idea'?'Ideja':'Rok ugrožen',link:'/'+group.path+'/'+row._id
  })));
  remaining-=take;offset=0;
 }
 return {items:(await Promise.all(selected)).flat(),total:counts.reduce((a,b)=>a+b,0),page,limit,today:belgradeDay(now)};
}
export async function presidentAttention(user,query={},now=new Date()){
 presidentOnly(user);const tab=query.tab||'all';if(!categories.includes(tab))fail(422,'Nepoznat filter važnih pitanja.');
 if(query.sectorId&&!await Sector.exists({_id:requireId(query.sectorId)}))fail(404,'Sektor nije pronađen.');
 const groups=await signals(user,query.sectorId,now);
 const pending=new Map(),count=group=>{const key=group.kind+':'+JSON.stringify(group.filter);if(!pending.has(key))pending.set(key,Promise.resolve(defaultCount(group)));return pending.get(key);};
 const names=['all','approvals','deadlines','comments','ideas'],stats={};
 await Promise.all(names.map(async name=>{const values=await Promise.all(forCategory(groups,name,managerDayStart(now)).map(count));stats[name]=values.reduce((a,b)=>a+b,0);}));
 return {...await attentionFrom(forCategory(groups,tab,managerDayStart(now)),query,now,count),stats,tab,sectorId:query.sectorId||null};
}
export async function presidentOverview(user,query={},now=new Date()){
 presidentOnly(user);
 if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>160))fail(422,'Pretraga može imati najviše 160 znakova.');
 const pagination=safePage({page:query.sectorPage,limit:20}),filter=query.q?.trim()?{name:{$regex:escape(query.q.trim()),$options:'i'}}:{};
 const [groups,rows,total,activeProjects]=await Promise.all([
  signals(user,null,now),Sector.find(filter).select('name active description').sort({active:-1,name:1,_id:1}).skip(pagination.skip).limit(pagination.limit).lean(),Sector.countDocuments(filter),Project.countDocuments({archived:false,status:{$in:active}})
 ]);
 // One grouped result supplies both global totals and the visible sector rows.
 // Sector search/pagination must not narrow the company's attention total.
 const counts=await Promise.all(groups.map(g=>g.kind==='comment'?Promise.resolve([...g.parents.values()].map(row=>({_id:row.sectorId,count:1}))):g.Model.aggregate([{$match:g.filter},{$group:{_id:'$sector',count:{$sum:1}}}])));
 const totals=new Map(groups.map((group,index)=>[group,counts[index].reduce((sum,row)=>sum+row.count,0)]));
 const attention=await attentionFrom(groups,{page:query.attentionPage,limit:4},now,group=>Promise.resolve(totals.get(group)));
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
