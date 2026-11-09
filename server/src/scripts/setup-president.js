// One-time, explicit local setup. Restarting the API never invokes this command.
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import {PresidentAccessLink} from '../models/index.js';
import {requireLocalPresidentSetup,localPresidentAccount,ensurePermanentPresidentLink} from '../services/president-setup.js';
import {presidentAccessUrl,presidentUrlKey,newPresidentKey} from '../lib/president-link-url.js';

try{
 requireLocalPresidentSetup(process.env);
 const output=path.resolve('private-access/predsednik-link.txt');
 let key;
 try{key=presidentUrlKey((await fs.readFile(output,'utf8')).trim(),process.env.CLIENT_ORIGIN);}
 catch(error){if(error.code!=='ENOENT')throw error;}
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000,autoIndex:false,autoCreate:false});
 const {user,created}=await localPresidentAccount(process.env);
 if(!key){
  if(await PresidentAccessLink.exists({user:user._id}))throw Error('Postoji sačuvan pristup u bazi, ali nedostaje njegov privatni fajl. Vratite fajl ili eksplicitno izdajte novi link komandom issue.');
  key=newPresidentKey();
  await fs.mkdir(path.dirname(output),{recursive:true});
  const file=await fs.open(output,'wx',0o600);
  try{await file.writeFile(presidentAccessUrl(process.env.CLIENT_ORIGIN,key)+'\n','utf8');await file.sync();}finally{await file.close();}
 }
 await ensurePermanentPresidentLink(user,key);
 console.log(created?'Lokalni predsednički nalog i stalni pristup su podešeni.':'Postojeći predsednički nalog i isti stalni pristup su sačuvani.');
 console.log('Link bez roka isteka je u server/private-access/predsednik-link.txt. Restart i ponavljanje ove komande ne menjaju link.');
}catch(error){
 console.error('Predsednički pristup: '+(/Mongo|Mongoose/.test(error.name)||error.code===11000?'Veza ili upis nisu potvrđeni. Proverite lokalnu bazu; sačuvani privatni fajl ostaje za ponavljanje podešavanja.':error.message));
 process.exitCode=1;
}finally{await mongoose.disconnect();}
