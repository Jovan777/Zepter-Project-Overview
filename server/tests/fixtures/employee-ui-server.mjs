// Explicit browser-test fixture. No MongoDB connection, no dotenv, no real accounts.
// Run from server/: ZEPTER_UI_FIXTURE=1 node tests/fixtures/employee-ui-server.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import {Server} from 'socket.io';

if (process.env.ZEPTER_UI_FIXTURE !== '1') throw Error('Set ZEPTER_UI_FIXTURE=1 to run this isolated test server.');
if (process.env.ZEPTER_UI_ROLE && !['employee','manager','president'].includes(process.env.ZEPTER_UI_ROLE)) throw Error('Fixture role must be employee, manager or president.');
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'zepter-ui-fixture-'));
process.env.UPLOAD_DIR = folder;
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
const models = await import('../../src/models/index.js');
const {attachSocket} = await import('../../src/services/events.js');
const {errorHandler} = await import('../../src/lib/errors.js');
const self = '111111111111111111111111', manager = '222222222222222222222222', sector = '333333333333333333333333';
const projectId = '444444444444444444444444', activityId = '555555555555555555555555', colleagueActivity = '666666666666666666666666';
const president = '777777777777777777777777', colleague = '888888888888888888888888';
const user = {_id: self, firstName: 'Test', lastName: 'Zaposleni', jobTitle: 'UI test', role: 'employee', approval: 'approved', sector};
const people = [user, {_id: manager, firstName: 'Test', lastName: 'Rukovodilac', role: 'manager', approval: 'approved', sector}, {_id: president, firstName: 'Test', lastName: 'Predsednik', role: 'president', approval: 'approved'}, {_id: colleague, firstName: 'Test', lastName: 'Kolega', role: 'employee', approval: 'approved', sector}];
const authUser = people.find(person=>person.role===(process.env.ZEPTER_UI_ROLE||'employee'));
if(authUser.role==='president'){
 process.env.JWT_SECRET=randomBytes(48).toString('hex');
 process.env.CLIENT_ORIGIN='http://127.0.0.1:4002';
 process.env.COOKIE_SECURE='false';
}
const now = () => new Date();
const stores = Object.fromEntries(['User', 'Sector', 'Project', 'Activity', 'Comment', 'Attachment', 'WorkLog', 'Notification', 'Audit', 'Idea', 'IdeaRead', 'Report','DecisionRequest','Assignment','Session','PresidentAccessLink'].map(key => [key, new Map()]));
for (const p of people) stores.User.set(p._id, p);
stores.Sector.set(sector, {_id: sector, name: 'Test sektor', code: 'UI_TEST', active: true, manager});
stores.Project.set(projectId, {_id: projectId, title: 'Test projekat — web sajt', description: 'Izolovani podaci za proveru čuvanja, priloga i komentara. Ovaj projekat ne postoji u demo bazi.', status: 'active', progress: 80, priority: 'medium', sector, owner: manager, members: [self, manager, colleague], createdAt: now(), updatedAt: now(), dueDate: new Date('2026-12-15T12:00:00Z')});
stores.Activity.set(activityId, {_id: activityId, project: projectId, sector, title: 'Moja test aktivnost', description: 'Ova aktivnost sme da se menja u testu.', status: 'in_progress', progress: 60, assignees: [self], actualWork: 'Početni test unos.', nextStep: 'Provera mobilnog prikaza.', blockers: '', dueDate: new Date('2026-12-10T12:00:00Z'), createdAt: now(), updatedAt: now()});
stores.Activity.set(colleagueActivity, {_id: colleagueActivity, project: projectId, sector, title: 'Aktivnost kolege — samo pregled', description: '', status: 'completed', progress: 100, assignees: [colleague], actualWork: 'Završen posao kolege.', createdAt: now(), updatedAt: now()});
const parentId = '999999999999999999999999';
stores.Comment.set(parentId, {_id: parentId, targetType: 'activity', targetId: activityId, author: president, body: 'Molim proveru i novi pregled rezultata.', kind: 'instruction', responseStatus: 'open', addressedTo: [self], createdAt: now()});
stores.Comment.set('aaaaaaaaaaaaaaaaaaaaaaaa', {_id: 'aaaaaaaaaaaaaaaaaaaaaaaa', targetType: 'project', targetId: projectId, author: manager, body: 'Dodajte projektni komentar u okviru ovog testa.', kind: 'comment', responseStatus: 'open', addressedTo: [], createdAt: now()});

