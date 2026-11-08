import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import {User,Session,PresidentAccessLink} from '../models/index.js';
import {fail} from './errors.js';

export const accessLifetime='15m';
const days=30;
export const refreshCookieName='zepter_refresh';
const secret=()=>process.env.JWT_SECRET;
export const tokenDigest=t=>crypto.createHash('sha256').update(t).digest('hex');
export const accessToken=(user,link)=>jwt.sign({sub:String(user._id),typ:'access',sv:user.sessionVersion||0,...(link?{pl:String(link._id),plg:link.generation}:{})},secret(),{expiresIn:accessLifetime,issuer:'zepter-management',audience:'zepter-client'});
export async function validPresidentLink(id,generation,user){
 if(user?.role!=='president'||user.approval!=='approved'||!Number.isInteger(generation)||generation<1)return false;
 const link=await PresidentAccessLink.findById(id);
 return !!link&&String(link.user)===String(user._id)&&link.generation===generation&&!link.revokedAt&&(!link.expiresAt||new Date(link.expiresAt)>new Date());
}
export async function verifyAccess(token){
 try{
  const data=jwt.verify(token,secret(),{issuer:'zepter-management',audience:'zepter-client'});
  if(data.typ!=='access')return null;
  const user=await User.findById(data.sub);
  if(user?.approval!=='approved'||(user.sessionVersion||0)!==(data.sv||0))return null;
  if(data.pl&&!await validPresidentLink(data.pl,data.plg,user))return null;
  return user;
 }catch{return null;}
}
export async function requireAuth(req,_res,next){
 try{
  const header=req.headers.authorization||'';
  if(!header.startsWith('Bearer '))fail(401,'Prijava je obavezna.');
  const user=await verifyAccess(header.slice(7));
  if(!user)fail(401,'Sesija je istekla ili nalog nije aktivan.');
  req.user=user;next();
 }catch(e){next(e);}
}
export function allow(...roles){return (req,_res,next)=>roles.includes(req.user.role)?next():next(Object.assign(new Error('Nemate ovlašćenje.'),{status:403}));}
export async function createSession(req,user,link){
 const refresh=crypto.randomBytes(48).toString('base64url');
 await Session.create({user:user._id,tokenHash:tokenDigest(refresh),expiresAt:new Date(Date.now()+days*86400000),createdIp:req.ip,device:(req.headers['user-agent']||'').slice(0,240),...(link?{presidentLink:link._id,presidentLinkGeneration:link.generation}:{})});
 return {accessToken:accessToken(user,link),refresh};
}
export function setRefreshCookie(res,refresh){
 res.cookie(refreshCookieName,refresh,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production',sameSite:process.env.COOKIE_SAMESITE||'strict',path:'/api/auth',maxAge:days*86400000});
}
export function clearRefreshCookie(res){res.clearCookie(refreshCookieName,{httpOnly:true,secure:process.env.COOKIE_SECURE==='true'||process.env.NODE_ENV==='production',sameSite:process.env.COOKIE_SAMESITE||'strict',path:'/api/auth'});}
export function originGuard(req,_res,next){
 const origin=req.headers.origin;
 if(origin && origin!==process.env.CLIENT_ORIGIN)return next(Object.assign(new Error('Zabranjen origin.'),{status:403}));
 next();
}
