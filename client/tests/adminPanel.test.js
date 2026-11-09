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
import {userDraft,adminUserQuery,protectedAccount} from '../src/features/admin/adminPresentation.js';
let vite,cacheDir,AdminUserDialog,AdminShell,AdminPanel;
let LegacyPages,Auth;
before(async()=>{
 cacheDir=await fs.mkdtemp(path.join(os.tmpdir(),'zepter-admin-render-'));
 vite=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,cacheDir,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
 ({default:AdminUserDialog}=await vite.ssrLoadModule('/src/features/admin/AdminUserDialog.jsx'));({default:AdminShell}=await vite.ssrLoadModule('/src/features/admin/AdminShell.jsx'));({default:AdminPanel}=await vite.ssrLoadModule('/src/features/admin/AdminPanel.jsx'));
 LegacyPages=await vite.ssrLoadModule('/src/features/legacy/LegacyPages.jsx');({Auth}=await vite.ssrLoadModule('/src/features/workspace/AuthContext.js'));
});
after(async()=>{await vite?.close();if(cacheDir){if(path.dirname(path.resolve(cacheDir))!==path.resolve(os.tmpdir())||!path.basename(cacheDir).startsWith('zepter-admin-render-'))throw Error('Unexpected cache path');await fs.rm(cacheDir,{recursive:true,force:true});}});
function render(element,url='/admin/users',pattern='*'){const router=createMemoryRouter([{path:pattern,element}],{initialEntries:[url]});try{return renderToStaticMarkup(React.createElement(RouterProvider,{router}));}finally{router.dispose();}}
const user={_id:'111111111111111111111111',firstName:'Test',lastName:'Korisnik',email:'test@isolated.test',approval:'pending',role:'employee',requestedManager:true,sector:'222222222222222222222222'};
const dialog=value=>render(React.createElement(AdminUserDialog,{user:value,sectors:[{_id:user.sector,name:'IT',active:true}],onClose(){},onSaved(){}}));
test('A manager registration request still defaults to employee until the admin explicitly chooses the final role',()=>{
 assert.equal(userDraft(user).role,'employee');const html=dialog(user);assert.match(html,/Konačna uloga/);assert.match(html,/<option value="employee" selected="">Zaposleni/);assert.doesNotMatch(html,/<option value="manager" selected/);
});
test('Privileged account details expose no management or deactivation controls',()=>{
 for(const role of ['admin','president']){assert.equal(protectedAccount({...user,role}),true);const html=dialog({...user,role,approval:'approved'});assert.match(html,/zaštićen nalog/);assert.doesNotMatch(html,/Odobri pristup|Deaktiviraj|Sačuvaj izmene|<form/);}
});
test('Disabled users have a reactivation action and a single shared editable form',()=>{
 const html=dialog({...user,approval:'disabled'});assert.match(html,/Aktiviraj nalog/);assert.equal((html.match(/<form/g)||[]).length,1);assert.doesNotMatch(html,/Odobri pristup/);
});
test('Admin search carries filters and bounds pagination before the API request',()=>{
 const query=adminUserQuery(new URLSearchParams('q=Ana&role=manager&approval=approved&sectorId=123&page=-5&limit=999'));
 assert.equal(query.get('page'),'1');assert.equal(query.get('limit'),'12');assert.equal(query.get('role'),'manager');assert.equal(query.get('q'),'Ana');assert.equal(adminUserQuery(new URLSearchParams('page=Infinity')).get('page'),'10000');
});
test('The admin shell has clear destinations and logout while retaining one content instance',()=>{
 const html=render(React.createElement(AdminShell,{user:{...user,role:'admin'},logout(){}},React.createElement('form',null,'Unique draft')),'/admin');
 for(const url of ['/admin/users','/admin/sectors','/admin/audit'])assert.ok(html.includes('href="'+url+'"'));
 assert.match(html,/Odjavi se/);assert.equal((html.match(/Unique draft/g)||[]).length,1);
});
test('All four administrative routes render their own page and loading state',()=>{
 for(const [url,title]of [['/admin','Pregled administracije'],['/admin/users','Korisnici i pristup'],['/admin/sectors','Sektori kompanije'],['/admin/audit','Istorija promena']]){
  const html=render(React.createElement(AdminPanel),url,'/admin/*');assert.ok(html.includes(title));assert.match(html,/role="status"/);
 }
});
test('Lazy shared presidential flows keep the same auth context and their forms remain available',()=>{
 const president={...user,role:'president',approval:'approved'};
 for(const [name,title]of [['AssignmentNew','Novo zaduženje rukovodiocu'],['RequestNew','Pitanje za predsednika']]){
  const page=React.createElement(Auth.Provider,{value:{user:president}},React.createElement(LegacyPages[name]));const html=render(page,'/assignments/new');assert.ok(html.includes(title));assert.equal((html.match(/<form/g)||[]).length,1);
 }
 const html=render(React.createElement(Auth.Provider,{value:{user:president}},React.createElement(LegacyPages.LegacyLayout,null,'Shared authenticated content')),'/requests/new');assert.match(html,/Shared authenticated content/);assert.match(html,/Komentari/);
});
