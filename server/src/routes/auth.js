import {Router} from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {User,Sector,Session} from '../models/index.js';
import {schemas} from '../lib/validation.js';
import {requireAuth,createSession,setRefreshCookie,clearRefreshCookie,refreshCookieName,tokenDigest,originGuard} from '../lib/auth.js';
import {fail} from '../lib/errors.js';
import {audit} from '../services/events.js';
const r=Router();
const limit=rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Previše pokušaja. Pokušajte kasnije.'}});
r.post('/register',limit,async(req,res)=>{
 const d=schemas.register.parse(req.body);
 const sector=await Sector.findById(d.sectorId);if(!sector?.active)fail(422,'Nepostojeći ili neaktivan sektor.');
 if(await User.exists({email:d.email.toLowerCase()}))fail(409,'Mejl je već registrovan.');
 const passwordHash=await bcrypt.hash(d.password,12);
 const u=await User.create({firstName:d.firstName,lastName:d.lastName,email:d.email,passwordHash,jobTitle:d.jobTitle,sector:d.sectorId,requestedManager:d.requestedManager,role:'employee',approval:'pending'});
 await audit(req,'auth.registration','User',u._id,{sectorId:d.sectorId,requestedManager:d.requestedManager});
 res.status(201).json({message:'Registracija je primljena. Sačekajte odobrenje administratora.',userId:u._id});
});
r.post('/login',limit,async(req,res)=>{
 const d=schemas.login.parse(req.body);
 const user=await User.findOne({email:d.email.toLowerCase()}).select('+passwordHash');
 const good=user?await bcrypt.compare(d.password,user.passwordHash):await bcrypt.compare(d.password,'$2a$12$GNVQvzKQhFnVHMptSYs3g.4maUHedvuXe0UqSqKw.lpwDrlo5p/Iu');
 if(!good)fail(401,'Pogrešan mejl ili lozinka.');
 if(user.approval!=='approved')fail(403,'Nalog nije odobren ili je deaktiviran.');
 const {accessToken,refresh}=await createSession(req,user);
 setRefreshCookie(res,refresh);
 user.lastLoginAt=new Date();await user.save();
 res.json({accessToken,user:user.toJSON()});
});
r.post('/refresh',originGuard,async(req,res)=>{
 const raw=req.cookies[refreshCookieName];if(!raw)fail(401,'Osvežavanje prijave nije moguće.');
 const s=await Session.findOne({tokenHash:tokenDigest(raw)});
 if(!s||s.revokedAt||s.expiresAt<new Date()){clearRefreshCookie(res);fail(401,'Prijavite se ponovo.');}
 const user=await User.findById(s.user);
 if(!user||user.approval!=='approved'){await s.deleteOne();clearRefreshCookie(res);fail(401,'Nalog nije aktivan.');}
 // Atomic rotation: an old refresh token cannot be used twice.
 const updated=await Session.findOneAndUpdate({_id:s._id,revokedAt:null},{$set:{revokedAt:new Date()}},{new:true});
 if(!updated){clearRefreshCookie(res);fail(401,'Sesija je već obnovljena.');}
 const {accessToken,refresh}=await createSession(req,user);setRefreshCookie(res,refresh);
 res.json({accessToken,user:user.toJSON()});
});
r.post('/logout',originGuard,async(req,res)=>{
 const raw=req.cookies[refreshCookieName];if(raw)await Session.updateOne({tokenHash:tokenDigest(raw)},{$set:{revokedAt:new Date()}});
 clearRefreshCookie(res);res.json({ok:true});
});
r.get('/me',requireAuth,(req,res)=>res.json({user:req.user.toJSON()}));
r.post('/change-password',requireAuth,limit,async(req,res)=>{
 const {oldPassword,newPassword}=schemas.changePassword.parse(req.body);
 const user=await User.findById(req.user._id).select('+passwordHash');
 if(!await bcrypt.compare(oldPassword,user.passwordHash))fail(403,'Trenutna lozinka nije ispravna.');
 user.passwordHash=await bcrypt.hash(newPassword,12);user.passwordChangedAt=new Date();user.sessionVersion=(user.sessionVersion||0)+1;await user.save();
 await Session.updateMany({user:user._id,revokedAt:null},{$set:{revokedAt:new Date()}});
 clearRefreshCookie(res);await audit(req,'auth.password_changed','User',user._id);
 res.json({message:'Lozinka je promenjena. Prijavite se ponovo.'});
});
export default r;
