import {createHash} from 'node:crypto';
import {Types} from 'mongoose';
import {Idea,Comment,Notification,Audit,User} from '../models/index.js';
import {managerRecipients} from '../lib/access.js';
import {requireId,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {schemas} from '../lib/validation.js';
import {presidentOnly} from './president.js';
import {userDataChanged,publishNotification} from './events.js';

const objectId=(kind,idea,requestId,suffix='')=>new Types.ObjectId(createHash('sha256').update([kind,String(idea),requestId,String(suffix)].join(':')).digest('hex').slice(0,24));
const version=idea=>'"'+idea.updatedAt.toISOString()+'"';
const finalStates=['approved','rejected'];
async function insertOnce(Model,id,fields){
 try{const result=await Model.updateOne({_id:id},{$setOnInsert:fields},{upsert:true,runValidators:true});return result.upsertedCount===1;}
 catch(error){if(error.code!==11000||!await Model.exists({_id:id}))throw error;return false;}
}
async function deliver(idea){
 const d=idea.decision,requestId=idea.decisionDelivery?.requestId;
 if(!d||!requestId||!finalStates.includes(idea.status))fail(409,'Predsednička odluka nije sačuvana.');
 if(d.deliveryStatus==='complete')return;
 const managers=await managerRecipients(idea.sector),forwarder=managers.find(person=>same(person._id,idea.reviewedBy));
 const addressed=(forwarder?[forwarder]:managers).map(person=>person._id);
 if(d.action==='approve'&&!addressed.length)throw Error('Isporuka čeka aktivnog rukovodioca sektora.');
 if(d.commentId)await insertOnce(Comment,d.commentId,{targetType:'idea',targetId:idea._id,author:d.by,body:d.note,kind:d.action==='approve'?'instruction':'comment',responseStatus:'open',addressedTo:addressed});
 const ids=[...new Set([...addressed,idea.author].filter(Boolean).map(String))].filter(id=>id!==String(d.by));
 const recipients=await User.find({_id:{$in:ids},approval:'approved'}).select('_id');
 for(const person of recipients){
  const id=objectId('idea-decision-notification',idea._id,requestId,person._id),instruction=d.action==='approve'&&addressed.some(manager=>same(manager,person._id));
  const inserted=await insertOnce(Notification,id,{
   user:person._id,actor:d.by,type:instruction?'instruction':'idea_status',
   title:instruction?'Naredni koraci za odobrenu ideju':d.action==='approve'?'Predsednik je odobrio ideju':'Predsednik je odbio ideju',
   body:(d.action==='approve'?idea.title+': '+d.note:d.note||'Predlog je odbijen i njegov tok je završen.').slice(0,550),link:'/ideas/'+idea._id
  });
  if(inserted)await publishNotification(await Notification.findById(id));
 }
 await insertOnce(Audit,objectId('idea-decision-audit',idea._id,requestId),{actor:d.by,action:'idea.'+idea.status,entity:'Idea',entityId:idea._id,details:{status:idea.status,commentId:d.commentId}});
 await Idea.updateOne({_id:idea._id,'decisionDelivery.requestId':requestId,'decision.deliveryStatus':'pending'},{$set:{'decision.deliveryStatus':'complete'}});
 // Existing clients reload their own data; no extra notification is created by retries.
 for(const id of [...ids,String(d.by)])await userDataChanged(id,'Idea');
}
async function finish(idea){
 try{await deliver(idea);}catch{
  // The decision is already durable. Its idempotent outbox survives a client/server restart.
  return {idea:await Idea.findById(idea._id),pending:true};
 }
 return {idea:await Idea.findById(idea._id),pending:false};
}
export async function decideIdea(user,id,body,expected){
 presidentOnly(user);requireId(id);const data=schemas.presidentIdeaDecision.parse(body);
 let idea=await Idea.findById(id).select('+decisionDelivery');if(!idea)fail(404,'Ideja nije pronađena.');
 const identical=current=>current?.decisionDelivery?.requestId===data.requestId&&same(current.decision?.by,user._id)&&current.decision?.action===data.action&&(current.decision.note||'')===data.comment;
 if(identical(idea))return finish(idea);
 if(!['forwarded',...finalStates].includes(idea.status))fail(403,'Predsedniku su dostupne samo prosleđene ideje.');
 if(idea.status!=='forwarded')fail(409,'Odluka je već doneta i ne može se menjati.');
 if(!expected)fail(428,'Osvežite predlog pre donošenja odluke.');
 if(expected!==version(idea))fail(409,'Predlog je u međuvremenu promenjen. Osvežite ga pre odluke.');
 const fields={status:data.action==='approve'?'approved':'rejected',decision:{
  action:data.action,by:user._id,at:new Date(),note:data.comment,deliveryStatus:'pending',
  ...(data.comment?{commentId:objectId('idea-decision-comment',id,data.requestId)}:{})
 },decisionDelivery:{requestId:data.requestId}};
 const saved=await Idea.findOneAndUpdate({_id:id,status:'forwarded',updatedAt:idea.updatedAt},{$set:fields},{returnDocument:'after',runValidators:true}).select('+decisionDelivery');
 if(!saved){
  idea=await Idea.findById(id).select('+decisionDelivery');if(identical(idea))return finish(idea);
  fail(409,'Predlog je promenjen ili je odluka već doneta. Proverite aktuelno stanje.');
 }
 return finish(saved);
}
export async function retryIdeaDecisionDelivery(user,id){
 presidentOnly(user);requireId(id);const idea=await Idea.findById(id).select('+decisionDelivery');
 if(!idea)fail(404,'Ideja nije pronađena.');
 if(!finalStates.includes(idea.status)||!idea.decision)fail(409,'Predsednička odluka nije sačuvana.');
 return finish(idea);
}
export async function deliverPendingIdeaDecisions(){
 const items=await Idea.find({status:{$in:finalStates},'decision.deliveryStatus':'pending'}).select('+decisionDelivery').sort({'decisionDelivery.lastAttemptAt':1,'decision.at':1,_id:1}).limit(20);
 for(const item of items)try{
  await Idea.updateOne({_id:item._id,'decisionDelivery.requestId':item.decisionDelivery?.requestId,'decision.deliveryStatus':'pending'},{$set:{'decisionDelivery.lastAttemptAt':new Date()}});
  await deliver(item);
 }catch{/* Failed items move behind unattempted work instead of starving the queue. */}
}
export function startIdeaDecisionDelivery(){
 let running=false;const run=async()=>{if(running)return;running=true;try{await deliverPendingIdeaDecisions();}catch{console.warn('Ponovna isporuka odluka o idejama trenutno nije dostupna.');}finally{running=false;}};
 const timer=setInterval(run,30000);timer.unref();void run();return()=>clearInterval(timer);
}
