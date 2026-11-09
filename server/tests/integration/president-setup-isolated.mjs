// Opt-in real MongoDB/CLI/HTTP check. Never uses the demo database.
import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import router from '../../src/routes/auth.js';
import {errorHandler} from '../../src/lib/errors.js';
import {User,PresidentAccessLink,Session} from '../../src/models/index.js';
import {presidentUrlKey} from '../../src/lib/president-link-url.js';
if(process.env.ZEPTER_PRESIDENT_SETUP_TEST!=='1')throw Error('Enable ZEPTER_PRESIDENT_SETUP_TEST=1 explicitly.');
const database='zepter_president_setup_test_'+crypto.randomBytes(12).toString('hex');
const uri='mongodb://127.0.0.1:27017/'+database;
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'zepter-president-setup-'));
const script=fileURLToPath(new URL('../../src/scripts/setup-president.js',import.meta.url));
const env={...process.env,MONGODB_URI:uri,CLIENT_ORIGIN:'http://localhost:5173',NODE_ENV:'test',JWT_SECRET:crypto.randomBytes(48).toString('hex')};
const run=()=>promisify(execFile)(process.execPath,[script],{cwd:folder,env,timeout:20000});
let server,checks=0;
const check=(condition)=>{assert.ok(condition);checks++;};
try{
 await mongoose.connect(uri,{autoIndex:false,autoCreate:false,serverSelectionTimeoutMS:5000});
 await User.createIndexes();await PresidentAccessLink.createIndexes();await Session.createIndexes();
 const first=await run();
 const file=path.join(folder,'private-access/predsednik-link.txt'),url=(await fs.readFile(file,'utf8')).trim(),key=presidentUrlKey(url,env.CLIENT_ORIGIN);
 check(/^http:\/\/localhost:5173\/president\/zp\/002\/[A-Za-z0-9]{12}$/.test(url));
 check(!first.stdout.includes(key)&&!first.stderr.includes(key));
 check(await User.countDocuments({})===1);
 check(await User.countDocuments({role:'president',approval:'approved'})===1);
 check(await PresidentAccessLink.countDocuments({})===1);
 const initial=await PresidentAccessLink.findOne().select('+tokenHash').lean();
 check(initial.generation===1&&!initial.expiresAt&&!initial.revokedAt);
 const savedSecret=process.env.JWT_SECRET,savedOrigin=process.env.CLIENT_ORIGIN;
 process.env.JWT_SECRET=env.JWT_SECRET;process.env.CLIENT_ORIGIN=env.CLIENT_ORIGIN;
 try{
  for(let restart=0;restart<2;restart++){
   const app=express();app.use(express.json(),cookieParser());app.use('/api/auth',router);app.use(errorHandler);
   server=await new Promise(resolve=>{const running=app.listen(0,'127.0.0.1',()=>resolve(running));});
   const base='http://127.0.0.1:'+server.address().port+'/api/auth';
   const post=(route,body,cookie)=>fetch(base+route,{method:'POST',headers:{Origin:env.CLIENT_ORIGIN,'Content-Type':'application/json','User-Agent':'zepter-president-setup-isolated',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
   for(let device=0;device<2;device++){
    const response=await post('/president-link',{key}),cookie=response.headers.get('set-cookie')?.split(';')[0];
    try{
     check(response.status===200);const data=await response.json();check(data.user?.role==='president');
     const me=await fetch(base+'/me',{headers:{Authorization:'Bearer '+data.accessToken}});check(me.status===200);
     const before=await PresidentAccessLink.findOne().select('+tokenHash').lean();
     await run();check((await fs.readFile(file,'utf8')).trim()===url);
     check(JSON.stringify(await PresidentAccessLink.findOne().select('+tokenHash').lean())===JSON.stringify(before));
     check(await Session.countDocuments({revokedAt:null})===1);
    }finally{if(cookie)check((await post('/logout',{},cookie)).status===200);}
   }
   await new Promise(resolve=>server.close(resolve));server=null;
   // Simulate a new API process connecting to the same persistent data.
   await mongoose.disconnect();await mongoose.connect(uri,{autoIndex:false,autoCreate:false});
  }
 }finally{
  for(const [name,value] of Object.entries({JWT_SECRET:savedSecret,CLIENT_ORIGIN:savedOrigin}))if(value===undefined)delete process.env[name];else process.env[name]=value;
 }
 check(await User.countDocuments({})===1);
 check(await Session.countDocuments({revokedAt:null})===0);
 // Losing the file must never rotate the existing access behind the operator's back.
 await fs.rename(file,file+'.saved');
 await assert.rejects(run());checks++;
 await fs.rename(file+'.saved',file);
 check((await PresidentAccessLink.findOne()).generation===initial.generation);
 // Explicit revocation must survive another setup invocation.
 await PresidentAccessLink.updateOne({_id:initial._id},{$set:{revokedAt:new Date()}});
 await assert.rejects(run());checks++;
 check(!!(await PresidentAccessLink.findOne()).revokedAt);
 check((await fs.readFile(file,'utf8')).trim()===url);
 console.log('PASS '+checks+' isolated setup, restart, independent-device, session cleanup and revocation checks. No credentials printed.');
}finally{
 if(server)await new Promise(resolve=>server.close(resolve));
 if(mongoose.connection.readyState!==1)await mongoose.connect(uri,{autoIndex:false,autoCreate:false});
 if(mongoose.connection.name!==database||!/^zepter_president_setup_test_[a-f0-9]{24}$/.test(database)||mongoose.connection.host!=='127.0.0.1')throw Error('Refusing cleanup of an unexpected database.');
 await mongoose.connection.db.dropDatabase();await mongoose.disconnect();
 if(path.dirname(path.resolve(folder))!==path.resolve(os.tmpdir())||!path.basename(folder).startsWith('zepter-president-setup-'))throw Error('Refusing cleanup of an unexpected directory.');
 await fs.rm(folder,{recursive:true,force:true});
 console.log('Isolated test database and temporary files removed.');
}
