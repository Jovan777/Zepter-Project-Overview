/** Reset lozinke ISKLJUCIVO u lokalnoj razvojnoj DEMO bazi.
 * Komanda: node src/scripts/reset-demo-password.js
 * NE brise projekte, aktivnosti, izvestaje, ideje ni ostale testne podatke.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User,Session} from '../models/index.js';

const uri=process.env.MONGODB_URI||'';
function localDemo(s){
  try{
    const u=new URL(s);
    const name=decodeURIComponent(u.pathname.replace(/^\//,''));
    return u.protocol==='mongodb:' && ['127.0.0.1','localhost','::1','[::1]'].includes(u.hostname)
      && /^[a-zA-Z0-9_-]+_demo$/.test(name) && !u.username && !u.password
      && !u.searchParams.has('replicaSet');
  }catch{return false;}
}
if(process.env.NODE_ENV!=='development'||!localDemo(uri)){
  console.error('STOP: dozvoljena je samo LOKALNA development MongoDB baza sa _demo na kraju naziva.');
  process.exit(1);
}
const password=process.env.DEMO_SEED_PASSWORD||'';
if(password.length<8){
  console.error('STOP: DEMO_SEED_PASSWORD mora imati najmanje 8 znakova.');
  process.exit(1);
}
try{
  await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});
  const users=await User.find({email:/@demo\.zepter\.test$/i}).select('_id');
  if(users.length===0)throw new Error('Nema demo naloga. Prvo pokrenite seed-demo.js.');
  const ids=users.map(u=>u._id);
  const hash=await bcrypt.hash(password,12);
  await User.updateMany({_id:{$in:ids}},{$set:{passwordHash:hash,passwordChangedAt:new Date()},$inc:{sessionVersion:1}});
  await Session.updateMany({user:{$in:ids},revokedAt:null},{$set:{revokedAt:new Date()}});
  console.log(`OK: promenjena je lozinka za ${users.length} testnih naloga i odjavljene su stare sesije.`);
  console.log('Admin mejl: admin@demo.zepter.test');
  console.log('Predsednik mejl: predsednik@demo.zepter.test');
  console.log('Lozinka je vrednost DEMO_SEED_PASSWORD iz server/.env.');
  console.log('Projekti, aktivnosti i izvestaji nisu menjani.');
} catch(e) { console.error('GRESKA:',e.message);process.exitCode=1; }
finally { await mongoose.disconnect(); }
