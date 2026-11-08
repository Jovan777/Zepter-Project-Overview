import {Router} from 'express';
import {Notification,PushSubscription} from '../models/index.js';
import {schemas} from '../lib/validation.js';
import {requireId,safePage} from '../lib/utils.js';
import {notificationFilter,managerNotificationFilter} from '../lib/notificationFilters.js';
const r=Router();
r.get('/',async(req,res)=>{
 const managerView=req.query.view==='manager';
 const filter=managerView?await managerNotificationFilter(req.user,req.query.category):notificationFilter(req.user._id,req.query.category);
 const raw=safePage(req.query),limit=Math.floor(raw.limit),page=Math.floor(raw.page),skip=(page-1)*limit;
 const rows=q=>managerView?q.populate('actor','firstName lastName role'):q;
 if(managerView)res.set('Cache-Control','no-store');
 if(req.query.unread==='true')filter.readAt=null;
 if(req.query.grouped==='true'){
  const [total,unread,filteredUnread]=await Promise.all([Notification.countDocuments(filter),Notification.countDocuments({user:req.user._id,readAt:null}),Notification.countDocuments({...filter,readAt:null})]);
  // Page across two ordered groups, so unread items never hide behind old read items.
  const unreadLimit=Math.max(0,Math.min(limit,filteredUnread-skip));
  const [fresh,earlier]=await Promise.all([
   unreadLimit?rows(Notification.find({...filter,readAt:null}).sort({createdAt:-1,_id:-1}).skip(skip).limit(unreadLimit)):[],
   req.query.unread!=='true'&&unreadLimit<limit?rows(Notification.find({...filter,readAt:{$ne:null}}).sort({createdAt:-1,_id:-1}).skip(Math.max(0,skip-filteredUnread)).limit(limit-unreadLimit)):[]
  ]);
  return res.json({items:[...fresh,...earlier],total,unread,filteredUnread,page,limit});
 }
 const [items,total,unread]=await Promise.all([
  rows(Notification.find(filter).sort({createdAt:-1}).skip(skip).limit(limit)),Notification.countDocuments(filter),Notification.countDocuments({user:req.user._id,readAt:null})]);
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
