import test from 'node:test';
import assert from 'node:assert/strict';
import {User,PresidentAccessLink} from '../src/models/index.js';
import {tokenDigest} from '../src/lib/auth.js';
import {requireLocalPresidentSetup,localPresidentAccount,ensurePermanentPresidentLink} from '../src/services/president-setup.js';
const env={MONGODB_URI:'mongodb://127.0.0.1:27017/zepter_management_demo',CLIENT_ORIGIN:'http://localhost:5173'};
const user={_id:'77'.repeat(12),role:'president',approval:'approved'};
const key='AbcDef234567';

test('Local president setup refuses production, other databases, remote hosts and embedded credentials',()=>{
 assert.doesNotThrow(()=>requireLocalPresidentSetup(env));
 for(const overrides of [{NODE_ENV:'production'},{MONGODB_URI:'mongodb://127.0.0.1:27017/another_database'},{MONGODB_URI:'mongodb://remote.example.test:27017/zepter_management_demo'},{CLIENT_ORIGIN:'https://portal.example.test'},{CLIENT_ORIGIN:'http://user:pass@localhost:5173'},{MONGODB_URI:'mongodb://127.0.0.1:27017/zepter_management_demo?replicaSet=other'},{MONGODB_URI:'mongodb://127.0.0.1:27017/zepter_president_setup_test_'+'a'.repeat(24)}])assert.throws(()=>requireLocalPresidentSetup({...env,...overrides}));
});

test('Setup reuses an approved president and never changes existing accounts or a disabled president',async t=>{
 t.mock.method(User,'find',()=>({limit:async()=>[user]}));
 t.mock.method(User,'create',()=>assert.fail('An existing account must not be replaced.'));
 assert.deepEqual(await localPresidentAccount(env),{user,created:false});
 t.mock.method(User,'find',()=>({limit:async()=>[{...user,approval:'disabled'}]}));
 await assert.rejects(localPresidentAccount(env),/nije aktivan/);
});

test('The same saved key keeps its generation, expiry, timestamps and existing sessions untouched',async t=>{
 const link={_id:'ec'.repeat(12),user:user._id,tokenHash:tokenDigest(key),generation:7,revokedAt:null,expiresAt:null,lastUsedAt:new Date()};
 t.mock.method(PresidentAccessLink,'findOneAndUpdate',(filter,update,options)=>{
  assert.deepEqual(filter,{user:user._id});assert.equal(Object.hasOwn(update,'$set'),false);assert.equal(Object.hasOwn(update,'$inc'),false);assert.equal(options.timestamps,false);
  return {select:async()=>link};
 });
 assert.equal(await ensurePermanentPresidentLink(user,key),link);
 assert.equal(link.generation,7);
});

test('Setup does not replace another key or reactivate an expired or revoked link',async t=>{
 for(const overrides of [{tokenHash:tokenDigest('OtherKey2345')},{revokedAt:new Date()},{expiresAt:new Date(Date.now()-1000)}]){
  t.mock.method(PresidentAccessLink,'findOneAndUpdate',()=>({select:async()=>({tokenHash:tokenDigest(key),generation:1,...overrides})}));
  await assert.rejects(ensurePermanentPresidentLink(user,key));
 }
 for(const candidate of [{...user,role:'employee'},{...user,role:'manager'},{...user,role:'admin'},{...user,approval:'disabled'}])await assert.rejects(ensurePermanentPresidentLink(candidate,key));
});
