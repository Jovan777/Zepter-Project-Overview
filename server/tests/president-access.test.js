import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import {once} from 'node:events';
import router from '../src/routes/auth.js';
import {User,Session,PresidentAccessLink} from '../src/models/index.js';
import {tokenDigest,verifyAccess,accessToken} from '../src/lib/auth.js';
import {errorHandler} from '../src/lib/errors.js';

const userId='77'.repeat(12),linkId='ec'.repeat(12);
let address=0;
async function fixture(t,run){
 const saved={JWT_SECRET:process.env.JWT_SECRET,CLIENT_ORIGIN:process.env.CLIENT_ORIGIN};
 t.after(()=>{for(const [key,value]of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
 process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');
 process.env.CLIENT_ORIGIN='https://app.example.test';
 const user={_id:userId,role:'president',approval:'approved',sessionVersion:0,save:async()=>{},toJSON(){return {_id:this._id,role:this.role,approval:this.approval};}};
 const key=crypto.randomBytes(24).toString('base64url'),link={_id:linkId,user:userId,tokenHash:tokenDigest(key),generation:1,revokedAt:null},sessions=[];
 const matches=(row,filter)=>Object.entries(filter).every(([key,value])=>value===null?row[key]==null:String(row[key])===String(value));
 t.mock.method(User,'findById',async()=>user);
 t.mock.method(PresidentAccessLink,'findById',async()=>link);
 t.mock.method(PresidentAccessLink,'findOne',async filter=>matches(link,filter)?link:null);
 t.mock.method(PresidentAccessLink,'findOneAndUpdate',async(filter,update)=>{if(!matches(link,filter))return null;Object.assign(link,update.$set);return link;});
 t.mock.method(Session,'create',async fields=>{const session={_id:crypto.randomBytes(12).toString('hex'),...fields,deleteOne:async()=>{session.revokedAt=new Date();}};sessions.push(session);return session;});
 t.mock.method(Session,'findOne',async filter=>sessions.find(s=>matches(s,filter))||null);
 t.mock.method(Session,'findOneAndUpdate',async(filter,update)=>{const session=sessions.find(s=>matches(s,filter));if(!session)return null;Object.assign(session,update.$set);return session;});
 t.mock.method(Session,'updateOne',async(filter,update)=>{const session=sessions.find(s=>matches(s,filter));if(session)Object.assign(session,update.$set);return {};});
 const app=express();app.set('trust proxy',1);app.use(express.json(),cookieParser());app.use('/auth',router);app.use(errorHandler);
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port;
 const post=async(path,body={},cookie,origin=process.env.CLIENT_ORIGIN,ip)=>fetch(base+'/auth/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Forwarded-For':ip||'192.0.2.'+(++address),Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const enter=()=>post('president-link',{key});
 try{await run({user,key,link,sessions,post,enter});}finally{await new Promise(resolve=>server.close(resolve));}
}
const cookie=response=>response.headers.get('set-cookie')?.split(';')[0];

test('A reusable personal link opens two independent president sessions with a private rotating cookie',async t=>fixture(t,async({enter,sessions,user,link})=>{
 const first=await enter(),second=await enter();assert.equal(first.status,200);assert.equal(second.status,200);
 const data=await first.json();assert.equal(data.user.role,'president');assert.equal(await verifyAccess(data.accessToken),user);
 assert.equal(first.headers.get('cache-control'),'no-store');
 assert.match(first.headers.get('set-cookie'),/HttpOnly/);assert.match(first.headers.get('set-cookie'),/SameSite=Strict/);
 assert.notEqual(cookie(first),cookie(second));assert.equal(sessions.length,2);
 assert.equal(sessions[0].presidentLink,link._id);assert.equal(sessions[0].presidentLinkGeneration,1);
 assert.equal(Object.hasOwn(data,'key'),false);assert.equal(Object.hasOwn(data,'refresh'),false);
}));

test('Malformed, changed, expired and revoked keys cannot create a session',async t=>fixture(t,async({key,post,link,sessions})=>{
 for(const candidate of [undefined,'short','x'.repeat(32),key+'?'])assert.equal((await post('president-link',{key:candidate})).status,401);
 link.expiresAt=new Date(Date.now()-1000);assert.equal((await post('president-link',{key})).status,401);
 link.expiresAt=null;link.revokedAt=new Date();assert.equal((await post('president-link',{key})).status,401);
 assert.equal(sessions.length,0);
}));

test('The link cannot elevate an employee, manager, administrator or disabled president, and rejects foreign origins',async t=>fixture(t,async({user,key,post,sessions})=>{
 for(const role of ['employee','manager','admin']){user.role=role;assert.equal((await post('president-link',{key})).status,401);}
 user.role='president';user.approval='disabled';assert.equal((await post('president-link',{key})).status,401);
 user.approval='approved';assert.equal((await post('president-link',{key},null,'https://foreign.example.test')).status,403);
 assert.equal(sessions.length,0);
}));

test('Refresh keeps the link binding and rotates once; replacing the link revokes existing access and refresh',async t=>fixture(t,async({enter,post,link,sessions})=>{
 const opened=await enter(),initial=await opened.json(),oldCookie=cookie(opened);
 const renewed=await post('refresh',{},oldCookie);assert.equal(renewed.status,200);
 const data=await renewed.json();assert.ok(await verifyAccess(data.accessToken));assert.equal(sessions[1].presidentLinkGeneration,1);
 assert.equal((await post('refresh',{},oldCookie)).status,401);
 link.generation++;assert.equal(await verifyAccess(initial.accessToken),null);assert.equal(await verifyAccess(data.accessToken),null);
 assert.equal((await post('refresh',{},cookie(renewed))).status,401);
}));

test('Link revocation and account changes invalidate access; ordinary password sessions remain independent',async t=>fixture(t,async({enter,link,user})=>{
 const response=await enter(),data=await response.json(),ordinary=accessToken(user);
 link.revokedAt=new Date();assert.equal(await verifyAccess(data.accessToken),null);assert.equal(await verifyAccess(ordinary),user);
 link.revokedAt=null;user.role='manager';assert.equal(await verifyAccess(data.accessToken),null);
 user.role='president';user.approval='disabled';assert.equal(await verifyAccess(data.accessToken),null);
}));

test('A concurrent link replacement cannot mint a session from the previous key',async t=>fixture(t,async({enter,sessions})=>{
 t.mock.method(PresidentAccessLink,'findOneAndUpdate',async()=>null);
 assert.equal((await enter()).status,401);assert.equal(sessions.length,0);
}));

test('Guessing personal links is limited independently of normal password login',async t=>fixture(t,async({post,sessions})=>{
 for(let i=0;i<12;i++)assert.equal((await post('president-link',{key:'short'},null,process.env.CLIENT_ORIGIN,'198.51.100.23')).status,401);
 assert.equal((await post('president-link',{key:'short'},null,process.env.CLIENT_ORIGIN,'198.51.100.23')).status,429);
 assert.equal(sessions.length,0);
}));
