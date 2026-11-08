// Explicit local initialization/migration. Default is a read-only preview.
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as models from '../models/index.js';
import {companySectors} from '../data/company-catalog.js';
import {planCompanySeed,applyCompanySeed,companySeedProjection} from '../services/company-seed.js';

function safeLocal(uri){
 try{const url=new URL(uri);return url.protocol==='mongodb:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&!url.username&&!url.password&&!url.search&&['/zepter_management_demo','/zepter_management'].includes(url.pathname);}catch{return false;}
}
function encode(value){
 if(value instanceof Date)return {$date:value.toISOString()};
 if(value?._bsontype==='ObjectId')return {$oid:String(value)};
 if(Array.isArray(value))return value.map(encode);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]));
 return value;
}
try{
 const args=process.argv.slice(2);if(args.some(arg=>!['--apply','--check'].includes(arg)))throw Error('Koristite bez argumenata za pregled, --apply za primenu ili --check za proveru.');
 if(args.includes('--apply')&&args.includes('--check'))throw Error('Primenu i proveru pokrenite odvojeno; --check nikada ne upisuje podatke.');
 if(process.env.NODE_ENV==='production'||!safeLocal(process.env.MONGODB_URI))throw Error('Inicijalizacija je dozvoljena samo za podešenu lokalnu Zepter bazu.');
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
 const snapshot={};for(const [name,projection]of Object.entries(companySeedProjection))snapshot[name]=await models[name].find().select(projection).lean();
 const operations=planCompanySeed(snapshot),summary={sectors:companySectors.length,updates:{},inserts:{}};
 for(const operation of operations){const group=operation.kind==='insert'?summary.inserts:summary.updates;group[operation.model]=(group[operation.model]||0)+1;}
 console.log(JSON.stringify(summary));
 if(args.includes('--apply')&&operations.length){
  const folder=path.resolve('backups/company');await fs.mkdir(folder,{recursive:true,mode:0o700});
  const name='company-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID()+'.json',file=path.join(folder,name);
  const handle=await fs.open(file,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(encode({version:1,createdAt:new Date(),database:mongoose.connection.name,operations}),null,2)+'\n');await handle.sync();}finally{await handle.close();}
  console.log('Rezervna kopija polja koja se menjaju: backups/company/'+name);
  console.log(JSON.stringify(await applyCompanySeed(operations,models)));
 }else console.log(operations.length?'Pregled je završen bez upisa. Za primenu koristite --apply.':'Podaci su već usklađeni; nema novih izmena.');
 if(args.includes('--check')&&operations.length)process.exitCode=1;
}catch(error){console.error('Usklađivanje nije završeno: '+(/Mongo|Mongoose/.test(error.name)?'Proverite lokalnu bazu; konfiguracija nije ispisana.':error.message));process.exitCode=1;}
finally{await mongoose.disconnect();}
