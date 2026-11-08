import test from 'node:test';
import assert from 'node:assert/strict';
import {Router} from 'express';
import cookieParser from 'cookie-parser';
import admin from '../src/routes/admin.js';
import auth from '../src/routes/auth.js';
import {User,Sector,Project,Activity,Idea,Assignment,DecisionRequest,Session,Audit} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';

const uid='111111111111111111111111',sid='222222222222222222222222',other='333333333333333333333333',aid='444444444444444444444444',stamp=new Date('2026-11-09T08:00Z');
function fixture(t,extra={}){
 const state={user:{_id:uid,firstName:'Test',lastName:'Korisnik',email:'user@isolated.test',passwordHash:'private-hash',role:'employee',approval:'approved',sector:sid,sessionVersion:0,updatedAt:stamp,...extra},sector:{_id:sid,name:'Sektor',active:true},writes:0,revoked:0,events:[]};
 t.mock.method(User,'findById',async()=>User.hydrate(state.user));t.mock.method(User,'exists',async()=>null);
 t.mock.method(Sector,'findById',async id=>({...state.sector,_id:String(id)}));
 t.mock.method(Sector,'findOneAndUpdate',async(filter,update)=>{if(state.sector.manager&&String(state.sector.manager)!==uid)return null;Object.assign(state.sector,update.$set);return state.sector;});
 t.mock.method(Sector,'updateOne',async()=>{delete state.sector.manager;return {modifiedCount:1};});
 t.mock.method(Sector,'updateMany',async()=>{delete state.sector.manager;return {modifiedCount:1};});
 t.mock.method(User,'findOneAndUpdate',async(filter,update)=>{assert.equal(filter.updatedAt.getTime(),state.user.updatedAt.getTime());Object.assign(state.user,update.$set,{updatedAt:new Date(stamp.getTime()+1000)});state.writes++;return User.hydrate(state.user);});
 for(const Model of [Project,Activity,Idea,Assignment,DecisionRequest])t.mock.method(Model,'exists',async()=>null);
 t.mock.method(Session,'updateMany',async()=>{state.revoked++;return {modifiedCount:1};});t.mock.method(Audit,'create',async value=>{state.events.push(value);return value;});
 return state;
}
const route=(run)=>withRoutes({_id:aid,role:'admin'},[['/admin',admin]],base=>run((path,body={},headers={})=>fetch(base+'/admin/'+path,{method:'PATCH',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}),base));

