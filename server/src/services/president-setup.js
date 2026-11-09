import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import {User,PresidentAccessLink} from '../models/index.js';
import {tokenDigest} from '../lib/auth.js';
import {isPresidentKey} from '../lib/president-link-url.js';

// Explicit local CLI setup only. Never called by API requests or application startup.
export function requireLocalPresidentSetup(env){
 const uri=env.MONGODB_URI||'',origin=new URL(env.CLIENT_ORIGIN);
 const local=/^mongodb:\/\/(?:127\.0\.0\.1|localhost):27017\/(zepter_management_demo|zepter_president_setup_test_[a-f0-9]{24})$/.exec(uri);
 if(env.NODE_ENV==='production'||!local||!['localhost','127.0.0.1','[::1]'].includes(origin.hostname)||!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw Error('Podešavanje je dozvoljeno samo za lokalnu razvojnu bazu i lokalni frontend.');
 if(local[1]!=='zepter_management_demo'&&env.ZEPTER_PRESIDENT_SETUP_TEST!=='1')throw Error('Testna baza zahteva eksplicitni testni režim.');
}

export async function localPresidentAccount(env){
 requireLocalPresidentSetup(env);
 const presidents=await User.find({role:'president'}).limit(2);
 if(presidents.length>1)throw Error('Postoji više predsedničkih naloga. Potrebno je izabrati postojeći nalog komandom issue.');
 if(presidents.length){
  if(presidents[0].approval!=='approved')throw Error('Predsednički nalog nije aktivan. Podešavanje ga neće ponovo aktivirati.');
  return {user:presidents[0],created:false};
 }
 const email='predsednik@zepter.test';
 if(await User.exists({email}))throw Error('Adresa za lokalni predsednički nalog je zauzeta. Postojeći nalog nije menjan.');
 const passwordHash=await bcrypt.hash(crypto.randomBytes(48).toString('base64url'),12);
 const user=await User.create({email,firstName:'Predsednik',lastName:'Zepter',jobTitle:'Predsednik',role:'president',approval:'approved',approvedAt:new Date(),passwordHash});
 return {user,created:true};
}

export async function ensurePermanentPresidentLink(user,key){
 if(user?.role!=='president'||user.approval!=='approved'||!isPresidentKey(key))throw Error('Nalog ili format predsedničkog pristupa nije važeći.');
 const tokenHash=tokenDigest(key);
 const now=new Date();
 const link=await PresidentAccessLink.findOneAndUpdate({user:user._id},{$setOnInsert:{tokenHash,generation:1,revokedAt:null,expiresAt:null,createdAt:now,updatedAt:now}},{upsert:true,returnDocument:'after',runValidators:true,timestamps:false}).select('+tokenHash');
 if(link.tokenHash!==tokenHash)throw Error('Sačuvani fajl ne odgovara aktivnom linku. Postojeći link nije zamenjen; zamena se radi eksplicitno komandom issue.');
 if(link.revokedAt||link.expiresAt&&new Date(link.expiresAt)<=new Date())throw Error('Link je eksplicitno opozvan ili je istekao. Podešavanje ga neće ponovo aktivirati.');
 return link;
}
