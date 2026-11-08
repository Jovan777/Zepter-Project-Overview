import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {User,PresidentAccessLink} from '../src/models/index.js';
import {bindPresidentSocket,emitAuthorized} from '../src/lib/president-socket.js';
const userId='77'.repeat(12),linkId='ec'.repeat(12);
test('Socket events revalidate personal access and disconnect revoked links before sending private notifications',async t=>{
 const user={_id:userId,role:'president',approval:'approved'},link={_id:linkId,user:userId,generation:1};
 t.mock.method(User,'findById',async()=>user);t.mock.method(PresidentAccessLink,'findById',async()=>link);
 const sent=[],closed=[],socket={data:{},emit:(...args)=>sent.push(args),disconnect:()=>closed.push(true)};
 const token=jwt.sign({pl:linkId,plg:1,sub:userId,sv:0},'synthetic-test-signing-key',{expiresIn:'15m'});
 bindPresidentSocket(socket,token);assert.equal(Object.values(socket.data).includes(token),false);
 const io={in:()=>({fetchSockets:async()=>[socket]})};
 await emitAuthorized(io,'presidents','notification:new',{title:'Test'});assert.equal(sent.length,1);
 link.revokedAt=new Date();await emitAuthorized(io,'presidents','notification:new',{title:'Private'});assert.equal(sent.length,1);assert.equal(closed.length,1);
});
test('Expired and disabled personal socket sessions fail closed while ordinary connections keep existing behavior',async t=>{
 const binding={id:linkId,generation:1,userId,expiresAt:Date.now()+60000};
 const user={_id:userId,role:'president',approval:'disabled'};
 t.mock.method(User,'findById',async()=>user);t.mock.method(PresidentAccessLink,'findById',async()=>({_id:linkId,user:userId,generation:1}));
 let emitted=0,disconnected=0;const socket=data=>({data,emit:()=>emitted++,disconnect:()=>disconnected++});
 const io={in:()=>({fetchSockets:async()=>[socket({presidentAccess:binding}),socket({presidentAccess:{...binding,expiresAt:0}}),socket({})]})};
 await emitAuthorized(io,'presidents','data:changed',{});assert.equal(emitted,1);assert.equal(disconnected,2);
});

test('Administrative role, sector and account-version changes stop private events on ordinary user sockets',async t=>{
 const user={_id:userId,role:'manager',approval:'approved',sector:'aa'.repeat(12),sessionVersion:0};
 t.mock.method(User,'findById',async()=>user);
 let sent=0,closed=0;const socket={data:{},emit:()=>sent++,disconnect:()=>closed++};
 bindPresidentSocket(socket,jwt.sign({sub:userId,sv:0},'synthetic-only',{expiresIn:'15m'}),user);
 const io={in:()=>({fetchSockets:async()=>[socket]})};
 await emitAuthorized(io,'sector:'+user.sector,'data:changed',{});assert.equal(sent,1);
 const original={...user};
 for(const change of [{role:'employee'},{sector:'bb'.repeat(12)},{sessionVersion:1},{approval:'disabled'}]){
  Object.assign(user,original,change);await emitAuthorized(io,'sector:'+original.sector,'notification:new',{title:'Private'});
 }
 assert.equal(sent,1);assert.equal(closed,4);
});