test('Registration requires an explicit final role and sector; requestedManager never grants authority',async t=>{
 const state=fixture(t,{approval:'pending',requestedManager:true});
 await route(async patch=>{const response=await patch('users/'+uid+'/approve',{role:'employee',sectorId:sid});assert.equal(response.status,200);const data=await response.json();assert.equal(data.user.role,'employee');assert.equal(data.user.approval,'approved');assert.equal(data.user.passwordHash,undefined);});
 assert.equal(state.sector.manager,undefined);assert.equal(state.revoked,1);assert.equal(state.events[0].action,'admin.user_approved');
});
test('User role promotion claims sector leadership and invalidates old access',async t=>{
 const state=fixture(t);
 await route(async patch=>assert.equal((await patch('users/'+uid,{role:'manager'})).status,200));
 assert.equal(state.user.role,'manager');assert.equal(String(state.sector.manager),uid);assert.equal(state.user.sessionVersion,1);assert.equal(state.revoked,1);
});
test('A second manager is rejected without changing the user or revoking sessions',async t=>{
 const state=fixture(t);state.sector.manager=other;
 await route(async patch=>assert.equal((await patch('users/'+uid,{role:'manager'})).status,409));assert.equal(state.writes,0);assert.equal(state.revoked,0);
});
test('A failed user compare-and-set releases only the newly claimed manager slot',async t=>{
 const state=fixture(t);t.mock.method(User,'findOneAndUpdate',async()=>null);
 await route(async patch=>assert.equal((await patch('users/'+uid,{role:'manager'})).status,409));assert.equal(state.sector.manager,undefined);assert.equal(state.user.role,'employee');
});
test('Deactivation keeps work references, revokes sessions, and releases leadership; reactivation restores it',async t=>{
 const state=fixture(t,{role:'manager'});state.sector.manager=uid;
 await route(async patch=>{assert.equal((await patch('users/'+uid+'/disable')).status,200);assert.equal(state.sector.manager,undefined);assert.equal(state.user.approval,'disabled');assert.equal((await patch('users/'+uid+'/activate')).status,200);});
 assert.equal(state.user.approval,'approved');assert.equal(state.user.sector,sid);assert.equal(String(state.sector.manager),uid);assert.equal(state.user.sessionVersion,2);assert.equal(state.revoked,2);
});
test('Reactivation cannot create a second active manager',async t=>{
 const state=fixture(t,{role:'manager',approval:'disabled'});state.sector.manager=other;
 await route(async patch=>assert.equal((await patch('users/'+uid+'/activate')).status,409));assert.equal(state.user.approval,'disabled');assert.equal(state.writes,0);
});
test('Sector transfer checks project memberships, activity assignments and ideas before writing',async t=>{
 const state=fixture(t);t.mock.method(Project,'exists',async()=>({_id:other}));
 await route(async patch=>assert.equal((await patch('users/'+uid,{sectorId:other})).status,409));assert.equal(state.user.sector,sid);assert.equal(state.writes,0);
});
test('A manager with an unresolved presidential assignment cannot be demoted',async t=>{
 const state=fixture(t,{role:'manager'});t.mock.method(Assignment,'exists',async()=>({_id:other}));
 await route(async patch=>assert.equal((await patch('users/'+uid,{role:'employee'})).status,409));assert.equal(state.user.role,'manager');assert.equal(state.writes,0);
});
test('Free users can move sector while profile-only changes retain their sessions',async t=>{
 const state=fixture(t);
 await route(async patch=>{assert.equal((await patch('users/'+uid,{jobTitle:'Novo radno mesto'})).status,200);assert.equal(state.revoked,0);assert.equal((await patch('users/'+uid,{sectorId:other})).status,200);});
 assert.equal(String(state.user.sector),other);assert.equal(state.revoked,1);assert.equal(state.user.passwordHash,'private-hash');
});
test('Protected accounts and privilege injection are refused; stale updates never write',async t=>{
 const state=fixture(t);
 await route(async patch=>{
  assert.equal((await patch('users/'+uid,{role:'admin'})).status,422);
  assert.equal((await patch('users/'+uid,{jobTitle:'Promena'},{'If-Match':'"old"'})).status,409);
  for(const role of ['president','admin']){state.user.role=role;for(const suffix of ['', '/approve','/reject','/disable','/activate'])assert.equal((await patch('users/'+uid+suffix,suffix==='/approve'?{role:'employee'}:suffix===''?{role:'employee'}:{})).status,403);}
 });assert.equal(state.writes,0);
});
test('All non-admin roles are denied overview, account details, editing, activation and audit',async()=>{
 for(const role of ['employee','manager','president'])await withRoutes({_id:uid,role},[['/admin',admin]],async base=>{
  for(const path of ['/overview','/users','/users/'+uid,'/audit'])assert.equal((await fetch(base+'/admin'+path)).status,403);
  for(const path of ['/users/'+uid,'/users/'+uid+'/activate'])assert.equal((await fetch(base+'/admin'+path,{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
 });
});
test('User search escapes regex input, validates filters and paginates a stable result',async t=>{
 let filter;t.mock.method(User,'find',value=>{filter=value;return query([]);});t.mock.method(User,'countDocuments',async()=>0);
 await route(async(_patch,base)=>{const response=await fetch(base+'/admin/users?q=%5B.*%5D&approval=disabled&role=employee&page=2&limit=12');assert.equal(response.status,200);assert.equal((await response.json()).page,2);assert.equal(filter.approval,'disabled');assert.equal(filter.$and[0].$or[0].firstName.$regex,'\\[\\.\\*\\]');assert.equal((await fetch(base+'/admin/users?role=unknown')).status,422);});
});
test('A concurrent refresh from an old account version cannot regain newly changed privileges',async t=>{
 let creates=0;t.mock.method(Session,'findOne',async()=>({user:uid,tokenHash:'test',expiresAt:new Date(Date.now()+60000),sessionVersion:0}));t.mock.method(User,'findById',async()=>({role:'manager',approval:'approved',sessionVersion:1}));t.mock.method(Session,'create',async()=>{creates++;});
 const wrapper=Router();wrapper.use(cookieParser(),auth);
 await withRoutes({_id:aid,role:'admin'},[['/auth',wrapper]],async base=>assert.equal((await fetch(base+'/auth/refresh',{method:'POST',headers:{Cookie:'zepter_refresh=isolated-only'}})).status,401));assert.equal(creates,0);
});
