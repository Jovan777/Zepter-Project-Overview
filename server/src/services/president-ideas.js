import {Idea,IdeaRead,Comment,Notification} from '../models/index.js';
import {presidentOnly} from './president.js';
import {ideaAccess} from '../lib/access.js';
import {safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';

export async function presidentIdeas(user,query={}){
 presidentOnly(user);
 const tab=query.tab||'all';if(!['all','new','review','approved','rejected'].includes(tab))fail(422,'Nepoznat prikaz ideja.');
 if(query.q!==undefined&&(typeof query.q!=='string'||query.q.length>160))fail(422,'Pretraga može imati najviše 160 znakova.');
 const [reads,comments]=await Promise.all([
  IdeaRead.distinct('idea',{user:user._id}),
  // A previous president comment also proves that this person has read the proposal.
  Comment.distinct('targetId',{targetType:'idea',author:user._id})
 ]);
 const seen=[...new Set([...reads,...comments].map(String))],base={status:{$in:['forwarded','approved','rejected']}};
 if(query.q?.trim()){
  const literal=query.q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  base.$or=[{title:{$regex:literal,$options:'i'}},{description:{$regex:literal,$options:'i'}}];
 }
 const fresh={...base,status:'forwarded',_id:{$nin:seen}},review={...base,status:'forwarded',_id:{$in:seen}},approved={...base,status:'approved'},rejected={...base,status:'rejected'};
 const filter=({all:base,new:fresh,review,approved,rejected})[tab];
 const {page,limit,skip}=safePage({...query,limit:12});
 const [rows,total,all,newCount,reviewCount,approvedCount,rejectedCount]=await Promise.all([
  Idea.find(filter).select('title description author sector status createdAt forwardedAt').populate('author','firstName lastName').populate('sector','name').sort({forwardedAt:-1,createdAt:-1,_id:-1}).skip(skip).limit(limit).lean(),
  Idea.countDocuments(filter),Idea.countDocuments(base),Idea.countDocuments(fresh),Idea.countDocuments(review),Idea.countDocuments(approved),Idea.countDocuments(rejected)
 ]);
 const ids=rows.map(x=>x._id);
 const counts=ids.length?await Comment.aggregate([{$match:{targetType:'idea',targetId:{$in:ids}}},{$group:{_id:'$targetId',count:{$sum:1}}}]):[];
 const seenSet=new Set(seen);
 return {items:rows.map(row=>{
  const text=Array.from(row.description||'');
  return {...row,description:text.length>300?text.slice(0,300).join('')+'…':row.description,
   isNew:row.status==='forwarded'&&!seenSet.has(String(row._id)),commentCount:counts.find(x=>String(x._id)===String(row._id))?.count||0};
 }),total,page,limit,stats:{total:all,new:newCount,review:reviewCount,approved:approvedCount,rejected:rejectedCount}};
}
export async function markPresidentIdeaRead(user,id,version){
 presidentOnly(user);const idea=await ideaAccess(user,id);
 if(version&&version!=='"'+idea.updatedAt?.toISOString()+'"')fail(409,'Predlog je promenjen. Osvežite ga pre nastavka.');
 const filter={user:user._id,idea:idea._id},patch={$set:{seenAt:new Date()}};
 try{await IdeaRead.updateOne(filter,patch,{upsert:true,runValidators:true});}
 catch(error){if(error.code!==11000)throw error;await IdeaRead.updateOne(filter,patch,{runValidators:true});}
 await Notification.updateMany({user:user._id,type:'idea_forwarded',link:'/ideas/'+idea._id,readAt:null},{$set:{readAt:new Date()}});
 return {read:true,ideaId:idea._id};
}
