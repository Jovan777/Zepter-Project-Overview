import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {revokeMarkedReadSession} from './helpers/live-session-cleanup.mjs';
const config={uri:'mongodb://127.0.0.1:27017/zepter_management_demo',cookie:'zepter_refresh=test-only-random-value',userId:'123456789012345678901234',device:'zepter-president-read-check/12345678-abcd-abcd-abcd-123456789012'};
test('Fallback revokes exactly the locally marked test session and disconnects',async()=>{
 let connected=0,disconnected=0;
 await revokeMarkedReadSession(config,{connect:async uri=>{assert.equal(uri,config.uri);connected++;},disconnect:async()=>{disconnected++;},Model:{updateOne:async(filter,change)=>{
  assert.deepEqual(filter,{user:config.userId,device:config.device,tokenHash:crypto.createHash('sha256').update('test-only-random-value').digest('hex'),revokedAt:null});
  assert.ok(change.$set.revokedAt instanceof Date);return {modifiedCount:1};
 }}});
 assert.equal(connected,1);assert.equal(disconnected,1);
});
test('Fallback refuses a different database, unmarked session or missing credential before connecting',async()=>{
 const dependencies={connect:async()=>assert.fail('Must not connect'),disconnect:async()=>assert.fail('Must not disconnect')};
 for(const patch of [{uri:'mongodb://127.0.0.1:27017/production'},{uri:'mongodb://example.test:27017/zepter_management_demo'},{cookie:''},{device:'node'},{userId:''}])await assert.rejects(revokeMarkedReadSession({...config,...patch},dependencies));
});
test('Fallback confirms an already revoked session and reports a missing one without a broader update',async()=>{
 let query,updates=0,closed=0;
 const Model={updateOne:async()=>{updates++;return {modifiedCount:0};},findOne:filter=>{query=filter;return {select:()=>({lean:async()=>({revokedAt:new Date()})})};}};
 const dependencies={connect:async()=>{},disconnect:async()=>{closed++;},Model};
 await revokeMarkedReadSession(config,dependencies);assert.equal(query.device,config.device);assert.equal(query.user,config.userId);assert.equal(Object.keys(query).length,3);
 Model.findOne=()=>({select:()=>({lean:async()=>null})});
 await assert.rejects(revokeMarkedReadSession(config,dependencies),/exact test session/);assert.equal(updates,2);assert.equal(closed,2);
});
