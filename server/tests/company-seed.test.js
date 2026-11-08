import test from 'node:test';
import assert from 'node:assert/strict';
import {companySectors} from '../src/data/company-catalog.js';
import {planCompanySeed,legacySeedId,companySeedId,applyCompanySeed,cleanCompanyText} from '../src/services/company-seed.js';
const stamp=new Date('2026-11-08T10:00Z');
test('Company catalog has the twelve requested distinct sectors and no invented users or completed work',()=>{
 assert.equal(companySectors.length,12);assert.equal(new Set(companySectors.map(s=>s.name)).size,12);
 assert.equal(companySectors.filter(s=>s.name==='Logistika').length,1);
 const operations=planCompanySeed({});assert.ok(operations.length>12);
 assert.ok(operations.every(o=>['Sector','Project','Activity'].includes(o.model)));
 for(const op of operations.filter(o=>['Project','Activity'].includes(o.model))){assert.equal(op.after.status,'planned');assert.equal(op.after.progress,0);assert.ok(!op.after.owner&&!op.after.passwordHash);}
 assert.doesNotMatch(JSON.stringify(operations),/DEMO\s*\||Demo Predsednik|@demo\.zepter\.test/);
});
test('Existing IDs, assignments, status and work are preserved while seeded labels and local addresses change',()=>{
 const pid=legacySeedId('project','DEMO_IT:p0'),sid=legacySeedId('sector','DEMO_IT');
 const snapshot={Sector:[{_id:sid,name:'DEMO | IT',code:'DEMO_IT',description:'Testni sektor: IT',manager:'m',active:true,updatedAt:stamp}],User:[{_id:'p',firstName:'Demo',lastName:'Predsednik',email:'predsednik@demo.zepter.test',role:'president',passwordHash:'PRIVATE',updatedAt:stamp}],Project:[{_id:pid,title:'DEMO | Migracija CMS platforme',description:'Sačuvan opis',status:'active',owner:'m',members:['m'],progress:47,updatedAt:stamp}],Activity:[{_id:'a',title:'DEMO | Analiza',actualWork:'Sačuvan rad',assignees:['e'],status:'blocked',progress:25,updatedAt:stamp}]};
 const ops=planCompanySeed(snapshot),project=ops.find(o=>o.model==='Project'&&o.id===pid),user=ops.find(o=>o.model==='User');
 assert.equal(project.after.title,'Integracija internet prodavnice i ERP sistema');assert.equal(project.after.status,undefined);assert.equal(project.after.owner,undefined);assert.equal(project.after.progress,undefined);
 assert.equal(user.after.firstName,'Philip');assert.equal(user.after.lastName,'Zepter');assert.equal(user.after.email,'predsednik@zepter.test');
 assert.doesNotMatch(JSON.stringify(ops),/PRIVATE|passwordHash|sessionVersion|tokenHash/);
 assert.equal(ops.find(o=>o.model==='Activity'&&o.id==='a').after.actualWork,undefined);
 const custom=planCompanySeed({...snapshot,Project:[{...snapshot.Project[0],title:'Moj uređen projekat'}]});
 assert.ok(!custom.some(o=>o.model==='Project'&&o.id===pid));
});
test('Ambiguous sector records and email collisions fail before any mutation',()=>{
 assert.throws(()=>planCompanySeed({Sector:[{_id:'1',code:'IT',name:'IT'},{_id:'2',code:'DEMO_IT',name:'DEMO | IT'}]}),/dva zapisa/);
 assert.throws(()=>planCompanySeed({User:[{_id:'1',email:'a@demo.zepter.test'},{_id:'2',email:'a@zepter.test'}]}),/zauzeta/);
});
test('Cleaning snapshots preserves BSON references, dates, numbers and unrelated user text',()=>{
 const oid={_bsontype:'ObjectId',toString:()=> '123'},value={at:stamp,id:oid,progress:72,items:[{title:'DEMO | Projekat',body:'Rad na prototipu'}]};
 const result=cleanCompanyText(value);assert.equal(result.at,stamp);assert.equal(result.id,oid);assert.equal(result.progress,72);assert.equal(result.items[0].body,'Rad na prototipu');assert.equal(result.items[0].title,'Projekat');
});
test('Application checks concurrency and uses timestamp-preserving updates without overwriting changed records',async()=>{
 let updates=0;
 const models={User:{updateOne:async(filter,update,opts)=>{assert.deepEqual(filter,{_id:'p',updatedAt:stamp});assert.deepEqual(update,{$set:{firstName:'Philip'}});assert.equal(opts.timestamps,false);updates++;return {matchedCount:0};}}};
 await assert.rejects(applyCompanySeed([{model:'User',id:'p',kind:'update',updatedAt:stamp,after:{firstName:'Philip'}}],models),/zastareo/);assert.equal(updates,1);
});

test('Rerunning the catalog never adds missing activities to closed or archived projects',()=>{
 const pid=companySeedId('project','LEGAL:0');
 for(const project of [{status:'completed'},{status:'cancelled'},{status:'active',archived:true}]){
  const ops=planCompanySeed({Project:[{_id:pid,title:'Uređen projekat',...project}]});
  assert.ok(!ops.some(o=>o.model==='Activity'&&o.after.project===pid));
 }
});
