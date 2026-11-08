import webpush from 'web-push';
import {Notification,PushSubscription,User,Audit} from '../models/index.js';
import {managerRecipients} from '../lib/access.js';
import {emitAuthorized} from '../lib/president-socket.js';
let io;
export function attachSocket(serverIO){io=serverIO;}
export async function audit(req,action,entity,entityId,details={}){
 await Audit.create({actor:req?.user?._id,action,entity,entityId,details,ip:req?.ip});
 if(io){
  await emitAuthorized(io,'presidents','data:changed',{entity,action});
  if(req?.user?.sector)await emitAuthorized(io,'sector:'+req.user.sector,'data:changed',{entity,action});
 }
}
let pushEnabled=false;
if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY){
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:admin@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);pushEnabled=true;
}
export async function notify(userIds,payload,actor){
 const ids=[...new Set(userIds.map(String))].filter(x=>x&&x!==String(actor||''));
 if(!ids.length)return;
 const recipients=await User.find({_id:{$in:ids},approval:'approved'}).select('_id');
 await Promise.all(recipients.map(async u=>{
  const n=await Notification.create({user:u._id,actor,type:payload.type,title:payload.title,body:payload.body,link:payload.link});
  if(io)await emitAuthorized(io,'user:'+u._id,'notification:new',n.toJSON());
  if(pushEnabled){
   const subs=await PushSubscription.find({user:u._id});
   await Promise.all(subs.map(async sub=>{
    try{await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},JSON.stringify({title:payload.title,body:payload.body,url:payload.link}));}
    catch(err){if([404,410].includes(err.statusCode))await sub.deleteOne();else console.warn('Push not delivered:',err.message);}
   }));
  }
 }));
}
export async function notifyManagers(sectorId,payload,actor){
 const managers=await managerRecipients(sectorId);
 return notify(managers.map(x=>x._id),payload,actor);
}
