// Explicit local operator command. Never called by startup, seed or installation.
import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {User,Session,PresidentAccessLink} from '../models/index.js';
import {tokenDigest} from '../lib/auth.js';

let file,output;
try{
 const {values,positionals}=parseArgs({allowPositionals:true,options:{email:{type:'string'},file:{type:'string',default:'predsednik-link.txt'}}});
 const action=positionals[0];
 const email=values.email||positionals[1];
 if(!['issue','revoke'].includes(action)||!email||positionals.length>(values.email?1:2)||!/^[-\w.]+\.txt$/.test(values.file))throw Error('Koristite issue ili revoke, mejl naloga i opciono --file naziv.txt.');
 const origin=new URL(process.env.CLIENT_ORIGIN);
 if((process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))&&origin.protocol!=='https:')throw Error('Za udaljeni pristup obavezan je HTTPS.');
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
 const user=await User.findOne({email:email.toLowerCase(),role:'president',approval:'approved'});
 if(!user)throw Error('Aktivan predsednički nalog nije pronađen. Nalog neće biti kreiran niti izmenjen.');
 if(action==='revoke'){
  await PresidentAccessLink.updateMany({user:user._id},{$set:{revokedAt:new Date()},$inc:{generation:1}});
  await Session.updateMany({user:user._id,presidentLink:{$exists:true},revokedAt:null},{$set:{revokedAt:new Date()}});
  console.log('Lični link i sesije otvorene njime su opozvani.');
 }else{
  const folder=path.resolve('private-access');await fs.mkdir(folder,{recursive:true});
  output=path.join(folder,values.file);file=await fs.open(output,'wx',0o600);
  const key=crypto.randomBytes(24).toString('base64url');
  const link=await PresidentAccessLink.findOneAndUpdate({user:user._id},{$set:{tokenHash:tokenDigest(key),revokedAt:null,expiresAt:null},$inc:{generation:1}},{upsert:true,new:true,runValidators:true});
  await Session.updateMany({user:user._id,presidentLink:link._id,revokedAt:null},{$set:{revokedAt:new Date()}});
  const url=new URL('/predsednik',origin);url.hash=key;
  await file.writeFile(url.href+'\n','utf8');await file.close();file=null;
  console.log('Lični link je sačuvan u private-access/'+values.file+'. Prethodni link je zamenjen. Ne delite ovaj fajl.');
 }
}catch(error){const message=error.code==='EEXIST'?'Izlazni fajl već postoji. Izaberite drugi --file naziv.':/Mongo|Mongoose/.test(error.name)?'Veza sa bazom ili upis nisu uspeli. Proverite lokalna podešavanja.':error.message;console.error('Predsednički link: '+message);process.exitCode=1;}
finally{if(file){await file.close();await fs.unlink(output);}await mongoose.disconnect();}
