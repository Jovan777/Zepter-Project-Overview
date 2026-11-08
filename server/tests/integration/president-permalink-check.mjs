// Opt-in local auth/read check. Never prints the URL, account data, cookies or tokens.
import 'dotenv/config';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {presidentUrlKey} from '../../src/lib/president-link-url.js';
import {revokeMarkedReadSession} from '../helpers/live-session-cleanup.mjs';
if(process.env.ZEPTER_PRESIDENT_URL_CHECK!=='1')throw Error('Enable ZEPTER_PRESIDENT_URL_CHECK=1 explicitly.');
const url=new URL((await fs.readFile(new URL('../../private-access/predsednik-link.txt',import.meta.url),'utf8')).trim());
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.origin!==process.env.CLIENT_ORIGIN||!/^\/president-zp-[-_A-Za-z0-9]{32}$/.test(url.pathname)||url.hash||url.search)throw Error('Expected the local permanent presidential URL.');
const key=presidentUrlKey(url.href,url.origin),base='http://127.0.0.1:'+(process.env.PORT||4000)+'/api',sessions=[];
let checks=0;
const check=(condition,message)=>{if(!condition)throw Error(message);checks++;};
try{
 for(const tail of ['','/projects','/my-comments']){
  const page=await fetch(url.href+tail,{signal:AbortSignal.timeout(10000),redirect:'manual'});
  check(page.status===200,'A permanent URL or nested route did not serve the app.');
  const html=await page.text();check(html.includes('name="referrer" content="no-referrer"'),'The app does not disable URL referrer forwarding.');
 }
 for(let device=0;device<2;device++){
  const marker='zepter-president-read-check/'+crypto.randomUUID();
  const response=await fetch(base+'/auth/president-link',{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/json','User-Agent':marker},body:JSON.stringify({key}),signal:AbortSignal.timeout(10000)});
  const cookie=response.headers.get('set-cookie')?.split(';')[0];
  const session={cookie,device:marker};if(cookie)sessions.push(session);
  check(response.ok,'The permanent URL did not authenticate a new independent device.');
  const data=await response.json();session.userId=data.user?._id;
  check(data.user?.role==='president'&&!!data.accessToken&&!!cookie,'The expected private president identity was not returned.');
  const overview=await fetch(base+'/dashboard/president',{headers:{Authorization:'Bearer '+data.accessToken,'User-Agent':marker},signal:AbortSignal.timeout(10000)});
  check(overview.ok,'The authenticated device could not read the president overview.');
 }
 check(sessions.length===2&&sessions[0].cookie!==sessions[1].cookie,'Independent devices did not receive independent cookies.');
 console.log('PASS '+checks+' permanent URL/independent-device checks. No business records changed or credentials printed.');
}finally{
 const cleanupFailures=[];
 for(const session of sessions){
  try{
   const response=await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:session.cookie,Origin:url.origin,'User-Agent':session.device},signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Logout failed.');
  }catch{
   try{await revokeMarkedReadSession({uri:process.env.MONGODB_URI||process.env.MONGO_URI,...session});}
   catch{cleanupFailures.push(true);}
  }
 }
 if(cleanupFailures.length)throw Error('Cleanup could not confirm every marked test session.');
 console.log(sessions.length+' marked test sessions logged out.');
}
