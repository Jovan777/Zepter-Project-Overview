import {Router} from 'express';
import {User,Sector,Session,Audit} from '../models/index.js';
import {allow} from '../lib/auth.js';
import {schemas} from '../lib/validation.js';
import {fail} from '../lib/errors.js';
import {requireId,safePage,same} from '../lib/utils.js';
import {audit,notify} from '../services/events.js';
const r=Router();r.use(allow('admin'));
r.get('/registrations',async(req,res)=>{
 const status=['pending','approved','rejected','disabled'].includes(req.query.status)?req.query.status:'pending';
 const users=await User.find({approval:status}).populate('sector','name').sort({createdAt:-1}).limit(200);
 res.json({items:users});
});
r.get('/users',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query);
 const filter={};if(req.query.role)filter.role=req.query.role;if(req.query.sectorId)filter.sector=requireId(req.query.sectorId);
 const [items,total]=await Promise.all([User.find(filter).populate('sector','name').sort({createdAt:-1}).skip(skip).limit(limit),User.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.patch('/users/:id/approve',async(req,res)=>{
 const d=schemas.approval.parse(req.body);const user=await User.findById(requireId(req.params.id));if(!user)fail(404,'Korisnik ne postoji.');
 if(user.approval!=='pending'&&user.approval!=='rejected')fail(409,'Nalog nije u statusu za odobravanje.');
 const sectorId=d.sectorId||user.sector;const sector=await Sector.findById(sectorId);
 if(!sector?.active)fail(422,'Nepostojeći ili neaktivan sektor.');
 if(d.role==='manager'&&sector.manager&&!same(sector.manager,user._id))fail(409,'Sektor već ima rukovodioca.');
 user.role=d.role;user.approval='approved';user.sector=sectorId;user.approvedBy=req.user._id;user.approvedAt=new Date();await user.save();
 if(d.role==='manager'){sector.manager=user._id;await sector.save();}
 await audit(req,'admin.user_approved','User',user._id,{role:user.role,sectorId});
 res.json({user});
});
r.patch('/users/:id/reject',async(req,res)=>{
 const user=await User.findById(requireId(req.params.id));if(!user)fail(404,'Nepostojeći korisnik.');
 if(user.approval!=='pending')fail(409,'Samo prijave na čekanju mogu se odbiti.');
 const d=schemas.rejection.parse(req.body);user.approval='rejected';await user.save();
 await audit(req,'admin.user_rejected','User',user._id,{reason:d.reason||''});res.json({user});
});
r.patch('/users/:id/disable',async(req,res)=>{
 const user=await User.findById(requireId(req.params.id));if(!user)fail(404,'Nepostojeći korisnik.');
 if(['president','admin'].includes(user.role))fail(403,'Privilegovani nalozi se ne deaktiviraju ovim endpointom.');
 user.approval='disabled';user.sessionVersion=(user.sessionVersion||0)+1;await user.save();await Session.updateMany({user:user._id},{$set:{revokedAt:new Date()}});
 if(user.role==='manager')await Sector.updateOne({manager:user._id},{$unset:{manager:1}});
 await audit(req,'admin.user_disabled','User',user._id);res.json({user});
});
r.post('/sectors',async(req,res)=>{
 const d=schemas.sector.parse(req.body);const sector=await Sector.create(d);await audit(req,'admin.sector_created','Sector',sector._id);
 res.status(201).json({sector});
});
r.patch('/sectors/:id',async(req,res)=>{
 const d=schemas.sectorPatch.parse(req.body);const sector=await Sector.findByIdAndUpdate(requireId(req.params.id),{$set:d},{new:true,runValidators:true});
 if(!sector)fail(404,'Nepostojeći sektor.');await audit(req,'admin.sector_updated','Sector',sector._id,d);res.json({sector});
});
r.get('/audit',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([Audit.find().sort({createdAt:-1}).skip(skip).limit(limit).populate('actor','firstName lastName email'),Audit.countDocuments()]);
 res.json({items,total,page,limit});
});
export default r;
