import {Router} from 'express';
import {DecisionRequest,User} from '../models/index.js';
import {allow} from '../lib/auth.js';
import {schemas} from '../lib/validation.js';
import {requestAccess,targetAccess} from '../lib/access.js';
import {safePage} from '../lib/utils.js';
import {audit,notify} from '../services/events.js';
import {fail} from '../lib/errors.js';
const r=Router();
r.get('/',async(req,res)=>{
 if(!['manager','president','admin'].includes(req.user.role))fail(403,'Zahtevi nisu dostupni zaposlenima.');
 const filter=req.user.role==='manager'?{sector:req.user.sector}:{};
 if(req.query.status)filter.status=req.query.status;
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([DecisionRequest.find(filter).sort({createdAt:-1}).skip(skip).limit(limit),DecisionRequest.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',allow('manager'),async(req,res)=>{
 const d=schemas.decision.parse(req.body);
 if(d.referenceType!=='sector'&&!d.referenceId)fail(422,'Izaberite povezani projekat ili aktivnost.');
 if(d.referenceId)await targetAccess(req.user,d.referenceType,d.referenceId);
 const request=await DecisionRequest.create({...d,referenceId:d.referenceId||req.user.sector,sector:req.user.sector,createdBy:req.user._id});
 await audit(req,'request.created','DecisionRequest',request._id,{type:d.type});
 const presidents=await User.find({role:'president',approval:'approved'}).select('_id');
 await notify(presidents.map(x=>x._id),{type:'decision_request',title:'Novi zahtev za predsednika',body:d.title,link:`/requests/${request._id}`},req.user._id);
 res.status(201).json({request});
});
r.get('/:id',async(req,res)=>res.json({request:await requestAccess(req.user,req.params.id)}));
r.patch('/:id/decision',allow('president'),async(req,res)=>{
 const d=schemas.decisionResponse.parse(req.body),request=await requestAccess(req.user,req.params.id);
 if(request.status==='closed')fail(409,'Zahtev je već zatvoren.');
 request.status=d.status;request.decision=d.decision;request.answeredAt=new Date();await request.save();
 await audit(req,'request.answered','DecisionRequest',request._id,{status:d.status});
 await notify([request.createdBy],{type:'request_answered',title:'Predsednik je odgovorio na zahtev',body:request.title,link:`/requests/${request._id}`},req.user._id);
 res.json({request});
});
export default r;
