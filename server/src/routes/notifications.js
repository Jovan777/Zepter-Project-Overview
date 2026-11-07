import {Router} from 'express';
import {Notification,PushSubscription} from '../models/index.js';
import {schemas} from '../lib/validation.js';
import {requireId,safePage} from '../lib/utils.js';
const r=Router();
r.get('/',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query),filter={user:req.user._id};
 if(req.query.unread==='true')filter.readAt=null;
 const [items,total,unread]=await Promise.all([
  Notification.find(filter).sort({createdAt:-1}).skip(skip).limit(limit),Notification.countDocuments(filter),Notification.countDocuments({user:req.user._id,readAt:null})]);
 res.json({items,total,unread,page,limit});
});
r.patch('/:id/read',async(req,res)=>{
 const n=await Notification.findOneAndUpdate({_id:requireId(req.params.id),user:req.user._id},{$set:{readAt:new Date()}},{new:true});
 if(!n)return res.status(404).json({error:'Obaveštenje nije pronađeno.'});res.json({notification:n});
});
r.post('/read-all',async(req,res)=>{
 const result=await Notification.updateMany({user:req.user._id,readAt:null},{$set:{readAt:new Date()}});res.json({updated:result.modifiedCount});
});
r.get('/push/key',(_req,res)=>res.json({publicKey:process.env.VAPID_PUBLIC_KEY||null}));
r.post('/push/subscribe',async(req,res)=>{
 const d=schemas.push.parse(req.body);
 const subscription=await PushSubscription.findOneAndUpdate({endpoint:d.endpoint},{$set:{user:req.user._id,endpoint:d.endpoint,keys:d.keys}},{upsert:true,new:true});
 res.status(201).json({id:subscription._id});
});
r.post('/push/unsubscribe',async(req,res)=>{
 const d=schemas.push.parse(req.body);
 await PushSubscription.deleteOne({user:req.user._id,endpoint:d.endpoint});res.json({ok:true});
});
export default r;
