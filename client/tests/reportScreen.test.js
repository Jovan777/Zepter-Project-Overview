import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createMemoryRouter,RouterProvider} from 'react-router-dom';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {shiftReportDay} from '../src/features/manager/reportPresentation.js';

let vite,cacheDir,ReportEditor,ManagerReports,PresidentShell,WorkspaceNavigation,PresidentCommentCard;
const sectorId='333333333333333333333333',id='aaaaaaaaaaaaaaaaaaaaaaaa';
before(async()=>{
  cacheDir=await fs.mkdtemp(path.join(os.tmpdir(),'zepter-report-render-'));
  vite=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,cacheDir,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
  ({ReportEditor}=await vite.ssrLoadModule('/src/features/manager/ManagerReportEditor.jsx'));
  ({default:ManagerReports}=await vite.ssrLoadModule('/src/features/manager/ManagerReports.jsx'));
  ({default:PresidentShell}=await vite.ssrLoadModule('/src/features/president/PresidentShell.jsx'));
  ({default:WorkspaceNavigation}=await vite.ssrLoadModule('/src/features/workspace/WorkspaceNavigation.jsx'));
  ({PresidentCommentCard}=await vite.ssrLoadModule('/src/features/president/PresidentComments.jsx'));
});
after(async()=>{await vite?.close();if(cacheDir){if(path.dirname(path.resolve(cacheDir))!==path.resolve(os.tmpdir())||!path.basename(cacheDir).startsWith('zepter-report-render-'))throw Error('Unexpected test cache');await fs.rm(cacheDir,{recursive:true,force:true});}});
function render(element,url='/reports/new?type=weekly&day=2026-11-08',basename='/'){
  const router=createMemoryRouter([{path:'*',element}],{initialEntries:[url],basename});
  try{return renderToStaticMarkup(React.createElement(RouterProvider,{router}));}finally{router.dispose();}
}
function editor(initial,newRoute=true){
  return render(React.createElement(ReportEditor,{initial,generated:{stats:{},periodStart:'2026-11-02',periodEnd:'2026-11-08'},sectorName:'Test sektor',sectorId,type:'weekly',day:'2026-11-08',search:new URLSearchParams('type=weekly&day=2026-11-08'),setSearch(){},newRoute}));
}
const report={_id:id,type:'weekly',status:'published',periodStart:'2026-11-02',periodEnd:'2026-11-08',results:'Sačuvani rezultat',updatedAt:'2026-11-08T12:00:00.000Z'};

test('The president shell has no logout or account menu on either mobile or desktop',()=>{
 const user={_id:id,role:'president',firstName:'Test',lastName:'Predsednik'};
 const html=render(React.createElement(PresidentShell,{user},React.createElement('h1',null,'Pregled kompanije')),'/');
 assert.doesNotMatch(html,/Odjavi se|Odjava|Moj nalog/);
 assert.match(html,/Glavna navigacija predsednika/);
});