for (const [index, status] of ['submitted', 'in_review', 'revision_requested', 'forwarded'].entries()) {
 const id = ('b' + index).repeat(12);
 stores.Idea.set(id, {_id: id, title: ['Interna edukacija o proizvodima', 'Unapređenje onboarding procesa', 'AI pomoć za pripremu kampanja', 'Program lojalnosti kupaca'][index], description: 'Izolovani predlog za unapređenje rada i saradnje unutar kompanije. Podaci postoje samo u memoriji testnog servera.', benefit: 'Brži rad i bolja saradnja.', author: self, sector, status, reviewNote: status === 'revision_requested' ? 'Dopunite predlog očekivanim troškovima i planom primene.' : '', revisionCount: 0, createdAt: new Date(Date.now() - index * 86400000), updatedAt: now()});
}
// Public app icon used only as a private test attachment, never as a fake product photograph.
const preview = await fs.readFile(new URL('../../../client/public/icons/icon-192.png', import.meta.url));
await fs.writeFile(path.join(folder, 'fixture.png'), preview);
stores.Attachment.set('cccccccccccccccccccccccc', {_id: 'cccccccccccccccccccccccc', targetType: 'idea', targetId: 'b3'.repeat(12), owner: self, originalName: 'fixture.png', fileName: 'fixture.png', mime: 'image/png', size: preview.length, createdAt: now()});
stores.Comment.set('dddddddddddddddddddddddd', {_id:'dddddddddddddddddddddddd',targetType:'idea',targetId:'b2'.repeat(12),author:manager,body:'Molim da dopunite plan primene i okvirni budžet.',kind:'instruction',responseStatus:'open',addressedTo:[self],createdAt:new Date(Date.now()-3600000)});
const fixtureNotifications = [
 ['comment','Novi komentar na aktivnosti','Dodat je komentar uz vašu aktivnost.',`/activities/${activityId}`,null],
 ['idea_status','Ideja vraćena na doradu','Dopunite predlog planom primene.','/ideas/'+'b2'.repeat(12),null],
 ['activity_assigned','Novo zaduženje','Dodeljena vam je test aktivnost.',`/activities/${activityId}`,null],
 ['project_updated','Promena na projektu','Pogledajte novosti na projektu.',`/projects/${projectId}`,now()],
 ['comment','Nova instrukcija','Pripremite plan narednih koraka.','/ideas/'+'b2'.repeat(12),now()]
];
stores.Project.get(projectId).archived = false;
const sectorCommentId = 'ffffffffffffffffffffffff';
stores.Comment.set(sectorCommentId, {_id:sectorCommentId,targetType:'sector',targetId:sector,author:president,body:'Pripremite kratak pregled prioriteta sektora i narednih koraka.',kind:'instruction',responseStatus:'open',addressedTo:[manager],createdAt:now()});
stores.Notification.set('f1'.repeat(12), {_id:'f1'.repeat(12),user:manager,actor:president,type:'comment',title:'Nova instrukcija',body:'Novi prioriteti sektora.',link:'/sectors/'+sector,readAt:null,createdAt:now()});
if(authUser.role==='manager'){
 for(const [i,type,actor,link,read]of [
  [0,'comment',self,'/projects/'+projectId,false],[1,'project_updated',manager,'/projects/'+projectId,false],
  [2,'new_idea',self,'/ideas/'+'b0'.repeat(12),false],[3,'activity_overdue',manager,'/activities/'+activityId,true],
  [4,'idea_resubmitted',colleague,'/ideas/'+'b1'.repeat(12),true]
 ]){
  const id='af'+i.toString(16).padStart(22,'0');stores.Notification.set(id,{_id:id,user:manager,actor,type,title:['Odgovor zaposlenog na projektu','Promena statusa projekta','Nova ideja čeka pregled','Aktivnost kasni','Dopunjena ideja'][i],body:'Izolovano obaveštenje za proveru direktnog otvaranja.',link,readAt:read?now():null,createdAt:new Date(Date.now()-(i+1)*600000)});
 }
 stores.Comment.set('ad'.repeat(12),{_id:'ad'.repeat(12),targetType:'idea',targetId:'b0'.repeat(12),author:manager,body:'Molim detaljniji plan primene.',kind:'comment',createdAt:now()});
 stores.Comment.set('a9'.repeat(12),{_id:'a9'.repeat(12),targetType:'idea',targetId:'b0'.repeat(12),author:self,body:'Dopunio sam očekivane koristi i naredne korake.',kind:'comment',parent:'ad'.repeat(12),createdAt:now()});
 stores.Attachment.set('c9'.repeat(12),{_id:'c9'.repeat(12),targetType:'idea',targetId:'b0'.repeat(12),owner:self,originalName:'Predlog.png',fileName:'fixture.png',mime:'image/png',size:preview.length,createdAt:now()});
 const yesterday=new Date(Date.now()-86400000*2);
 const extraProject=(id,fields)=>stores.Project.set(id,{_id:id,sector,archived:false,title:'Test projekat',status:'active',progress:40,owner:manager,members:[self,manager],createdAt:now(),updatedAt:now(),...fields});
 extraProject('f2'.repeat(12),{title:'Kampanja — potrebna pažnja',status:'at_risk',dueDate:yesterday});
 extraProject('f4'.repeat(12),{title:'Završen projekat — istorija',status:'completed',progress:100});
 extraProject('f6'.repeat(12),{title:'Tuđi sektor — nedostupno',sector:'f7'.repeat(12)});
 extraProject('f8'.repeat(12),{title:'Arhivirani projekat',archived:true});
 for(const [id,project] of [['f3'.repeat(12),'f2'.repeat(12)],['f5'.repeat(12),'f4'.repeat(12)]])stores.Activity.set(id,{_id:id,project,sector,title:'Test provere roka',status:'review',progress:80,assignees:[self],dueDate:yesterday,createdAt:now(),updatedAt:now()});
 stores.WorkLog.set('a1'.repeat(12),{_id:'a1'.repeat(12),user:self,sector,project:projectId,activity:activityId,day:'2026-11-07',done:'Pripremljen prvi predlog dizajna.',nextSteps:'Pregled sa rukovodiocem.',blockers:'',minutes:120,createdAt:now()});
 stores.Audit.set('a2'.repeat(12),{_id:'a2'.repeat(12),entity:'Activity',entityId:activityId,actor:self,action:'activity.updated',details:{fields:['progress','actualWork']},ip:'fixture-private-value',createdAt:now()});
 stores.Comment.set('a3'.repeat(12),{_id:'a3'.repeat(12),targetType:'activity',targetId:activityId,author:president,body:'Obratite pažnju na mobilni prikaz i pripremite novi pregled.',kind:'instruction',responseStatus:'open',createdAt:now()});
 for(let i=0;i<13;i++){
  const date=new Date('2026-11-08T12:00:00Z');date.setUTCDate(date.getUTCDate()-i);
  const day=date.toISOString().slice(0,10),id='aa'+i.toString(16).padStart(22,'0');
  stores.Report.set(id,{_id:id,scope:'sector',sector,type:i===2?'weekly':'daily',periodStart:i===2?'2026-11-02':day,periodEnd:i===2?'2026-11-08':day,status:i===1?'draft':'published',results:i===1?'':'Pripremljen pregled rezultata rada tima.',problems:'',nextSteps:'Nastavak planiranih aktivnosti.',generated:{periodStart:day,periodEnd:day,type:i===2?'weekly':'daily',stats:{projects:2,activities:3,workEntries:4,avgProgress:70,completedActivities:1,lateActivities:1},completed:[{day,employee:'Test Zaposleni',text:'Pripremljeni materijali.'}],blockers:[],nextSteps:[]},createdAt:now(),updatedAt:now()});
 }
 stores.Report.set('ab'.repeat(12),{_id:'ab'.repeat(12),sector:'f7'.repeat(12),type:'daily',periodStart:'2026-11-08',periodEnd:'2026-11-08',status:'published',results:'Strani sektor'});
 stores.Idea.set('ac'.repeat(12),{_id:'ac'.repeat(12),sector:'f7'.repeat(12),author:colleague,title:'Privatna ideja drugog sektora',description:'Ovo se ne prikazuje rukovodiocu.',status:'submitted',createdAt:now(),updatedAt:now()});
}
for (const [index,[type,title,body,link,readAt]] of fixtureNotifications.entries()) {
 const id=('e'+index).repeat(12);
 stores.Notification.set(id,{_id:id,user:self,actor:manager,type,title,body,link,readAt,createdAt:new Date(Date.now()-(index+1)*600000)});
}
const refId = value => String(value?._id || value);
const readPath=(row,key)=>key.split('.').reduce((value,part)=>value?.[part],row);
const setFields=(row,fields={})=>{for(const[key,value]of Object.entries(fields)){const parts=key.split('.');let target=row;for(const part of parts.slice(0,-1))target=target[part]??={};target[parts.at(-1)]=value;}};
function matches(row, filter = {}) {
  if (!row) return false;
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    if (key === '$and') return value.every(part => matches(row, part));
    const current = readPath(row,key), values = Array.isArray(current) ? current : [current];
    if (value instanceof RegExp) return value.test(current || '');
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$in' in value) return values.some(v => value.$in.some(candidate => refId(candidate) === refId(v)));
      if ('$nin' in value) return values.every(v => !value.$nin.some(candidate => refId(candidate) === refId(v)));
      if ('$ne' in value) return value.$ne === null ? current != null : values.every(v => refId(v) !== refId(value.$ne));
      if ('$regex' in value) return new RegExp(value.$regex, value.$options || '').test(current || '');
      if (['$lt','$lte','$gt','$gte'].some(key=>key in value)) {
        const compare=other=>current instanceof Date||other instanceof Date?[+new Date(current),+new Date(other)]:[current,other];
        return current!=null&&Object.entries(value).every(([key,other])=>{const [a,b]=compare(other);return key==='$lt'?a<b:key==='$lte'?a<=b:key==='$gt'?a>b:key==='$gte'?a>=b:true;});
      }
    }
    if (current instanceof Date || value instanceof Date) return +new Date(current) === +new Date(value);
    if (value === null) return current == null;
    return values.some(v => refId(v) === refId(value));
  });
}
if(authUser.role==='president'){
 stores.Sector.get(sector).name='Marketing';
 const other='e1'.repeat(12);for(const [id,name]of [[other,'IT'],['e2'.repeat(12),'Prodaja'],['e3'.repeat(12),'Finansije'],['e4'.repeat(12),'Logistika']])stores.Sector.set(id,{_id:id,name,active:true});
 const risk='e5'.repeat(12),closed='e6'.repeat(12),old=new Date(Date.now()-3*86400000);
 stores.Project.set(risk,{_id:risk,sector,title:'Oktobarska kampanja',description:'Proverite materijale i plan kampanje.',status:'at_risk',progress:45,priority:'high',owner:manager,members:[self,manager],archived:false,dueDate:old,updatedAt:now(),createdAt:old});
 stores.Project.set(closed,{_id:closed,sector,title:'Završen projekat',status:'completed',progress:100,archived:false,dueDate:old,updatedAt:old});
 stores.Activity.set('e7'.repeat(12),{_id:'e7'.repeat(12),project:closed,sector,title:'Zatvoren posao se ne prikazuje kao kašnjenje',status:'blocked',dueDate:old});
 stores.Activity.set('e8'.repeat(12),{_id:'e8'.repeat(12),project:risk,sector,title:'Kašnjenje koje je već obuhvaćeno projektom',status:'blocked',dueDate:old});
 for(let i=0;i<10;i++){const id='d0'+i.toString(16).padStart(22,'0');stores.Project.set(id,{_id:id,sector:i===9?other:sector,title:'Test projekat '+(i+1),status:i===9?'active':'planned',progress:10+i,owner:manager,members:[manager],archived:false,createdAt:old,updatedAt:old});}
 stores.DecisionRequest.set('e9'.repeat(12),{_id:'e9'.repeat(12),sector,createdBy:manager,title:'Odobrenje predloga kampanje',description:'Marketing traži pregled i odobrenje novog predloga kampanje.',type:'approval',status:'open',referenceType:'project',referenceId:risk,createdAt:old});
 stores.Assignment.set('ea'.repeat(12),{_id:'ea'.repeat(12),sector:other,assignedTo:manager,createdBy:president,title:'Potrebna odluka za integraciju',description:'Rukovodilac je prijavio prepreku.',status:'blocked',createdAt:old});
 stores.Assignment.set('eb'.repeat(12),{_id:'eb'.repeat(12),sector,assignedTo:manager,createdBy:president,title:'Novo zaduženje čeka rukovodioca',status:'new',createdAt:old});
 const {tokenDigest}=await import('../../src/lib/auth.js');
 stores.PresidentAccessLink.set('ec'.repeat(12),{_id:'ec'.repeat(12),user:president,tokenHash:tokenDigest('p'.repeat(32)),generation:1,revokedAt:null});
 if(process.env.ZEPTER_UI_WAVE02==='1'){
  stores.User.set('c9'.repeat(12),{_id:'c9'.repeat(12),firstName:'Test',lastName:'Drugi rukovodilac',role:'manager',approval:'approved',sector});
  const foreignAuthor='ca'.repeat(12),foreignManager='cb'.repeat(12);
  stores.User.set(foreignAuthor,{_id:foreignAuthor,firstName:'Test',lastName:'IT autor',role:'employee',approval:'approved',sector:other});
  stores.User.set(foreignManager,{_id:foreignManager,firstName:'Test',lastName:'IT rukovodilac',role:'manager',approval:'approved',sector:other});
  stores.Sector.get(other).manager=foreignManager;
  Object.assign(stores.Idea.get('b3'.repeat(12)),{reviewedBy:manager,forwardedAt:old});
  for(let i=0;i<14;i++){
   const id='c1'+i.toString(16).padStart(22,'0'),foreign=i===1;
   stores.Idea.set(id,{_id:id,title:['Loyalty program za postojeće kupce','Optimizacija lagera pomoću analize','Ekološka ambalaža za proizvode','Interna edukacija o prodajnim tehnikama'][i]||'Predlog unapređenja '+(i+1),description:'Predlog zaposlenog sa konkretnim ciljem, očekivanim rezultatima i koracima primene. Podaci postoje samo u izolovanom testu.',benefit:'Bolja organizacija i saradnja.',author:foreign?foreignAuthor:self,sector:foreign?other:sector,status:'forwarded',reviewedBy:foreign?foreignManager:manager,forwardedAt:old,createdAt:old,updatedAt:old});
   const notificationId='c2'+i.toString(16).padStart(22,'0');
   stores.Notification.set(notificationId,{_id:notificationId,user:president,actor:foreign?foreignManager:manager,type:'idea_forwarded',title:'Nova ideja za pregled',body:'Prosleđen testni predlog.',link:'/ideas/'+id,readAt:null,createdAt:old});
  }
  const seen='c1'+'d'.padStart(22,'0'),commented='c1'+'c'.padStart(22,'0');
  stores.IdeaRead.set('c3'.repeat(12),{_id:'c3'.repeat(12),user:president,idea:seen,seenAt:now()});
  stores.Comment.set('c4'.repeat(12),{_id:'c4'.repeat(12),targetType:'idea',targetId:commented,author:president,body:'Pregledan predlog iz prethodnog razgovora.',kind:'comment',createdAt:now()});
  for(const [id,status]of [['c5'.repeat(12),'approved'],['c6'.repeat(12),'rejected']]){
   stores.Idea.set(id,{_id:id,title:status==='approved'?'Odobrena interna obuka':'Odbijen raniji predlog',description:'Predlog sa ranije potvrđenom konačnom odlukom.',sector,author:self,reviewedBy:manager,status,createdAt:old,updatedAt:old,forwardedAt:old,decision:{by:president,at:old,action:status==='approved'?'approve':'reject',note:status==='approved'?'Pripremite plan obuke i predlog termina.':'',deliveryStatus:'complete'}});
  }
  stores.Comment.set('c7'.repeat(12),{_id:'c7'.repeat(12),targetType:'idea',targetId:'c5'.repeat(12),author:president,body:'Pripremite plan obuke i predlog termina.',kind:'instruction',responseStatus:'open',addressedTo:[manager],createdAt:old});
  for(let i=0;i<14;i++){
   const id='c8'+i.toString(16).padStart(22,'0'),status=i===0?'completed':i===1?'planned':i===2?'blocked':i<13?'review':'in_progress',progress=i===0?100:i===1?0:i===2?60:i<13?90:60;
   stores.Activity.set(id,{_id:id,project:projectId,sector,title:'Projektna aktivnost '+(i+3),status,progress,assignees:[i%2?self:colleague],dueDate:new Date('2026-12-16T12:00:00Z'),createdAt:new Date(Date.now()+i*1000),updatedAt:now(),actualWork:'Izolovani dnevni rezultat rada.'});
  }
 }
}
if(process.env.ZEPTER_UI_WAVE03==='1'&&authUser.role==='president'&&process.env.ZEPTER_UI_QA==='1'){
 Object.assign(stores.Activity.get(activityId),{priority:'high',assignees:[self,colleague],description:'Priprema početne stranice i prilagođavanje rasporeda telefonu, tabletu i desktopu.',actualWork:'Završen je vizuelni koncept početne stranice. Pripremljene su dve varijante rasporeda i usaglašen sadržaj glavne sekcije.',nextStep:'Pregled predsednikove instrukcije i završna provera mobilne verzije.',blockers:'Čeka se potvrda poslednje verzije pratećih materijala.'});
 for(const [index,name]of ['Pregled početne stranice.png','Mobilni raspored.png'].entries()){
  const fileName='activity-'+index+'.png';await fs.writeFile(path.join(folder,fileName),preview);
  const id='d3'+index.toString(16).padStart(22,'0');stores.Attachment.set(id,{_id:id,targetType:'activity',targetId:activityId,owner:self,originalName:name,fileName,mime:'image/png',size:preview.length,createdAt:now()});
 }
}
if(process.env.ZEPTER_UI_WAVE04==='1'&&authUser.role==='president'&&process.env.ZEPTER_UI_QA==='1'){
 const other='e1'.repeat(12),stamp=new Date('2026-11-08T15:00Z');
 stores.Project.get(projectId).title='ZZ — projekat van prve stranice';
 for(let i=0;i<24;i++){const id='d4'+i.toString(16).padStart(22,'0');stores.Project.set(id,{_id:id,title:'Abecedni test projekat '+String(i+1).padStart(2,'0'),sector,status:'planned',progress:0,archived:false,members:[self,manager],owner:manager,createdAt:stamp,updatedAt:stamp});}
 const entries=Array.from({length:7},(_,i)=>({day:'2026-11-06',employee:'Test Zaposleni',project:'Raniji naziv projekta',projectId,activityId,activity:'Priprema početne stranice',text:'Sačuvani rezultat rada '+(i+1)+'.'}));
 const snapshot={asOf:stamp.toISOString(),completed:Array.from({length:6},(_,i)=>({id:i?('c8'+(i-1).toString(16).padStart(22,'0')):colleagueActivity,title:'Završena aktivnost u sačuvanom pregledu '+(i+1),projectId,progress:100})),late:[{id:activityId,title:'Aktivnost sa zabeleženim kašnjenjem',projectId,dueDate:'2026-11-05T12:00Z'}]};
 const generated={type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',generatedAt:stamp.toISOString(),stats:{completedActivities:6,lateActivities:1,workEntries:7},activitySnapshot:snapshot,completed:entries,blockers:[{day:'2026-11-06',employee:'Test Zaposleni',text:'Sačuvana prepreka: čeka se odobrenje materijala.',projectId,activityId}],nextSteps:[{day:'2026-11-06',text:'Sačuvani naredni korak: pripremiti finalnu verziju.',projectId,activityId}]};
 stores.Report.set('d5'.repeat(12),{_id:'d5'.repeat(12),sector,type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',status:'published',results:'Objavljen sažetak marketinga: pripremljeni materijali i usaglašen plan.',problems:'Objavljen rizik: čeka se potvrda termina.',nextSteps:'Dogovoriti termin i završiti pripremu.',generated,createdAt:stamp,updatedAt:stamp,publishedAt:stamp});
 stores.Report.set('d6'.repeat(12),{_id:'d6'.repeat(12),sector,type:'daily',periodStart:'2026-11-07',periodEnd:'2026-11-07',status:'published',results:'Istorijski dnevni rezultat.',problems:'',nextSteps:'Raniji sledeći korak.',generated:{stats:{completedActivities:3,lateActivities:2},completed:[{day:'2026-11-07',text:'Stari snimak bez spiska aktivnosti.'}]},publishedAt:stamp,createdAt:stamp,updatedAt:stamp});
 stores.Report.set('d7'.repeat(12),{_id:'d7'.repeat(12),sector:other,type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',status:'published',results:'Objavljen IT sažetak.',problems:'Prijavljena IT prepreka.',nextSteps:'Pripremiti proveru integracije.',generated:{stats:{completedActivities:1,lateActivities:0},completed:[]},publishedAt:stamp,createdAt:stamp,updatedAt:stamp});
 stores.Report.set('d8'.repeat(12),{_id:'d8'.repeat(12),sector:'e3'.repeat(12),type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',status:'draft',results:'PRIVATE_DRAFT_WAVE04',createdAt:stamp,updatedAt:stamp});
 for(const [index,day]of ['2026-11-06','2026-10-26'].entries()){const id='d9'+index.toString(16).padStart(22,'0');stores.WorkLog.set(id,{_id:id,user:self,sector,project:projectId,activity:activityId,day,done:index?'Rezultat van izabranog perioda.':'Evidentiran rad u izabranom periodu.',blockers:index?'':'Prepreka iz evidencije.',nextSteps:index?'':'Završiti kontrolu sadržaja.',createdAt:stamp});}
 Object.assign(stores.Comment.get(sectorCommentId),{responseStatus:'answered',updatedAt:stamp});
 stores.Comment.set('da'.repeat(12),{_id:'da'.repeat(12),targetType:'project',targetId:'d0'+'9'.padStart(22,'0'),author:president,body:'Pripremite pregled integracije.',kind:'instruction',responseStatus:'answered',addressedTo:[],createdAt:stamp,updatedAt:stamp});
 stores.Comment.set('db'.repeat(12),{_id:'db'.repeat(12),targetType:'sector',targetId:sector,author:manager,parent:sectorCommentId,body:'Predlog prioriteta je spreman za vaš pregled.',kind:'comment',responseStatus:'open',createdAt:stamp,updatedAt:stamp});
 const itProject='d0'+'9'.padStart(22,'0');
 for(let i=0;i<45;i++){const id='de'+i.toString(16).padStart(22,'0'),createdAt=new Date(Date.UTC(2026,10,1,8,0,i));stores.Comment.set(id,{_id:id,targetType:'project',targetId:itProject,author:'cb'.repeat(12),body:'Raniji komentar projekta '+(i+1),kind:'comment',responseStatus:'open',createdAt,updatedAt:createdAt});}
 stores.Comment.set('dc'.repeat(12),{_id:'dc'.repeat(12),targetType:'project',targetId:itProject,author:'cb'.repeat(12),parent:'da'.repeat(12),body:'Integracija je spremna za predsednikov pregled.',kind:'comment',responseStatus:'open',createdAt:new Date(stamp.getTime()+60000),updatedAt:new Date(stamp.getTime()+60000)});
}
if(process.env.ZEPTER_UI_WAVE05==='1'&&authUser.role==='president'&&process.env.ZEPTER_UI_QA==='1'){
 const targets=[['activity',activityId],['sector',sector],['idea','b3'.repeat(12)],['project',projectId],['assignment','ea'.repeat(12)],['request','e9'.repeat(12)]];
 for(let i=0;i<25;i++){
  const id='a5'+i.toString(16).padStart(22,'0'),[targetType,targetId]=targets[i%targets.length],createdAt=new Date(Date.UTC(2026,10,6,9,0,i));
  stores.Comment.set(id,{_id:id,author:president,targetType,targetId,kind:i%3===0?'instruction':'comment',responseStatus:i===3?'resolved':'open',body:'Predsednikova testna poruka '+(i+1)+': pripremite pregled rezultata i narednih koraka.',createdAt,updatedAt:createdAt});
  if(i%2===0){const replyId='a6'+i.toString(16).padStart(22,'0');stores.Comment.set(replyId,{_id:replyId,parent:id,author:i%4===0?self:manager,targetType,targetId,body:'Odgovor na testnu poruku '+(i+1)+': pripremljen je traženi pregled.',kind:'comment',responseStatus:'open',createdAt:new Date(createdAt.getTime()+60000),updatedAt:createdAt});}
 }
 const latestId='a7'.repeat(12),createdAt=new Date('2026-11-08T12:00Z');
 stores.Comment.set(latestId,{_id:latestId,parent:'a5'+'0'.repeat(22),author:self,targetType:'activity',targetId:activityId,body:'Poslednji odgovor zaposlenog — konačna verzija je spremna.',kind:'comment',responseStatus:'open',createdAt,updatedAt:createdAt});
 stores.Comment.set('a8'.repeat(12),{_id:'a8'.repeat(12),parent:'a5'+'0'.repeat(22),author:president,targetType:'activity',targetId:activityId,body:'Predsednikov sopstveni nastavak.',kind:'comment',responseStatus:'open',createdAt:new Date('2026-11-08T13:00Z'),updatedAt:createdAt});
 stores.Comment.set('a9'.repeat(12),{_id:'a9'.repeat(12),author:president,targetType:'project',targetId:'af'.repeat(12),body:'Sačuvana poruka obrisanog projekta.',kind:'instruction',responseStatus:'open',createdAt,updatedAt:createdAt});
 stores.Comment.set('aa'.repeat(12),{_id:'aa'.repeat(12),author:president,targetType:'idea',targetId:'b0'.repeat(12),body:'PRIVATE_UNFORWARDED_HISTORY',kind:'comment',responseStatus:'open',createdAt,updatedAt:createdAt});
 stores.Comment.set('ab'.repeat(12),{_id:'ab'.repeat(12),author:manager,targetType:'project',targetId:projectId,body:'FOREIGN_AUTHOR_HISTORY',kind:'instruction',responseStatus:'open',createdAt,updatedAt:createdAt});
 for(let i=0;i<45;i++){const id='ac'+i.toString(16).padStart(22,'0'),stamp=new Date(Date.UTC(2026,10,1,8,0,i));stores.Comment.set(id,{_id:id,author:self,targetType:'activity',targetId:activityId,body:'Raniji komentar aktivnosti '+(i+1),kind:'comment',responseStatus:'open',createdAt:stamp,updatedAt:stamp});}
}
function fixtureClone(value){
 if(value instanceof Date)return new Date(value);
 if(typeof value?.toHexString==='function')return value.toHexString();
 if(Array.isArray(value))return value.map(fixtureClone);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,fixtureClone(item)]));
 return value;
}
function documentFor(name, raw) {
  if (!raw) return null;
  const doc = fixtureClone(raw);
  const plain = () => Object.fromEntries(Object.entries(doc).filter(([, value]) => typeof value !== 'function'));
  const depopulate = data => {
    const copy = structuredClone(data);
    for (const key of ['owner', 'author', 'actor', 'project', 'activity', 'user', 'parent', 'sector']) if (copy[key]?._id) copy[key] = copy[key]._id;
    for (const key of ['members', 'assignees', 'addressedTo']) if (Array.isArray(copy[key])) copy[key] = copy[key].map(refId);
    return copy;
  };
  doc.populate = async spec => {
    for (const item of Array.isArray(spec) ? spec : [spec]) {
      const key = typeof item === 'string' ? item : item.path;
      const source = ['project', 'activity'].includes(key) ? stores[key === 'project' ? 'Project' : 'Activity'] : key === 'sector' ? stores.Sector : stores.User;
      if (Array.isArray(doc[key])) doc[key] = doc[key].map(value => structuredClone(source.get(refId(value)) || value));
      else if (doc[key]) doc[key] = structuredClone(source.get(refId(doc[key])) || doc[key]);
    }
    return doc;
  };
  doc.save = async () => {doc.updatedAt = now(); stores[name].set(doc._id, depopulate(plain())); return doc;};
  doc.deleteOne = async () => stores[name].delete(doc._id);
  doc.toJSON = ()=>{const value=plain();if(name==='Idea')delete value.decisionDelivery;return value;};
  doc.toObject = plain;
  return doc;
}
function query(name, raw, one = false) {
  let rows = one ? (raw ? [raw] : []) : raw;
  const populate = [];
  const result = async () => {
    const docs = rows.map(item => documentFor(name, item));
    for (const doc of docs) for (const spec of populate) await doc.populate(spec);
    return one ? docs[0] || null : docs;
  };
  const q = {select: () => q, populate: (...args) => {populate.push(args[0]); return q;}, lean: async () => JSON.parse(JSON.stringify(await result())), then: (ok, fail) => result().then(ok, fail),
    sort: order => {rows = [...rows].sort((a, b) => {for (const [key, dir] of Object.entries(order)) {if (a[key] > b[key]) return dir; if (a[key] < b[key]) return -dir;} return 0;}); return q;},
    skip: n => {rows = rows.slice(n); return q;}, limit: n => {rows = rows.slice(0, n); return q;}};
  return q;
}
let failUploadOnce = process.env.ZEPTER_UI_FAIL_UPLOAD_ONCE === '1';
let activityCreates = 0,failIdeaDecisionCommentOnce=false;
for (const [name, store] of Object.entries(stores)) {
  const Model = models[name];
  Model.aggregate=async pipeline=>{
   let rows=[...store.values()];
   for(const stage of pipeline){
    if(stage.$match)rows=rows.filter(row=>matches(row,stage.$match));
    if(stage.$sort)rows=[...rows].sort((a,b)=>{for(const[key,dir]of Object.entries(stage.$sort)){if(a[key]>b[key])return dir;if(a[key]<b[key])return -dir;}return 0;});
    if(stage.$group){const g=stage.$group,groups=new Map(),value=(row,spec)=>typeof spec==='string'&&spec.startsWith('$')?row[spec.slice(1)]:spec;for(const row of rows){const rawId=value(row,g._id),key=refId(rawId);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}rows=[...groups.values()].map(items=>{const output={_id:value(items[0],g._id)};for(const[key,spec]of Object.entries(g)){if(key==='_id')continue;if('$sum'in spec)output[key]=items.reduce((sum,row)=>sum+(Number(value(row,spec.$sum))||0),0);if('$avg'in spec){const values=items.map(row=>value(row,spec.$avg)).filter(n=>typeof n==='number');output[key]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;}if('$first'in spec)output[key]=value(items[0],spec.$first);}return output;});}
   }return rows;
  };
  Model.find = filter => query(name, [...store.values()].filter(row => matches(row, filter)));
  Model.findById = key => query(name, store.get(refId(key)), true);
  Model.findOne = filter => {const rows = [...store.values()].filter(row => matches(row,filter));const q=query(name,rows);const original=q.then;q.then=(ok,fail)=>original(value=>ok(value[0]||null),fail);q.lean=async()=>JSON.parse(JSON.stringify((await q)||null));return q;};
  Model.distinct = async (field,filter) => [...new Set([...store.values()].filter(row=>matches(row,filter)).flatMap(row=>Array.isArray(row[field])?row[field]:[row[field]]).filter(value=>value!==undefined).map(refId))];
  Model.countDocuments = async filter => [...store.values()].filter(row => matches(row, filter)).length;
  Model.exists = async filter => {const row = [...store.values()].find(row => matches(row, filter)); return row ? {_id: row._id} : null;};
  Model.create = async fields => {if (name === 'Attachment' && failUploadOnce) {failUploadOnce = false; throw Object.assign(new Error('Test: prvi upload nije uspeo. Pokušajte ponovo.'), {status: 503});} if(name==='Activity'&&++activityCreates===Number(process.env.ZEPTER_UI_FAIL_ACTIVITY_AT))throw Object.assign(new Error('Test: aktivnost nije dodata. Pokušajte ponovo.'),{status:422}); const defaults=name==='Project'?{progress:0,archived:false}:{}; const raw = {_id: randomBytes(12).toString('hex'), createdAt: now(), updatedAt: now(), ...defaults, ...fields}; store.set(raw._id, raw); return documentFor(name, raw);};
  Model.updateOne = async (filter, patch, options={}) => {
   if(name==='Comment'&&patch.$setOnInsert?.kind==='instruction'&&failIdeaDecisionCommentOnce){failIdeaDecisionCommentOnce=false;throw Error('Fixture: instruction delivery unavailable.');}
   let row=[...store.values()].find(item=>matches(item,filter)),inserted=false;
   if(!row&&options.upsert){row={_id:filter._id?refId(filter._id):randomBytes(12).toString('hex'),createdAt:now(),updatedAt:now()};setFields(row,filter);row._id=refId(row._id);setFields(row,patch.$setOnInsert);store.set(row._id,row);inserted=true;}
   if(row){setFields(row,patch.$set);row.updatedAt=now();}
   return {modifiedCount:row?1:0,upsertedCount:inserted?1:0};
  };
  Model.findOneAndUpdate = (filter, patch) => {const row = [...store.values()].find(item => matches(item, filter)); if (!row) return query(name,null,true); setFields(row,patch.$set);row.updatedAt=now(); for(const [key,value] of Object.entries(patch.$inc||{}))row[key]=(row[key]||0)+value; return query(name,row,true);};
  Model.updateMany = async (filter, patch) => {const rows = [...store.values()].filter(item => matches(item, filter)); for(const row of rows)Object.assign(row,patch.$set); return {modifiedCount:rows.length};};
}

// Report POST uses a Mongoose constructor; persist only into this fixture's store.
models.Report.prototype.save=async function(){
 const raw=this.toObject();raw._id=refId(raw._id);raw.sector=refId(raw.sector);
 if([...stores.Report.values()].some(row=>row._id!==raw._id&&refId(row.sector)===raw.sector&&row.type===raw.type&&row.periodStart===raw.periodStart))throw Object.assign(new Error('Fixture duplicate report'),{code:11000});
 raw.createdAt=raw.createdAt||now();raw.updatedAt=now();stores.Report.set(raw._id,raw);Object.assign(this,raw);return this;
};
const app = express(); app.use(express.json());app.use(cookieParser());
app.get('/api/ready',(_req,res)=>res.set('Cache-Control','no-store').json({ok:true}));
if(authUser.role==='president'&&process.env.ZEPTER_UI_QA==='1'&&process.env.ZEPTER_UI_WAVE02==='1'){
 for(const [role,personId]of [['manager',manager],['employee',self]])app.get('/__fixture/'+role,async(req,res)=>{
  const {createSession,setRefreshCookie}=await import('../../src/lib/auth.js');
  const session=await createSession(req,documentFor('User',stores.User.get(personId)));
  setRefreshCookie(res,session.refresh);res.redirect('/');
 });
}
if(authUser.role==='president')app.use('/api/auth',(await import('../../src/routes/auth.js')).default);
app.post('/api/auth/refresh', (_req, res) => res.json({user:authUser, accessToken: 'isolated-ui-fixture'}));
app.post('/api/auth/logout', (_req, res) => res.json({ok: true}));
app.use('/api', (req, res, next) => {
 res.set('Cache-Control','no-store');
 // Explicit QA-only role simulation, never mounted by the production server.
 const role=req.get('X-Zepter-Fixture-Role');
 if(role){
  if(process.env.ZEPTER_UI_QA!=='1'||req.get('Authorization')!=='Bearer isolated-ui-fixture')return res.sendStatus(403);
  const person=people.find(p=>p.role===role);if(!person)return res.sendStatus(403);req.user=person;
 }else if(authUser.role==='president')return import('../../src/lib/auth.js').then(({requireAuth})=>requireAuth(req,res,next));else req.user=authUser;
 next();
});
// Optional fault controls, available only in this explicitly enabled in-memory fixture.
if(process.env.ZEPTER_UI_QA==='1'){
 for(let i=0;i<12;i++){
  const id='ae'+i.toString(16).padStart(22,'0');
  stores.Idea.set(id,{_id:id,sector,author:self,title:'QA predlog '+(i+1),description:'Izolovani predlog za proveru dodatnih stranica.',status:'submitted',createdAt:new Date(Date.now()+i*1000),updatedAt:now()});
 }
 const controls={ideasMode:'normal',ideasFailOnce:false,prepareFailOnce:false,prepareDelayOnce:false,saveFailOnce:false,publishFailOnce:false,saveResponseLostOnce:false,reviewFailOnce:false,reviewResponseLostOnce:false,notificationFailOnce:false,notificationsEmpty:false,readFailOnce:false,commentResponseLostOnce:false,worklogResponseLostOnce:false,attachmentResponseLostOnce:false,presidentFailOnce:false,socketDisconnect:false,presidentIdeasFailOnce:false,ideaReadFailOnce:false,decisionResponseLostOnce:false,decisionDeliveryFailOnce:false,reportProjectListEmpty:false,activityFailOnce:false,ideaDetailFailOnce:false,attachmentListFailOnce:false,commentsFailOnce:false};
 Object.assign(controls,{presidentReportFailOnce:false,presidentAttentionFailOnce:false,reportOptionsFailOnce:false,presidentReportDelayOnce:false});
 Object.assign(controls,{presidentCommentsFailOnce:false,presidentCommentsEmpty:false});
 app.get('/api/comments/mine/president',(req,res,next)=>{
  if(req.user.role!=='president')return next();
  if(controls.presidentCommentsFailOnce){controls.presidentCommentsFailOnce=false;return res.status(503).json({error:'Test: istorija komentara trenutno nije dostupna.'});}
  if(controls.presidentCommentsEmpty)return res.json({items:[],total:0,page:Number(req.query.page)||1,limit:8,stats:{total:0,open:0,answered:0,resolved:0,unavailable:0,byType:{sector:0,project:0,activity:0,idea:0,assignment:0,request:0}},filters:{status:req.query.status||'all',targetType:req.query.targetType||'all'}});
  next();
 });
 for(const [route,key,label]of [['/api/reports/president/options','reportOptionsFailOnce','Izbor izveštaja'],['/api/reports/president','presidentReportFailOnce','Izveštaj'],['/api/dashboard/president/attention','presidentAttentionFailOnce','Važna pitanja']])app.get(route,async(req,res,next)=>{
  if(controls[key]){controls[key]=false;return res.status(503).json({error:'Test: '+label+' trenutno nije dostupan.'});}
  if(route==='/api/reports/president'&&controls.presidentReportDelayOnce){controls.presidentReportDelayOnce=false;await new Promise(resolve=>setTimeout(resolve,900));}next();
 });
 for(const [route,key,label]of [['/api/activities/:id','activityFailOnce','Aktivnost'],['/api/ideas/:id','ideaDetailFailOnce','Ideja'],['/api/attachments/target/:type/:id','attachmentListFailOnce','Spisak priloga'],['/api/comments','commentsFailOnce','Razgovor']])app.get(route,(req,res,next)=>{
  if(controls[key]&&(!req.params.id||/^[a-f0-9]{24}$/.test(req.params.id))){controls[key]=false;return res.status(503).json({error:'Test: '+label+' trenutno nije dostupan.'});}next();
 });
 app.get('/api/projects',(req,res,next)=>{if(controls.reportProjectListEmpty&&req.query.limit==='50')return res.json({items:[],total:0,page:1,limit:50});next();});
 app.get('/api/ideas/president',(req,res,next)=>{if(controls.presidentIdeasFailOnce){controls.presidentIdeasFailOnce=false;return res.status(503).json({error:'Test: predsedničke ideje trenutno nisu dostupne.'});}next();});
 app.post('/api/ideas/:id/read',(req,res,next)=>{if(controls.ideaReadFailOnce){controls.ideaReadFailOnce=false;return res.status(503).json({error:'Test: oznaka čitanja nije sačuvana.'});}next();});
 app.post('/api/ideas/:id/decision',(req,res,next)=>{
  if(controls.decisionResponseLostOnce){controls.decisionResponseLostOnce=false;const json=res.json.bind(res);res.json=body=>body.idea&&res.statusCode<300?json.call(res.status(503),{error:'Test: potvrda odluke nije dostupna. Proverite aktuelni predlog.'}):json(body);}
  next();
 });
 app.get('/api/dashboard/president',(req,res,next)=>{if(controls.presidentFailOnce){controls.presidentFailOnce=false;return res.status(503).json({error:'Test: pregled kompanije trenutno nije dostupan.'});}next();});
 for(const [route,control,property]of [['comments','commentResponseLostOnce','comment'],['worklogs','worklogResponseLostOnce','workLog'],['attachments','attachmentResponseLostOnce','attachment']])app.post('/api/'+route,(req,res,next)=>{
  if(controls[control]){
   controls[control]=false;const json=res.json.bind(res);
   res.json=body=>body?.[property]&&res.statusCode<300?json.call(res.status(503),{error:'Test: potvrda upisa nije dostupna. Proverite sačuvan sadržaj.'}):json(body);
  }
  next();
 });
 app.post('/api/__fixture/controls',(req,res)=>{
  if(req.get('Authorization')!=='Bearer isolated-ui-fixture'&&!(authUser.role==='president'&&req.user.role==='president'))return res.sendStatus(403);
  for(const [key,value]of Object.entries(req.body)){
   if(!Object.hasOwn(controls,key)||(key==='ideasMode'?!['normal','empty'].includes(value):typeof value!=='boolean'))return res.status(422).json({error:'Invalid fixture control'});
  }
  Object.assign(controls,req.body);io.to('sector:'+sector).emit('data:changed',{entity:'Fixture'});res.json({ok:true});
  if(controls.decisionDeliveryFailOnce){controls.decisionDeliveryFailOnce=false;failIdeaDecisionCommentOnce=true;}
  if(controls.socketDisconnect){controls.socketDisconnect=false;io.disconnectSockets(true);}
 });
 app.get('/api/ideas/sector',async(req,res,next)=>{
  if(controls.ideasFailOnce){controls.ideasFailOnce=false;return res.status(503).json({error:'Test: ideje trenutno nisu dostupne. Pokušajte ponovo.'});}
  if(controls.ideasMode==='empty')return res.json({items:[],total:0,page:1,limit:10,stats:{total:0,review:0,revision:0,forwarded:0}});
  next();
 });
 app.get('/api/reports/prepare',async(req,res,next)=>{
  if(controls.prepareDelayOnce){controls.prepareDelayOnce=false;await new Promise(resolve=>setTimeout(resolve,2500));}
  if(controls.prepareFailOnce){controls.prepareFailOnce=false;return res.status(503).json({error:'Test: priprema izveštaja trenutno nije dostupna.'});}
  next();
 });
 app.post('/api/reports',(req,res,next)=>{
  if(controls.saveFailOnce){controls.saveFailOnce=false;return res.status(503).json({error:'Test: nacrt nije sačuvan. Pokušajte ponovo.'});}
  if(controls.saveResponseLostOnce){
   controls.saveResponseLostOnce=false;const json=res.json.bind(res);
   res.json=body=>{if(body.report&&res.statusCode<300)return json.call(res.status(503),{error:'Test: odgovor posle čuvanja nije potvrđen. Proverite sačuvan izveštaj.'});return json(body);};
  }
  next();
 });
 app.post('/api/reports/:id/publish',(req,res,next)=>{
  if(controls.publishFailOnce){controls.publishFailOnce=false;return res.status(503).json({error:'Test: objava nije izvršena. Pokušajte ponovo.'});}
  next();
 });
 app.post('/api/ideas/:id/review',(req,res,next)=>{
  if(controls.reviewFailOnce){controls.reviewFailOnce=false;return res.status(503).json({error:'Test: odluka nije poslata. Proverite aktuelni predlog.'});}
  if(controls.reviewResponseLostOnce){controls.reviewResponseLostOnce=false;const json=res.json.bind(res);res.json=body=>body.idea&&res.statusCode<300?json.call(res.status(503),{error:'Test: potvrda odluke nije dostupna. Proverite predlog.'}):json(body);}
  next();
 });
 app.get('/api/notifications',(req,res,next)=>{
  if(req.query.view==='manager'){
   if(controls.notificationFailOnce){controls.notificationFailOnce=false;return res.status(503).json({error:'Test: obaveštenja trenutno nisu dostupna.'});}
   if(controls.notificationsEmpty)return res.json({items:[],total:0,unread:0,filteredUnread:0,page:1,limit:12});
  }
  next();
 });
 app.patch('/api/notifications/:id/read',(req,res,next)=>{if(controls.readFailOnce){controls.readFailOnce=false;return res.status(503).json({error:'Test: označavanje nije uspelo.'});}next();});
}
app.get('/api/sectors', (_req, res) => res.json({items: [...stores.Sector.values()]}));
for (const [prefix, file] of [['projects', 'projects'], ['activities', 'activities'], ['comments', 'comments'], ['attachments', 'attachments'], ['worklogs', 'worklogs'], ['ideas', 'ideas'], ['notifications','notifications'], ['dashboard','dashboard'], ['sectors','sectors'], ['reports','reports'],['requests','requests'],['assignments','assignments']]) {
  app.use('/api/' + prefix, (await import('../../src/routes/' + file + '.js')).default);
}
app.use('/api', (_req, res) => res.status(404).json({error: 'Fixture route not implemented'}));
app.use(async (req, res, next) => {
  try {
    const response = await fetch('http://localhost:5173' + req.originalUrl);
    res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/plain').send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {next(error);}
});
app.use(errorHandler);
const server = http.createServer(app), io = new Server(server);
io.on('connection', socket => {socket.join('user:' + authUser._id); socket.join('sector:' + sector);if(authUser.role==='president')socket.join('presidents');}); attachSocket(io);
await new Promise(resolve => server.listen(4002, '127.0.0.1', resolve));
console.log(`Isolated UI fixture: http://127.0.0.1:4002/projects/${projectId}`);
console.log('No MongoDB connection. Type stop to close and remove temporary files.');
let closing = false;
async function shutdown() {
  if (closing) return; closing = true;
  io.close(); if (server.listening) await new Promise(resolve => server.close(resolve));
  if (path.dirname(path.resolve(folder)) !== path.resolve(os.tmpdir()) || !path.basename(folder).startsWith('zepter-ui-fixture-')) throw Error('Unsafe fixture cleanup path');
  await fs.rm(folder, {recursive: true, force: true}); process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
process.stdin.setEncoding('utf8'); process.stdin.on('data', line => {if (line.trim() === 'stop') shutdown();});
