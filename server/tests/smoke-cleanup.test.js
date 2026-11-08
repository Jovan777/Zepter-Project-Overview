import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import {companySectors} from '../src/data/company-catalog.js';
import {periodRange} from '../src/lib/utils.js';

const execute=promisify(execFile);
for(const scenario of ['normal','unexpected-approved-candidate','interrupted'])test('Smoke sessions are revoked: '+scenario,async()=>{
 const created=new Set(),revoked=new Set();
 const server=http.createServer((req,res)=>{
  const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  if(req.url==='/health')return send({ok:true});
  if(req.url==='/api/public/sectors')return send({items:companySectors.map(({code,name})=>({_id:code,code,name}))});
  if(req.url==='/api/auth/login'){
   let raw='';req.on('data',part=>{raw+=part;});req.on('end',()=>{
    const tag=JSON.parse(raw).email.split('@')[0];
    if(tag==='registracija.na.cekanju'&&scenario!=='unexpected-approved-candidate')return send({},403);
    const cookie='test-session='+tag;created.add(cookie);res.setHeader('Set-Cookie',cookie+'; HttpOnly; Path=/');send({accessToken:tag});
   });return;
  }
  if(req.url==='/api/auth/logout'){revoked.add(req.headers.cookie);return send({ok:true});}
  if(req.url==='/api/admin/registrations')return scenario==='interrupted'?send({error:'Isolated error'},500):send({items:[{email:'registracija.na.cekanju@zepter.test',approval:'pending'}]});
  if(req.url==='/api/admin/users?limit=100')return send({items:[{email:'registracija.na.cekanju@zepter.test',approval:'pending'}]});
  const role=req.headers.authorization?.slice(7);
  if(req.url==='/api/projects')return send({total:role==='predsednik'?15:3});
  if(req.url.startsWith('/api/reports/preview')){const query=new URL(req.url,'http://localhost').searchParams,{start,end}=periodRange(query.get('type'),query.get('day'));return role==='zaposleni1.mkt'?send({},403):send({report:{scope:query.get('scope'),targetId:query.get('id'),type:query.get('type'),periodStart:start,periodEnd:end,stats:{workEntries:1},projects:[]}});}
  if(req.url==='/api/reports?limit=100')return send({total:20,items:[{type:'daily',periodEnd:'2026-11-07',status:'published'},{type:'weekly',periodEnd:'2026-11-08',status:'published'}]});
  if(req.url==='/api/ideas')return send({total:4,items:Array.from({length:5},()=>({status:'forwarded'}))});
  if(req.url==='/api/notifications')return send({unread:1});
  send({},404);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  let result;
  try{result=await execute(process.execPath,[fileURLToPath(new URL('../src/scripts/smoke-demo.js',import.meta.url))],{cwd:os.tmpdir(),env:{SystemRoot:process.env.SystemRoot,PORT:String(server.address().port),DEMO_SEED_PASSWORD:'isolated-test-value'},timeout:15000});}
  catch(error){result=error;}
  assert.equal(result.code||0,scenario==='normal'?0:1);
  assert.equal(created.size,scenario==='unexpected-approved-candidate'?5:4);
  assert.deepEqual(revoked,created);
  assert.match(result.stdout,/Odjavljeno testnih sesija: [45]/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
