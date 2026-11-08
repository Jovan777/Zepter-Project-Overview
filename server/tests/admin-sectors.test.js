import test from 'node:test';
import assert from 'node:assert/strict';
import admin from '../src/routes/admin.js';
import sectors from '../src/routes/sectors.js';
import auth from '../src/routes/auth.js';
import {Sector,Audit,User,Session} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';
import bcrypt from 'bcryptjs';
import {legacyLocalLogin} from '../src/lib/account-email.js';
const id='123456789012345678901234';
test('Admin creates a normalized new sector which is immediately visible in the sector feed',async t=>{
 let created; t.mock.method(Sector,'findOne',async()=>null);t.mock.method(Sector,'create',async value=>{created={_id:id,...value,active:true};return created;});t.mock.method(Audit,'create',async()=>({}));t.mock.method(Sector,'find',()=>query(created?[created]:[]));
 await withRoutes({_id:id,role:'admin'},[['/admin',admin],['/sectors',sectors]],async base=>{
  const response=await fetch(base+'/admin/sectors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'  Nabavka   i podrška ',code:'nab',description:'Novi sektor'})});
  assert.equal(response.status,201);assert.equal(created.name,'Nabavka i podrška');assert.equal(created.code,'NAB');
  assert.equal((await(await fetch(base+'/sectors')).json()).items[0]._id,id);
 });
});
test('Duplicate sectors and invalid inputs do not create records',async t=>{
 let count=0;t.mock.method(Sector,'findOne',async()=>({_id:id}));t.mock.method(Sector,'create',async()=>{count++;});
 await withRoutes({_id:id,role:'admin'},[['/admin',admin]],async base=>{
  const post=body=>fetch(base+'/admin/sectors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({name:'Logistika',code:'LOG'})).status,409);
  assert.equal((await post({name:'',code:'!'})).status,422);
 });assert.equal(count,0);
});
test('President, manager and employee cannot create a sector',async t=>{
 t.mock.method(Sector,'create',async()=>assert.fail('No unauthorized writes'));
 for(const role of ['president','manager','employee'])await withRoutes({_id:id,role},[['/admin',admin]],async base=>{
  assert.equal((await fetch(base+'/admin/sectors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Novi sektor',code:'NOVI'})})).status,403);
 });
});

test('A concurrent unique-code conflict returns a readable 409 without exposing database details',async t=>{
 t.mock.method(Sector,'findOne',async()=>null);t.mock.method(Sector,'create',async()=>{throw Object.assign(new Error('private database details'),{code:11000});});
 await withRoutes({_id:id,role:'admin'},[['/admin',admin]],async base=>{
  const response=await fetch(base+'/admin/sectors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Novi sektor',code:'NOVI'})});
  assert.equal(response.status,409);assert.doesNotMatch(await response.text(),/private database/);
 });
});

test('The legacy local email alias is disabled in production and never rewrites corporate addresses',t=>{
 const saved=process.env.NODE_ENV;t.after(()=>{if(saved===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=saved;});
 process.env.NODE_ENV='production';assert.equal(legacyLocalLogin('admin@demo.zepter.test'),null);
 process.env.NODE_ENV='development';assert.equal(legacyLocalLogin('user@company.example'),null);assert.equal(legacyLocalLogin('user@zepter.test'),null);
});
test('Old local login addresses retain password validation after migration to the canonical local domain',async t=>{
 const saved=process.env.JWT_SECRET;t.after(()=>{if(saved===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=saved;});process.env.JWT_SECRET='x'.repeat(64);
 const hash=await bcrypt.hash('only-for-this-isolated-test',4),calls=[];
 const user={_id:id,email:'admin@zepter.test',role:'admin',approval:'approved',sessionVersion:0,passwordHash:hash,save:async()=>{},toJSON(){return {_id:id,role:'admin',email:this.email};}};
 t.mock.method(User,'findOne',filter=>{calls.push(filter.email);return {select:async()=>filter.email===user.email?user:null};});t.mock.method(Session,'create',async()=>({}));
 await withRoutes({_id:id,role:'admin'},[['/auth',auth]],async base=>{
  const post=password=>fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@demo.zepter.test',password})});
  assert.equal((await post('only-for-this-isolated-test')).status,200);assert.equal((await post('wrong')).status,401);
 });assert.deepEqual(calls.slice(0,2),['admin@demo.zepter.test','admin@zepter.test']);
});