test('President navigation retains the personal URL prefix and keeps login/logout out of the workspace',()=>{
 const basename='/president-zp-'+'k'.repeat(32),user={_id:id,role:'president',firstName:'Test',lastName:'Predsednik'};
 const html=render(React.createElement(PresidentShell,{user},React.createElement('h1',null,'Pregled kompanije')),basename,basename);
 for(const target of ['','/sectors','/ideas','/my-comments','/attention'])assert.ok(html.includes('href="'+basename+target+'"'),'Missing scoped navigation: '+target);
 assert.doesNotMatch(html,/Odjavi se|Odjava|Moj nalog/);
});
test('History cards preserve the exact comment destination and a genuine reply in accessible markup',()=>{
 const comment={_id:id,kind:'instruction',status:'answered',createdAt:'2026-11-08T10:00Z',targetType:'activity',target:{title:'Priprema stranice',projectTitle:'Redizajn sajta',available:true},body:'Pripremite novu verziju.',link:'/activities/'+id+'?commentId='+id+'#president-activity-comments',reply:{_id:sectorId,body:'Nova verzija je spremna.',createdAt:'2026-11-08T11:00Z',author:{firstName:'Test',lastName:'Zaposleni'}}};
 const html=render(React.createElement(PresidentCommentCard,{comment}),'/my-comments');
 assert.match(html,/commentId=aaaaaaaaaaaaaaaaaaaaaaaa#president-activity-comments/);assert.match(html,/aria-describedby="history-body-/);
 assert.match(html,/Odgovoreno/);assert.match(html,/Test Zaposleni/);assert.match(html,/Nova verzija je spremna/);assert.doesNotMatch(html,/<button/);
});
test('Unavailable history has no broken action and never fabricates an author response',()=>{
 const html=render(React.createElement(PresidentCommentCard,{comment:{_id:id,kind:'comment',status:'unavailable',targetType:'project',target:{title:'Obrisan projekat',available:false},body:'Moj sačuvan komentar',link:null,reply:null}}),'/my-comments');
 assert.match(html,/<article/);assert.match(html,/Sačuvan je vaš komentar/);assert.doesNotMatch(html,/<a(?:\s|>)|Poslednji odgovor/);
});
test('Employee and manager navigation retain their own logout control',()=>{
 for(const role of ['employee','manager']){
  const html=render(React.createElement(WorkspaceNavigation,{user:{_id:id,role,firstName:'Test'},logout(){}}),'/');
  assert.match(html,/aria-label="Odjavi se"/);
 }
});
test('New weekly report clearly explains a published period and offers another week instead of silently showing the old overview',()=>{
  const html=editor(report);
  assert.match(html,/<h1>Kreiranje izveštaja<\/h1>/);
  assert.match(html,/Za ovu nedelju izveštaj je već objavljen/);
  assert.match(html,/Sledeća nedelja/);
  assert.match(html,new RegExp('href="/reports/'+id+'"'));
  assert.doesNotMatch(html,/<textarea|Sačuvani rezultat/);
});
test('New weekly periods and existing drafts keep editable summary fields and the selected Sunday',()=>{
  for(const initial of [null,{...report,status:'draft'}]){
    const html=editor(initial);
    assert.match(html,/<textarea[^>]*id="summary-results"/);
    assert.match(html,/Sačuvaj nacrt/);
    assert.match(html,/Objavi izveštaj/);
    assert.match(html,/value="2026-11-08"/);
    assert.match(html,/Nedeljni izveštaj/);
  }
});
test('Opening a published report by ID stays read-only',()=>{
  const html=editor(report,false);
  assert.match(html,/<h1>Objavljen izveštaj<\/h1>/);
  assert.match(html,/Sačuvani rezultat/);
  assert.doesNotMatch(html,/<textarea|>Objavi izveštaj<|Izbor perioda izveštaja/);
});
test('The list opens the weekly creation route even when the daily tab and preview context are active',()=>{
  const html=render(React.createElement(ManagerReports,{user:{role:'manager',sector:sectorId}}),'/reports?type=daily&day=2026-11-08&scope=project&id='+id);
  assert.match(html,/href="\/reports\/new\?type=weekly&amp;day=2026-11-08"/);
  assert.match(html,/Novi nedeljni izveštaj/);
});
test('Adjacent report periods retain calendar dates across daylight saving, month and year boundaries',()=>{
  for(const [type,day,direction,wanted]of [['weekly','2026-11-08',1,'2026-11-15'],['weekly','2026-03-29',1,'2026-04-05'],['weekly','2026-10-25',-1,'2026-10-18'],['weekly','2026-12-28',1,'2027-01-04'],['daily','2028-02-28',1,'2028-02-29']])assert.equal(shiftReportDay(type,day,direction),wanted);
  assert.throws(()=>shiftReportDay('weekly','2026-02-30',1));
});
