import {Comment,Sector,Project,Activity,Idea,Assignment,DecisionRequest} from '../models/index.js';
import {presidentOnly} from './president.js';
import {safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';

const ref=value=>String(value?._id||value||'');
const types={sector:{Model:Sector,path:'sectors',label:'Sektor',anchor:'president-sector-thread'},project:{Model:Project,path:'projects',label:'Projekat',anchor:'president-project-comments'},activity:{Model:Activity,path:'activities',label:'Aktivnost',anchor:'president-activity-comments'},idea:{Model:Idea,path:'ideas',label:'Ideja',anchor:'president-idea-comments'},assignment:{Model:Assignment,path:'assignments',label:'Zaduženje'},request:{Model:DecisionRequest,path:'requests',label:'Zahtev'}};
const statuses=['all','open','answered','resolved','unavailable'];
const visibleIdeas=['forwarded','approved','rejected'];
const excerpt=(value,max=300)=>{const chars=Array.from(value||'');return chars.length>max?chars.slice(0,max).join('')+'…':value||'';};

// Read metadata in batches for consistent filters/counts. Full messages and names are loaded only for the current page.
export async function presidentComments(user,query={}){
 presidentOnly(user);
 const status=query.status||'all',targetType=query.targetType||'all';
 if(!statuses.includes(status))fail(422,'Nepoznat status komentara.');
 if(typeof targetType!=='string'||targetType!=='all'&&!Object.hasOwn(types,targetType))fail(422,'Nepoznat nivo komentara.');
 const {page,limit,skip}=safePage({...query,limit:8});
 const own=await Comment.find({author:user._id}).select('_id targetType targetId kind responseStatus createdAt').sort({createdAt:-1,_id:-1}).lean();
 const ids=own.map(c=>c._id),parents=new Map(own.map(c=>[ref(c),c]));
 const replies=ids.length?await Comment.find({parent:{$in:ids},author:{$ne:user._id}}).select('_id parent targetType targetId createdAt').sort({createdAt:-1,_id:-1}).lean():[];
 const latest=new Map();
 for(const reply of replies){const parent=parents.get(ref(reply.parent));if(parent&&reply.targetType===parent.targetType&&ref(reply.targetId)===ref(parent.targetId)&&!latest.has(ref(parent)))latest.set(ref(parent),reply._id);}
 const targets=new Map(),activityProjects=new Set();
 await Promise.all(Object.entries(types).map(async([type,{Model}])=>{
  const ids=own.filter(c=>c.targetType===type).map(c=>c.targetId);if(!ids.length)return;
  const rows=await Model.find({_id:{$in:ids}}).select('_id name title sector project status').lean();
  for(const row of rows){targets.set(type+':'+ref(row),row);if(type==='activity'&&row.project)activityProjects.add(ref(row.project));}
 }));
 const projects=activityProjects.size?await Project.find({_id:{$in:[...activityProjects]}}).select('_id title sector').lean():[];
 const projectMap=new Map(projects.map(p=>[ref(p),p]));
 const sectorIds=[...new Set([...targets.entries()].map(([key,row])=>key.startsWith('sector:')?ref(row):ref(row.sector)).filter(Boolean))];
 const sectors=sectorIds.length?await Sector.find({_id:{$in:sectorIds}}).select('_id name').lean():[],sectorMap=new Map(sectors.map(s=>[ref(s),s.name]));
 const history=own.flatMap(comment=>{
  const config=types[comment.targetType];if(!config)return [];
  const target=targets.get(comment.targetType+':'+ref(comment.targetId));
  // A previous comment is not permission to read an idea that is currently private.
  if(comment.targetType==='idea'&&target&&!visibleIdeas.includes(target.status))return [];
  const project=comment.targetType==='activity'?projectMap.get(ref(target?.project)):null;
  const available=!!target&&(comment.targetType!=='activity'||!!project),replyId=latest.get(ref(comment));
  const state=!available?'unavailable':comment.responseStatus==='resolved'?'resolved':replyId||comment.responseStatus==='answered'?'answered':'open';
  const sectorId=comment.targetType==='sector'?ref(target):ref(target?.sector);
  return [{...comment,state,replyId:available?replyId:null,target:{title:target?.title||target?.name||config.label+' više nije dostupan',sectorId:sectorId||null,sectorName:sectorMap.get(sectorId)||null,projectTitle:project?.title||null,available},
   link:available?'/'+config.path+'/'+comment.targetId+'?commentId='+comment._id+(config.anchor?'#'+config.anchor:''):null}];
 });
 const stats={total:history.length,open:0,answered:0,resolved:0,unavailable:0,byType:Object.fromEntries(Object.keys(types).map(type=>[type,0]))};
 for(const item of history){stats[item.state]++;stats.byType[item.targetType]++;}
 const filtered=history.filter(c=>(status==='all'||c.state===status)&&(targetType==='all'||c.targetType===targetType)),selected=filtered.slice(skip,skip+limit);
 const selectedIds=selected.map(c=>c._id),replyIds=selected.map(c=>c.replyId).filter(Boolean);
 const [messages,answers]=await Promise.all([
  selectedIds.length?Comment.find({_id:{$in:selectedIds},author:user._id}).select('_id body').lean():[],
  replyIds.length?Comment.find({_id:{$in:replyIds},author:{$ne:user._id}}).select('_id parent targetType targetId author body createdAt').populate('author','firstName lastName role').lean():[]
 ]);
 const bodies=new Map(messages.map(c=>[ref(c),c.body])),answerMap=new Map(answers.map(c=>[ref(c),c]));
 return {items:selected.map(item=>{
  const answer=answerMap.get(ref(item.replyId));
  const validReply=answer&&ref(answer.parent)===ref(item)&&answer.targetType===item.targetType&&ref(answer.targetId)===ref(item.targetId);
  return {_id:item._id,kind:item.kind,status:item.state,createdAt:item.createdAt,targetType:item.targetType,target:item.target,link:item.link,body:excerpt(bodies.get(ref(item))),
   reply:validReply?{_id:answer._id,body:excerpt(answer.body,230),createdAt:answer.createdAt,author:answer.author&&typeof answer.author==='object'?{_id:answer.author._id,firstName:answer.author.firstName,lastName:answer.author.lastName,role:answer.author.role}:null}:null};
 }),total:filtered.length,page,limit,stats,filters:{status,targetType}};
}
