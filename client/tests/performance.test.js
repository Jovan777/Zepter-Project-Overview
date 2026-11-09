import test from 'node:test';
import assert from 'node:assert/strict';
import {createInflightReads} from '../src/features/workspace/inflight.js';
import {waitForBackend} from '../src/startupReadiness.js';
import {proxyBackend} from '../deployment/proxy.js';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
test('Overlapping private reads share transport, independent cancellation does not abort another subscriber',async()=>{
 const store=createInflightReads(),pending=deferred(),first=new AbortController(),second=new AbortController();let loads=0,signal;
 const load=value=>{loads++;signal=value;return pending.promise;};
 const a=store.read('projects',load,first.signal),b=store.read('projects',load,second.signal);first.abort();await assert.rejects(a,{name:'AbortError'});assert.equal(signal.aborted,false);pending.resolve({ok:true});assert.deepEqual(await b,{ok:true});assert.equal(loads,1);
 await store.read('projects',load);assert.equal(loads,2,'Resolved private data is never cached');
});
test('When all subscribers leave the request is aborted and a later subscriber gets a new transport',async()=>{
 const store=createInflightReads(),controller=new AbortController(),pending=deferred();let signal,loads=0;
 const load=value=>{signal=value;loads++;return pending.promise;};const first=store.read('x',load,controller.signal);controller.abort();await assert.rejects(first,{name:'AbortError'});assert.equal(signal.aborted,true);
 const second=store.read('x',load);pending.resolve('ok');assert.equal(await second,'ok');assert.equal(loads,2);
});
test('Invalidation isolates sessions and mutations from already pending reads',async()=>{
 const store=createInflightReads(),pending=deferred();let calls=0;const load=()=>{calls++;return pending.promise;};
 const a=store.read('x',load);store.clear();const b=store.read('x',load);assert.equal(calls,2);pending.resolve('done');await Promise.all([a,b]);
});
test('Cold-start recovery retries only public readiness GETs and accepts zero private data',async()=>{
 let time=0,calls=0;const ready=await waitForBackend({now:()=>time,pause:async ms=>{time+=ms;},fetcher:async(url,options)=>{assert.equal(url,'/api/ready');assert.equal(options.cache,'no-store');assert.equal(options.credentials,'omit');calls++;return calls===1?new Response('<html>Waking</html>',{status:200}):calls===2?new Response('',{status:503}):Response.json({ok:true});}});
 assert.equal(ready,true);assert.equal(calls,3);
});
test('Readiness has a bounded deadline and abort never sends authentication or business writes',async()=>{
 let time=0,calls=0;await assert.rejects(waitForBackend({timeoutMs:3000,now:()=>time,pause:async ms=>{time+=ms;},fetcher:async()=>{calls++;return Response.json({ok:false},{status:503});}}),/Server trenutno/);assert.equal(calls,2);
 const controller=new AbortController();controller.abort();await assert.rejects(waitForBackend({signal:controller.signal,fetcher:async()=>assert.fail('No request after abort')}),{name:'AbortError'});
});
test('Pages proxy streams private requests without caching, preserves cookies and refuses arbitrary destinations',async()=>{
 const request=new Request('https://portal.pages.dev/api/auth/login',{method:'POST',headers:{Origin:'https://portal.pages.dev',Cookie:'zepter_refresh=synthetic','x-forwarded-for':'spoofed','cf-connecting-ip':'192.0.2.1'},body:'{}'});
 const response=await proxyBackend({request,env:{BACKEND_ORIGIN:'https://example.onrender.com'}},async upstream=>{
  assert.equal(upstream.url,'https://example.onrender.com/api/auth/login');assert.equal(upstream.headers.get('origin'),'https://portal.pages.dev');assert.equal(upstream.headers.get('cookie'),'zepter_refresh=synthetic');assert.equal(upstream.headers.get('x-forwarded-for'),'192.0.2.1');assert.equal(await upstream.text(),'{}');
  return new Response('{}',{headers:{'set-cookie':'zepter_refresh=new; HttpOnly; Secure; Path=/api/auth'}});
 });
 assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('set-cookie'),/HttpOnly/);
 assert.equal((await proxyBackend({request:new Request('https://portal.pages.dev/api/x'),env:{BACKEND_ORIGIN:'http://bad.example'}})).status,503);
 assert.equal((await proxyBackend({request:new Request('https://portal.pages.dev/president-zp-private'),env:{BACKEND_ORIGIN:'https://example.onrender.com'}})).status,404);
});
test('The proxy preserves WebSocket upgrades without rebuilding or reading their stream',async()=>{
 const upgrade={status:101,webSocket:{}};
 assert.equal(await proxyBackend({request:new Request('https://portal.pages.dev/socket.io/?EIO=4&transport=websocket',{headers:{Upgrade:'websocket'}}),env:{BACKEND_ORIGIN:'https://example.onrender.com'}},async()=>upgrade),upgrade);
});
test('The tiny HTML wake script starts one credential-free health check before the React application',async()=>{
 let requests=0;const window={location:{pathname:'/president-zp-synthetic-private-key'}},context={window,Date,AbortSignal,fetch:async(url,options)=>{requests++;assert.equal(url,'/api/ready');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');return Response.json({ok:true});}};
 vm.runInNewContext(await fs.readFile(new URL('../public/wake.js',import.meta.url),'utf8'),context);assert.equal(await window.__zepterWake,true);assert.equal(requests,1);assert.ok(window.__zepterWakeAt);
});
