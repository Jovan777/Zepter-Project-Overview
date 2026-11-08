import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {Session} from '../../src/models/index.js';

// Only the exact marked session of this local read-only test can be revoked here.
export async function revokeMarkedReadSession({uri,cookie,device,userId},dependencies={}){
 if(!/^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/zepter_management_demo(?:\?|$)/.test(uri||''))throw Error('Test cleanup requires the local demo database.');
 if(!/^zepter-president-read-check\/[a-f0-9-]{36}$/.test(device||'')||! /^[a-f0-9]{24}$/.test(String(userId||'')))throw Error('Test session marker is missing.');
 const raw=/^zepter_refresh=([^;]+)$/.exec(cookie||'')?.[1];
 if(!raw)throw Error('Test refresh cookie is missing.');
 const tokenHash=crypto.createHash('sha256').update(decodeURIComponent(raw)).digest('hex');
 const connect=dependencies.connect||mongoose.connect.bind(mongoose),disconnect=dependencies.disconnect||mongoose.disconnect.bind(mongoose),Model=dependencies.Model||Session;
 try{
  await connect(uri);
  const filter={user:userId,tokenHash,device};
  const result=await Model.updateOne({...filter,revokedAt:null},{$set:{revokedAt:new Date()}});
  if(result.modifiedCount!==1){
   const existing=await Model.findOne(filter).select('revokedAt').lean();
   if(!existing?.revokedAt)throw Error('The exact test session was not revoked.');
  }
 }finally{await disconnect();}
}
