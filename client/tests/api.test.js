import test from 'node:test';
import assert from 'node:assert/strict';
import {api,bootstrap,setToken,disconnectSocket,logoutSession} from '../src/api.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture(t){
 const previous=globalThis.window,target=new EventTarget();globalThis.window=target;t.after(()=>{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;});
 setToken('initial-test-token');t.after(()=>{setToken(null);disconnectSocket();});return target;
}
test('Concurrent 401s share one refresh, preserve request bodies and never cache private responses',async t=>{
 fixture(t);const release=deferred();let refreshes=0,successes=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(options.cache,'no-store');
  if(url==='/api/ideas')assert.deepEqual(JSON.parse(options.body),{title:'Test proposal'});
  if(url==='/api/auth/refresh'){refreshes++;await release.promise;return json({accessToken:'renewed-test-token'});}
  if(options.headers.Authorization==='Bearer initial-test-token')return json({error:'expired'},401);
  assert.equal(options.headers.Authorization,'Bearer renewed-test-token');successes++;return json({ok:true});
 });
 const first=api('/projects'),second=api('/ideas',{method:'POST',body:{title:'Test proposal'}});await new Promise(r=>setImmediate(r));release.resolve();
 assert.deepEqual(await Promise.all([first,second]),[{ok:true},{ok:true}]);assert.equal(refreshes,1);assert.equal(successes,2);
});
test('Logout during refresh cannot restore the old access token',async t=>{
 fixture(t);const response=deferred();
 t.mock.method(globalThis,'fetch',async url=>url==='/api/auth/refresh'?response.promise:json({ok:true}));
 const pending=bootstrap();setToken(null);response.resolve(json({accessToken:'obsolete-test-token'}));assert.equal(await pending,null);
 await api('/projects',{retry:false});assert.equal(globalThis.fetch.mock.calls.at(-1).arguments[1].headers.Authorization,undefined);
});
test('An old response is discarded after switching users',async t=>{
 fixture(t);const response=deferred();t.mock.method(globalThis,'fetch',()=>response.promise);
 const pending=api('/projects');setToken('another-user-test-token');response.resolve(json({private:'old-user-data'}));
 await assert.rejects(pending,{name:'AbortError'});
});

test('A late 401 from the old user cannot start a new refresh after logout',async t=>{
 fixture(t);const response=deferred(),calls=[];t.mock.method(globalThis,'fetch',url=>{calls.push(url);return response.promise;});
 const pending=api('/projects');setToken(null);response.resolve(json({error:'expired'},401));await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(calls,['/api/projects']);
});

test('Server logout waits for an in-flight cookie rotation before clearing the session',async t=>{
 fixture(t);const response=deferred(),calls=[];
 t.mock.method(globalThis,'fetch',async url=>{calls.push(url);return url==='/api/auth/refresh'?response.promise:json({ok:true});});
 const refresh=bootstrap(),logout=logoutSession();await new Promise(r=>setImmediate(r));assert.deepEqual(calls,['/api/auth/refresh']);
 response.resolve(json({accessToken:'obsolete-test-token'}));await Promise.all([refresh,logout]);assert.deepEqual(calls,['/api/auth/refresh','/api/auth/logout']);
 assert.equal(globalThis.fetch.mock.calls.at(-1).arguments[1].headers.Authorization,undefined);
});
test('Temporary refresh failure retains login, terminal failure expires it once',async t=>{
 const window=fixture(t);let expired=0;window.addEventListener('zepter:session-expired',()=>expired++);let terminal=false;
 t.mock.method(globalThis,'fetch',async url=>url==='/api/auth/refresh'?json({error:'refresh failure'},terminal?401:503):json({error:'expired'},401));
 await assert.rejects(api('/projects'),{status:503});assert.equal(expired,0);
 terminal=true;await assert.rejects(api('/projects'));assert.equal(expired,1);
});

test('Identical GETs share one authenticated transport, but a later read and every write remain fresh',async t=>{
 fixture(t);const pending=deferred();let gets=0,writes=0;
 t.mock.method(globalThis,'fetch',async(_url,options)=>{
  assert.equal(options.cache,'no-store');assert.equal(options.headers.Authorization,'Bearer initial-test-token');
  if(options.method==='POST'){writes++;return json({ok:true});}gets++;return pending.promise.then(response=>response.clone());
 });
 const a=api('/projects'),b=api('/projects');assert.equal(gets,1);pending.resolve(json({items:[]}));await Promise.all([a,b]);
 await api('/projects');assert.equal(gets,2);
 await Promise.all([api('/ideas',{method:'POST',body:{title:'A'}}),api('/ideas',{method:'POST',body:{title:'A'}})]);assert.equal(writes,2);
});
