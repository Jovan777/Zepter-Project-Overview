/**
 * ZEPTER Management Overview - bezbedan, ponovljiv demo seed.
 *
 * Pokretanje iz server/: node src/scripts/seed-demo.js
 * ODBIJA produkciju, udaljeni MongoDB i bazu bez _demo sufiksa.
 * NE brise postojeca dokumenta. Postojece demo zapise ostavlja nepromenjene.
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  User, Sector, Project, Activity, WorkLog, Comment, Idea, Report,
  DecisionRequest, Assignment, Notification, Audit, Attachment
} from '../models/index.js';
import {belgradeDay,periodRange} from '../lib/utils.js';
import {generateReport} from '../services/reports.js';

const SEED_VERSION='zepter-demo-v1';
const password=process.env.DEMO_SEED_PASSWORD;
const uri=process.env.MONGODB_URI;

function safeLocalDemo(uriValue){
  try{
    const parsed=new URL(uriValue);
    const database=decodeURIComponent(parsed.pathname.replace(/^\//,''));
    return parsed.protocol==='mongodb:' &&
      ['127.0.0.1','localhost','::1','[::1]'].includes(parsed.hostname) &&
      /^[a-zA-Z0-9_-]+_demo$/.test(database) &&
      !parsed.username && !parsed.password && !parsed.searchParams.has('replicaSet');
  }catch{return false;}
}
if(process.env.NODE_ENV==='production' || !safeLocalDemo(uri)){
 console.error('STOP: Demo seed radi ISKLJUCIVO sa lokalnom MongoDB bazom ciji naziv se zavrsava na _demo (npr. mongodb://127.0.0.1:27017/zepter_management_demo).');
 process.exit(1);
}
if(!password||password.length<8){
 console.error('STOP: U server/.env dodajte DEMO_SEED_PASSWORD (najmanje 8 znakova za LOKALNI TEST).');
 process.exit(1);
}
const oid=(type,key)=>new mongoose.Types.ObjectId(crypto.createHash('sha256').update(`${SEED_VERSION}:${type}:${key}`).digest('hex').slice(0,24));
const when=(offset)=>{const date=new Date(`${belgradeDay()}T12:00:00.000Z`);date.setUTCDate(date.getUTCDate()+offset);return date;};
const day=(offset)=>when(offset).toISOString().slice(0,10);
const today=day(0);
const created={};
async function put(Model,type,key,document){
 const _id=oid(type,key);
 const result=await Model.updateOne({_id},{$setOnInsert:{_id,...document}},{upsert:true,runValidators:true});
 if(result.upsertedCount)created[type]=(created[type]||0)+1;
 return _id;
}
const email=(tag)=>`${tag}@demo.zepter.test`;

// Jednostavan originalan PNG dijagram bez eksternih paketa.
// Omogucava test realnog upload/download API-ja (a ne nepostojecih putanja).
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function pngChunk(type,data){
 const tag=Buffer.from(type,'ascii');const size=Buffer.alloc(4);size.writeUInt32BE(data.length);
 let crc=0xffffffff;for(const b of Buffer.concat([tag,data]))crc=crcTable[(crc^b)&255]^(crc>>>8);
 const checksum=Buffer.alloc(4);checksum.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([size,tag,data,checksum]);
}
function demoDiagram(seed){
 const w=560,h=300,raw=Buffer.alloc(h*(1+w*4));
 const bars=[90,170,130,220,185].map((x,i)=>x+((seed*23+i*11)%37));
 for(let y=0;y<h;y++){
  raw[y*(w*4+1)]=0;
  for(let x=0;x<w;x++){
   let rgb=[250,248,244];
   if(y<48)rgb=[180,139,54];
   else if(y>=258)rgb=[234,225,204];
   else {
    const k=Math.floor((x-50)/96);
    if(k>=0 && k<5 && x>=50+k*96 && x<110+k*96 && y>=250-bars[k])rgb=[196,157,74];
    if(y===250)rgb=[90,91,95];
   }
   const at=y*(w*4+1)+1+x*4;raw[at]=rgb[0];raw[at+1]=rgb[1];raw[at+2]=rgb[2];raw[at+3]=255;
  }
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),pngChunk('IHDR',ihdr),pngChunk('IDAT',zlib.deflateSync(raw)),pngChunk('IEND',Buffer.alloc(0))]);
}
async function makeAttachments(ctx,author){
 const folder=path.resolve(process.env.UPLOAD_DIR||'./private-uploads');
 await fs.mkdir(folder,{recursive:true});
 const targets=[
  ['project',ctx.projects[0].id,'DEMO | Pregled napretka projekta',0],
  ['activity',ctx.projects[0].activities[1].id,'DEMO | Prilog uz aktivnost',1],
  ['idea',ctx.ideas[0].id,'DEMO | Vizuelni prilog ideje',2]
 ];
 for(const [type,targetId,label,i] of targets){
  const key=`${ctx.data.code}:${type}:preview`;
  const id=oid('attachment',key);
  const fileName=`${id}.png`;
  const content=demoDiagram(i+ctx.data.code.length);
  const fullPath=path.join(folder,fileName);
  try{await fs.access(fullPath);}catch{await fs.writeFile(fullPath,content,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
  await put(Attachment,'attachment',key,{targetType:type,targetId,owner:author,originalName:`${label}.png`,fileName,mime:'image/png',size:content.length});
 }
}
const sectorData=[
 {code:'DEMO_MKT',name:'DEMO | Marketing',manager:['Jelena','Milić','Rukovodilac marketinga'],people:[['Ana','Marković','Digital marketing'],['Marko','Petrović','Frontend developer'],['Marija','Jovanović','Content specialist']],projects:[
  {title:'Redizajn web sajta',description:'Novi dizajn korporativnog sajta i optimizacija mobilnog prikaza.',progress:[100,70,50,60],tasks:['Koncept i dizajn','Izrada početne stranice','Priprema sadržaja','Testiranje mobilnog prikaza'],status:'active',priority:'high',due:21},
  {title:'Oktobarska kampanja ZepterClub',description:'Planiranje, odobravanje i realizacija kampanje za članove kluba.',progress:[100,40,20,20],tasks:['Kreativni koncept','Priprema oglasa','Landing stranica','Puštanje kampanje'],status:'at_risk',priority:'urgent',due:-2},
  {title:'E-commerce katalog',description:'Ažuriranje tekstova, slika i kategorija proizvoda.',progress:[100,100,90,50],tasks:['Katalog proizvoda','Fotografije proizvoda','Opisi i prevodi','Završna kontrola'],status:'active',priority:'medium',due:18}
 ]},
 {code:'DEMO_IT',name:'DEMO | IT',manager:['Nikola','Ilić','IT menadžer'],people:[['Stefan','Nikolić','Backend developer'],['Milica','Stojanović','QA engineer'],['Vladimir','Kovačević','DevOps inženjer']],projects:[
  {title:'Migracija CMS platforme',description:'Modernizacija CMS sloja i priprema integracija sa ERP sistemima.',progress:[100,75,40,25],tasks:['Analiza Kentico funkcija','Definisanje API ugovora','Implementacija novog CMS-a','Integracioni testovi'],status:'active',priority:'high',due:35},
  {title:'Management Overview PWA',description:'Mobilni PWA za predsednika, rukovodioce i zaposlene.',progress:[100,65,40,15],tasks:['Definisanje uloga','Backend API','React interfejs','PWA i obaveštenja'],status:'active',priority:'high',due:28},
  {title:'Automatizacija BI izveštaja',description:'Priprema strukturisanih izvora i automatskih menadžerskih izveštaja.',progress:[0,0,0,0],tasks:['Mapiranje izvora','Definicija KPI-ja','Integracija podataka','Validacija izveštaja'],status:'planned',priority:'medium',due:55}
 ]},
 {code:'DEMO_SALES',name:'DEMO | Prodaja',manager:['Ivana','Pavlović','Direktorka prodaje'],people:[['Petar','Đorđević','Sales specialist'],['Tijana','Simić','CRM specialist'],['Aleksandar','Lukić','Account manager']],projects:[
  {title:'CRM segmentacija kupaca',description:'Podela kupaca u relevantne segmente za personalizovane ponude.',progress:[100,65,55,20],tasks:['Analiza baze','Segmentacija','Pilot ponude','Merenje rezultata'],status:'active',priority:'high',due:24},
  {title:'Program saradnje sa partnerima',description:'Razvoj prodajnih kanala i novih poslovnih partnerstava.',progress:[100,85,35,0],tasks:['Izbor partnera','Priprema prezentacije','Pilot pregovori','Ugovaranje'],status:'active',priority:'medium',due:32},
  {title:'Praćenje follow-up aktivnosti',description:'Uređenje praćenja kontakata nakon prodajnih konsultacija.',progress:[100,30,0,0],tasks:['Mapiranje toka','CRM šabloni','Obuka agenata','Prvi izveštaj'],status:'at_risk',priority:'high',due:-1}
 ]},
 {code:'DEMO_FIN',name:'DEMO | Finansije',manager:['Milan','Vasić','Finansijski menadžer'],people:[['Sara','Janković','Finansijski analitičar'],['Nemanja','Babić','Kontroling specialist'],['Katarina','Ristić','Računovođa']],projects:[
  {title:'Mesečni kontroling izveštaj',description:'Standardizacija izveštavanja o troškovima, rezultatima i odstupanjima.',progress:[100,95,75,25],tasks:['Prikupljanje troškova','Analiza odstupanja','KPI pregled','Kontrolni sastanak'],status:'active',priority:'high',due:12},
  {title:'Budžet narednog kvartala',description:'Priprema projekcije prihoda i rashoda za sledeći kvartal.',progress:[100,60,40,0],tasks:['Podaci sektora','Model prihoda','Rashodi','Finalna konsolidacija'],status:'active',priority:'medium',due:23},
  {title:'Elektronska obrada faktura',description:'Unapređenje obrade ulaznih računa i kontrola toka odobravanja.',progress:[100,75,55,15],tasks:['Analiza procesa','Povezivanje sistema','Testni računi','Provera kontrole'],status:'active',priority:'medium',due:38}
 ]},
 {code:'DEMO_LOG',name:'DEMO | Logistika',manager:['Bojan','Tomić','Menadžer logistike'],people:[['Jovana','Popović','Planer zaliha'],['Filip','Stevanović','Koordinator isporuka'],['Maja','Milošević','Skladišni analitičar']],projects:[
  {title:'Praćenje statusa zaliha',description:'Usklađivanje ERP stanja i stvarnih količina na skladištu.',progress:[100,70,45,25],tasks:['Analiza ERP podataka','Provera skladišta','Pravila upozorenja','Pilot obračun'],status:'active',priority:'high',due:19},
  {title:'Optimizacija rokova isporuke',description:'Analiza i unapređenje isporuka za regionalna tržišta.',progress:[100,55,30,10],tasks:['Mapa procesa','Analiza kašnjenja','Plan poboljšanja','Praćenje KPI-ja'],status:'at_risk',priority:'high',due:-3},
  {title:'Digitalne otpremnice',description:'Elektronski tok pripreme, potvrde i arhiviranja otpremnica.',progress:[100,80,65,35],tasks:['Pravila dokumenta','Prototip formulara','Interno testiranje','Obuka tima'],status:'active',priority:'medium',due:29}
 ]}
];

async function main(){
 await mongoose.connect(uri,{serverSelectionTimeoutMS:8000});
 try{
  console.log(`Demo seed: ${mongoose.connection.name} (${today}); prethodni podaci se NE brisu.`);
  const passwordHash=await bcrypt.hash(password,12);
  const admin=await put(User,'user','admin',{firstName:'Demo',lastName:'Administrator',email:email('admin'),jobTitle:'Sistemski administrator',passwordHash,role:'admin',approval:'approved',approvedAt:new Date()});
  const president=await put(User,'user','president',{firstName:'Demo',lastName:'Predsednik',email:email('predsednik'),jobTitle:'Predsednik kompanije',passwordHash,role:'president',approval:'approved',approvedAt:new Date()});
  const sectorCtx=[];
  for(const sector of sectorData){
   const sid=await put(Sector,'sector',sector.code,{name:sector.name,code:sector.code,description:`Testni sektor: ${sector.name}. Podaci su izmisljeni.`,active:true});
   const [mf,ml,mjob]=sector.manager;
   const manager=await put(User,'user',`manager:${sector.code}`,{firstName:mf,lastName:ml,email:email(`rukovodilac.${sector.code.toLowerCase().replace('demo_','')}`),passwordHash,jobTitle:mjob,sector:sid,role:'manager',approval:'approved',approvedBy:admin,approvedAt:new Date()});
   await Sector.updateOne({_id:sid,manager:{$exists:false}},{$set:{manager}});
   // Mongoose default manager:null moze biti postavljen umesto missing.
   await Sector.updateOne({_id:sid,manager:null},{$set:{manager}});
   const employees=[];
   for(let i=0;i<sector.people.length;i++){
    const [firstName,lastName,jobTitle]=sector.people[i];
    const emp=await put(User,'user',`employee:${sector.code}:${i}`,{firstName,lastName,email:email(`zaposleni${i+1}.${sector.code.toLowerCase().replace('demo_','')}`),passwordHash,jobTitle,sector:sid,role:'employee',approval:'approved',approvedBy:admin,approvedAt:new Date()});
    employees.push(emp);
   }
   sectorCtx.push({data:sector,id:sid,manager,employees,projects:[]});
  }
  // Registracija koja ceka administratorovu odluku.
  await put(User,'user','pending',{firstName:'Demo',lastName:'Kandidat',email:email('registracija.na.cekanju'),passwordHash,jobTitle:'Marketing saradnik',sector:sectorCtx[0].id,role:'employee',approval:'pending',requestedManager:false});

  for(const sector of sectorCtx){
   for(let p=0;p<sector.data.projects.length;p++){
    const spec=sector.data.projects[p], pkey=`${sector.data.code}:p${p}`;
    const pid=await put(Project,'project',pkey,{sector:sector.id,title:`DEMO | ${spec.title}`,description:spec.description,status:spec.status,priority:spec.priority,owner:sector.manager,members:[sector.manager,...sector.employees],progress:Math.round(spec.progress.reduce((s,x)=>s+x,0)/4),startDate:when(-26-p),dueDate:when(spec.due),createdBy:sector.manager,archived:false});
    const rec={id:pid,spec,activities:[]};
    for(let j=0;j<spec.tasks.length;j++){
      const percent=spec.progress[j];
      const status=percent===100?'completed':spec.status==='at_risk'&&j===2?'blocked':percent===0?'planned':percent>=85?'review':'in_progress';
      const assignees=[sector.employees[j%3]];
      if(j===3)assignees.push(sector.employees[(j+1)%3]);
      const akey=`${pkey}:a${j}`;
      const aid=await put(Activity,'activity',akey,{sector:sector.id,project:pid,title:`DEMO | ${spec.tasks[j]}`,description:`${spec.tasks[j]} – konkretan deo projekta ${spec.title}.`,assignees,status,progress:percent,dueDate:when(spec.due-8+j*3),priority:spec.priority,actualWork:percent?`Završeno približno ${percent}% planiranih aktivnosti. Pripremljeni radni materijali za pregled.`:'Aktivnost još nije započeta.',nextStep:percent===100?'':`Naredni korak: dopuniti i poslati rezultat aktivnosti „${spec.tasks[j]}“ na proveru.`,blockers:status==='blocked'?'Čeka se potvrda potrebnih resursa i odluka rukovodioca.':'',createdBy:sector.manager});
      rec.activities.push({id:aid,status,assignees,title:spec.tasks[j],progress:percent});
    }
    sector.projects.push(rec);
   }
  }

  // Svaki zaposleni ima vise dnevnih unosa, ukljucujuci danasnji dan.
  for(const sector of sectorCtx){
   const allTasks=sector.projects.flatMap(p=>p.activities.map(a=>({...a,projectId:p.id})));
   const persons=[sector.manager,...sector.employees];
   for(let d=0;d<=8;d++){
    for(let x=0;x<persons.length;x++){
      // Jedan zaposleni nije uneo danasnji izvestaj: provera compliance ekrana.
      if(d===0&&x===persons.length-1&&sector===sectorCtx[0])continue;
      const task= x===0? null : allTasks.find((a,i)=>a.assignees.some(uid=>String(uid)===String(persons[x])) && (i+d)%2===0)
        ||allTasks.find(a=>a.assignees.some(uid=>String(uid)===String(persons[x])));
      const project=task?task.projectId:sector.projects[(d+x)%sector.projects.length].id;
      const logKey=`${sector.data.code}:u${x}:d${d}`;
      await put(WorkLog,'worklog',logKey,{
        user:persons[x],sector:sector.id,project,activity:task?.id||undefined,day:day(-d),
        done:x===0?`Pregledani rezultati sektora ${sector.data.name} i koordinisane obaveze na projektima.`:`Rad na aktivnosti „${task?.title}“: ažuriran sadržaj i pripremljen rezultat za pregled.`,
        nextSteps:d%3===0?'Nastavak realizacije, provera rokova i dostavljanje sledeće verzije.':'Dovršiti naredni deo zadatka i uneti novo ažuriranje.',
        blockers:task?.status==='blocked'&&d%2===0?'Potrebna potvrda rukovodioca i dodatni resursi.':'',minutes:60+((d+x)%5)*45
      });
    }
   }
  }

  // Ideje u svim fazama workflow-a.
  for(const sector of sectorCtx){
   const proposals=[
    {key:'forwarded',title:'Digitalni predlozi za unapređenje korisničkog iskustva',status:'forwarded',by:0,benefit:'Brže reagovanje na potrebe kupaca, merljiv napredak i manje ručnog rada.'},
    {key:'submitted',title:'Nova ideja za saradnju između sektora',status:'submitted',by:1,benefit:'Efikasnije korišćenje zajedničkih resursa.'},
    {key:'revision',title:'Automatska obaveštenja o važnim zadacima',status:'revision_requested',by:2,benefit:'Manje propuštenih rokova i jasnije odgovornosti.'},
    {key:'review',title:'Mesečni pregled predloga zaposlenih',status:'in_review',by:0,benefit:'Bolja vidljivost predloga i razmena iskustava.'}
   ];
   sector.ideas=[];
   for(const proposal of proposals){
    const key=`${sector.data.code}:${proposal.key}`;
    const ideaId=await put(Idea,'idea',key,{sector:sector.id,author:sector.employees[proposal.by],title:`DEMO | ${proposal.title}`,description:`Predlog za sektor ${sector.data.name}: ${proposal.title}. Cilj je jednostavniji rad, jasnije obaveštavanje i kvalitetnija koordinacija. Početak kroz ograničeni pilot i merenje rezultata.`,benefit:proposal.benefit,status:proposal.status,reviewNote:proposal.status==='revision_requested'?'Dopuniti predlog procenom troška i jasnim planom pilota.':'',reviewedBy:['forwarded','revision_requested','in_review'].includes(proposal.status)?sector.manager:undefined,forwardedAt:proposal.status==='forwarded'?when(-1):undefined,revisionCount:proposal.status==='revision_requested'?1:0});
    sector.ideas.push({id:ideaId,...proposal});
   }
  }

  for(const sector of sectorCtx)await makeAttachments(sector,sector.employees[0]);

  // Predsednikova pitanja, zadaci i komentar na nivou sektora/projekta/aktivnosti/ideje.
  for(let i=0;i<sectorCtx.length;i++){
   const sector=sectorCtx[i];
   const secComment=await put(Comment,'comment',`${sector.data.code}:president-sector`,{targetType:'sector',targetId:sector.id,author:president,body:`Molim kratak pregled prioriteta sektora ${sector.data.name} i status važnih rokova.`,kind:'instruction',responseStatus:i%2===0?'answered':'open',addressedTo:[sector.manager]});
   if(i%2===0)await put(Comment,'comment',`${sector.data.code}:sector-reply`,{targetType:'sector',targetId:sector.id,author:sector.manager,parent:secComment,body:'Pregled je pripremljen, a glavni zadaci ažurirani u okviru projekata.',kind:'comment',responseStatus:'open',addressedTo:[president]});
   const top=sector.projects[0];
   const pc=await put(Comment,'comment',`${sector.data.code}:president-project`,{targetType:'project',targetId:top.id,author:president,body:'Molim da pre konačne potvrde proverite sve otvorene aktivnosti i dostavite alternativni predlog gde je potrebno.',kind:'instruction',responseStatus:'answered',addressedTo:[sector.manager]});
   await put(Comment,'comment',`${sector.data.code}:project-reply`,{targetType:'project',targetId:top.id,author:sector.manager,parent:pc,body:'Provera je u toku. Izveštaj i prilozi biće dostavljeni nakon konsolidacije.',kind:'comment',addressedTo:[president]});
   const targetActivity=top.activities[1];
   const ac=await put(Comment,'comment',`${sector.data.code}:president-activity`,{targetType:'activity',targetId:targetActivity.id,author:president,body:'Molim detaljnije objašnjenje šta je urađeno i kada očekujete sledeću verziju.',kind:'instruction',responseStatus:i%2===0?'answered':'open',addressedTo:targetActivity.assignees});
   if(i%2===0)await put(Comment,'comment',`${sector.data.code}:activity-reply`,{targetType:'activity',targetId:targetActivity.id,author:targetActivity.assignees[0],parent:ac,body:'Završena je prva verzija. Sledeću proveru planiramo nakon internog testiranja.',kind:'comment',addressedTo:[president]});
   const forwarded=sector.ideas.find(x=>x.status==='forwarded');
   await put(Comment,'comment',`${sector.data.code}:idea-president`,{targetType:'idea',targetId:forwarded.id,author:president,body:'Ideja je interesantna. Molim konkretniji predlog pilot-testiranja i očekivanih rezultata.',kind:'comment',addressedTo:[forwarded.by===0?sector.employees[0]:sector.employees[forwarded.by]]});
   const revision=sector.ideas.find(x=>x.status==='revision_requested');
   await put(Comment,'comment',`${sector.data.code}:idea-manager`,{targetType:'idea',targetId:revision.id,author:sector.manager,body:'Dopunite opis procenom potrebnih resursa i planom sprovođenja.',kind:'comment',addressedTo:[sector.employees[2]]});
   const assignmentId=await put(Assignment,'assignment',`${sector.data.code}:president-task`,{sector:sector.id,assignedTo:sector.manager,createdBy:president,title:`DEMO | Plan prioriteta sektora ${sector.data.name}`,description:'Pripremiti kratku listu otvorenih pitanja, odgovornih osoba i predloženih rokova.',dueDate:when(i===0?-1:5+i),status:i===0?'blocked':i===1?'done':'in_progress',response:i===1?'Plan je prosleđen predsedniku, realizacija završena.':'Rad u toku.'});
   const reqId=await put(DecisionRequest,'request',`${sector.data.code}:approval`,{sector:sector.id,createdBy:sector.manager,title:`DEMO | Odluka za sektor ${sector.data.name}`,description:'Potrebna je saglasnost za narednu fazu realizacije planiranog projekta.',type:i%2===0?'approval':'question',referenceType:'project',referenceId:top.id,status:i===1?'answered':'open',decision:i===1?'Može se nastaviti prema predloženom planu.':'',answeredAt:i===1?when(-1):undefined});
   sector.assignment=assignmentId;sector.request=reqId;
  }

  // Izvestaji: danas, juce, prekjuce, ova i prethodna sedmica.
  // Automatski generisani deo je REALAN rezultat usluge generateReport.
  for(const sector of sectorCtx){
   const periods=[{type:'daily',offset:0},{type:'daily',offset:-1},{type:'daily',offset:-2},{type:'weekly',offset:0},{type:'weekly',offset:-7}];
   for(const {type,offset} of periods){
    const reportDay=day(offset);
    const {start,end}=periodRange(type,reportDay);
    const key=`${sector.data.code}:${type}:${start}`;
    const isDraft=type==='daily'&&offset===-2&&sector===sectorCtx[0];
    const generated=await generateReport({scope:'sector',id:sector.id,type,day:reportDay});
    await put(Report,'report',key,{scope:'sector',sector:sector.id,type,periodStart:start,periodEnd:end,
     status:isDraft?'draft':'published',generated,createdBy:sector.manager,publishedAt:isDraft?undefined:when(offset),
     results:`U sektoru ${sector.data.name} realizovane su ključne aktivnosti. Evidentirano ${generated.stats.workEntries} dnevnih unosa, praćeno ${generated.stats.projects} projekata.`,
     problems:generated.stats.blockedActivities?`Prijavljeno je ${generated.stats.blockedActivities} blokiranih aktivnosti; potrebno je usaglašavanje prioriteta.`:'Nema kritičnih blokada u ovom periodu.',
     nextSteps:'Završiti aktivnosti pred rokovima, proveriti otvorena pitanja i usaglasiti naredne prioritete.'});
   }
  }

  // Obavestenja u oba smera, deo oznacen neprocitanim radi testiranja.
  for(const sector of sectorCtx){
   const top=sector.projects[0];
   const targets=[
    {user:president,actor:sector.manager,type:'decision_request',title:'Novo pitanje rukovodioca',body:`${sector.data.name}: potrebna je odluka o projektu.`,link:`/requests/${sector.request}`},
    {user:president,actor:sector.manager,type:'report_published',title:'Objavljen sektorski izveštaj',body:`Dnevni izveštaj: ${sector.data.name}`,link:'/reports'},
    {user:president,actor:sector.manager,type:'idea_forwarded',title:'Nova ideja zaposlenog',body:`Prosleđena ideja iz sektora ${sector.data.name}`,link:`/ideas/${sector.ideas[0].id}`},
    {user:sector.manager,actor:president,type:'president_assignment',title:'Novo zaduženje predsednika',body:'Pripremiti pregled sektorskih prioriteta.',link:`/assignments/${sector.assignment}`},
    {user:sector.manager,actor:sector.employees[1],type:'new_idea',title:'Nova ideja zaposlenog',body:'Predlog čeka pregled rukovodioca.',link:`/ideas/${sector.ideas[1].id}`},
    {user:sector.employees[0],actor:president,type:'comment',title:'Komentar predsednika',body:'Novi komentar na projektu.',link:`/projects/${top.id}`},
    {user:sector.employees[1],actor:sector.manager,type:'activity_updated',title:'Ažurirana aktivnost',body:'Pogledajte novi status aktivnosti.',link:`/activities/${top.activities[1].id}`},
    {user:sector.employees[2],actor:sector.manager,type:'idea_status',title:'Ideja vraćena na doradu',body:'Dopunite opis svoje ideje.',link:`/ideas/${sector.ideas[2].id}`}
   ];
   for(let i=0;i<targets.length;i++){
    await put(Notification,'notification',`${sector.data.code}:${i}`,{...targets[i],readAt:i===6?when(-1):undefined});
   }
  }
  await put(Audit,'audit','seed',{actor:admin,action:'demo.seed',entity:'Demo',details:{version:SEED_VERSION,day:today}});

  console.log('\n--- DEMO NALOZI (svi odobreni osim registracije na cekanju) ---');
  console.log('Uloga'.padEnd(16)+'Email');
  console.log('Admin'.padEnd(16)+email('admin'));
  console.log('Predsednik'.padEnd(16)+email('predsednik'));
  for(const sector of sectorCtx){
   const key=sector.data.code.toLowerCase().replace('demo_','');
   console.log(('Rukovodilac '+key).padEnd(16)+email(`rukovodilac.${key}`));
   for(let i=1;i<=3;i++)console.log(('Zaposleni '+key).padEnd(16)+email(`zaposleni${i}.${key}`));
  }
  console.log('Na cekanju: '+email('registracija.na.cekanju'));
  console.log('Lozinka za demo naloge je vrednost DEMO_SEED_PASSWORD iz server/.env (ne prikazuje se).');
  console.log('Dodato u ovoj iteraciji:',JSON.stringify(created));
  console.log('Seed zavrsen. Ponovno pokretanje ne duplira vec kreirane demo zapise.');
 }finally{await mongoose.disconnect();}
}
main().catch(error=>{console.error('Demo seed NIJE zavrsen:',error.message);process.exitCode=1;});
