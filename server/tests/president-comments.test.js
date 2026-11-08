import test from 'node:test';
import assert from 'node:assert/strict';
import comments from '../src/routes/comments.js';
import {presidentComments} from '../src/services/president-comments.js';
import {Comment,Sector,Project,Activity,Idea,Assignment,DecisionRequest} from '../src/models/index.js';
import {withRoutes} from './helpers/http.mjs';
const id=n=>n.toString(16).padStart(24,'0'),account={_id:id(1),role:'president'},sector=id(2),other=id(3);
const same=(a,b)=>String(a?._id||a||'')===String(b?._id||b||'');
function matches(row,filter){return Object.entries(filter).every(([key,value])=>{const actual=row[key];if(value&&typeof value==='object'){if('$in'in value)return value.$in.some(v=>same(v,actual));if('$ne'in value)return !same(value.$ne,actual);}return same(value,actual);});}
function fixture(t){
 const stamp=new Date('2026-11-08T10:00Z'),own=[];
 const targets={sector,project:id(10),activity:id(11),idea:id(12),assignment:id(13),request:id(14)};
 for(let i=0;i<24;i++){const targetType=Object.keys(targets)[i%6];own.push({_id:id(100+i),author:account._id,targetType,targetId:targets[targetType],kind:i%2?'comment':'instruction',body:'Moja poruka '+i,responseStatus:'open',createdAt:stamp});}
 const reply=(parent,n,fields={})=>({_id:id(n),author:other,parent:parent._id,targetType:parent.targetType,targetId:parent.targetId,body:'Odgovor '+n,createdAt:new Date(stamp.getTime()+n*1000),...fields});
 const records=[...own,reply(own[0],200),reply(own[0],201),reply(own[0],202,{author:account._id}),reply(own[1],203),reply(own[2],204,{targetId:id(999)}),reply(own[3],205,{targetType:'activity'}),reply(own[4],206,{author:account._id}),reply(own[5],207)];
 own[0].responseStatus='answered';own[5].responseStatus='resolved';own[6].responseStatus='answered';
 records.push({_id:id(300),author:other,targetType:'project',targetId:targets.project,body:'FOREIGN_PRESIDENT_PRIVATE',kind:'instruction',responseStatus:'open',createdAt:stamp});
 const sources=new Map([[Sector,[{_id:sector,name:'Marketing'}]],[Project,[{_id:targets.project,title:'Stvarni projekat',sector}]],[Activity,[{_id:targets.activity,title:'Stvarna aktivnost',sector,project:targets.project}]],[Idea,[{_id:targets.idea,title:'Prosleđena ideja',sector,status:'forwarded'}]],[Assignment,[{_id:targets.assignment,title:'Zaduženje',sector}]],[DecisionRequest,[{_id:targets.request,title:'Zahtev',sector}]]]);
 const q=values=>{let selected=[...values],populate=false;const result=()=>selected.map(row=>({...row,...(populate?{author:{_id:row.author,firstName:'Test',lastName:'Zaposleni',role:'employee',email:'PRIVATE_EMAIL',passwordHash:'PRIVATE_HASH'}}:{})}));const query={select:()=>query,populate:()=>{populate=true;return query;},lean:async()=>result(),then:(yes,no)=>Promise.resolve(result()).then(yes,no),skip:n=>{selected=selected.slice(n);return query;},limit:n=>{selected=selected.slice(0,n);return query;},sort:order=>{selected.sort((a,b)=>{for(const [key,direction]of Object.entries(order)){if(a[key]>b[key])return direction;if(a[key]<b[key])return -direction;}return 0;});return query;}};return query;};
 t.mock.method(Comment,'find',filter=>q(records.filter(row=>matches(row,filter))));
 t.mock.method(Comment,'countDocuments',async filter=>records.filter(row=>matches(row,filter)).length);
 for(const [Model,rows]of sources)t.mock.method(Model,'find',filter=>q(rows.filter(row=>matches(row,filter))));
 return {own,records,sources,targets,reply};
}
test('History is limited to the session author, paginates every type and returns global counts without secrets',async t=>{
 fixture(t);const first=await presidentComments(account,{author:other,limit:50}),pages=await Promise.all([2,3].map(page=>presidentComments(account,{page})));
 assert.equal(first.items.length,8);assert.equal(first.total,26);assert.equal(new Set([...first.items,...pages.flatMap(p=>p.items)].map(c=>c._id)).size,24);
 // The president’s two follow-up replies are also part of their history.
 const last=await presidentComments(account,{page:4});assert.equal(last.items.length,2);
 assert.equal(first.stats.open+first.stats.answered+first.stats.resolved+first.stats.unavailable,first.stats.total);
 assert.deepEqual(first.stats,pages[1].stats);assert.doesNotMatch(JSON.stringify(first),/FOREIGN_PRESIDENT_PRIVATE|PRIVATE_EMAIL|PRIVATE_HASH|passwordHash/);
 for(const row of first.items){assert.ok(row.link.includes('?commentId='+row._id));assert.ok(row.target.title);}
});
test('Only an actual foreign reply in the same conversation becomes the preview; self-followups and forged contexts do not answer',async t=>{
 const f=fixture(t),all=(await Promise.all([1,2,3,4].map(page=>presidentComments(account,{page})))).flatMap(p=>p.items),find=i=>all.find(row=>row._id===f.own[i]._id);
 assert.equal(find(0).reply._id,id(201));assert.equal(find(0).status,'answered');assert.equal(find(1).status,'answered');
 for(const index of [2,3,4]){assert.equal(find(index).status,'open');assert.equal(find(index).reply,null);}
 assert.equal(find(5).status,'resolved');assert.ok(find(5).reply);assert.equal(find(6).status,'answered');assert.equal(find(6).reply,null);
 assert.equal(find(2).target.projectTitle,'Stvarni projekat');
});
test('Status and type filters apply before pagination and do not redefine global statistics',async t=>{
 fixture(t);const all=await presidentComments(account),answered=await presidentComments(account,{status:'answered',targetType:'project'});
 assert.equal(answered.items.length,1);assert.equal(answered.items[0]._id,id(101));assert.deepEqual(answered.stats,all.stats);
 assert.equal((await presidentComments(account,{targetType:'assignment'})).stats.byType.assignment,5);
 const empty=await presidentComments(account,{status:'resolved',targetType:'activity'});assert.equal(empty.total,0);assert.deepEqual(empty.items,[]);
});
test('Missing targets preserve only the president’s history; private ideas and orphan activity links never escape',async t=>{
 const f=fixture(t);f.sources.get(Idea)[0].status='submitted';f.sources.get(Project).splice(0);f.sources.get(DecisionRequest).splice(0);
 const all=(await Promise.all([1,2,3,4].map(page=>presidentComments(account,{page})))).flatMap(p=>p.items);
 assert.equal(all.some(row=>row.targetType==='idea'),false);
 for(const row of all.filter(row=>['project','activity','request'].includes(row.targetType))){assert.equal(row.status,'unavailable');assert.equal(row.link,null);assert.equal(row.reply,null);}
 assert.ok(all.find(row=>row._id===id(100)).link.startsWith('/sectors/'));
});
test('Roles and malformed filters are rejected before reading history; the existing legacy endpoint remains compatible',async t=>{
 fixture(t);for(const role of ['employee','manager','admin'])await assert.rejects(presidentComments({...account,role}),e=>e.status===403);
 for(const query of [{status:'fake'},{targetType:'constructor'},{status:['open']},{targetType:['idea']}])await assert.rejects(presidentComments(account,query),e=>e.status===422);
 await withRoutes(account,[['/comments',comments]],async base=>{const response=await fetch(base+'/comments/mine/president?author='+other);assert.equal(response.status,200);assert.equal((await response.json()).total,26);const legacy=await fetch(base+'/comments/mine/instructions?status=answered');assert.equal(legacy.status,200);const data=await legacy.json();assert.equal(data.total,2);assert.equal(data.stats,undefined);assert.ok(data.items.every(row=>row.author===account._id&&row.responseStatus==='answered'));});
});
test('An empty history has valid zero counters and bounded integer pagination',async t=>{
 const f=fixture(t);f.records.splice(0);const result=await presidentComments(account,{page:'2.9',limit:1000});
 assert.deepEqual(result.items,[]);assert.equal(result.page,2);assert.equal(result.limit,8);assert.equal(result.total,0);assert.equal(result.stats.total,0);assert.ok(Object.values(result.stats.byType).every(n=>n===0));
});
