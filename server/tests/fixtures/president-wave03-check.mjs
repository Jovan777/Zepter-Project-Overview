import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Enable the isolated president QA fixture explicitly.');
const base='http://127.0.0.1:4002/api',idea='b3'.repeat(12),activity='55'.repeat(12),project='44'.repeat(12),employee='11'.repeat(12);
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const headers=role=>({Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':role});
async function call(path,{role='president',body,method=body?'POST':'GET'}={}){
 const response=await fetch(base+path,{method,headers:{...headers(role),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 return {status:response.status,data:await response.json()};
}
const png=await fs.readFile(new URL('../../../client/public/icons/icon-192.png',import.meta.url));
async function upload(type,target,commentId,key,role='president'){
 const body=new FormData();body.append('file',new Blob([png],{type:'image/png'}),'Dokument-'+key.slice(0,8)+'.png');
 const response=await fetch(base+'/attachments?'+new URLSearchParams({targetType:type,targetId:target,commentId,uploadId:key}),{method:'POST',headers:headers(role),body});
 return {status:response.status,data:await response.json()};
}
for(const [type,target]of [['idea',idea],['activity',activity]]){
 const content='Izolovana predsednička smernica '+randomUUID();
 const start=await call('/'+(type==='idea'?'ideas':'activities')+'/'+target);
 check(start.status===200,'Detail '+type+' is available to president.');
 if(type==='activity'){
  check(start.data.project._id===project,'Activity retains project context.');
  check(start.data.activity.actualWork&&start.data.activity.assignees.length,'Activity contains real work and responsible employees.');
 }
 const posted=await call('/comments',{body:{targetType:type,targetId:target,kind:'instruction',body:content}});
 check(posted.status===201,'President instruction saved for '+type);const comment=posted.data.comment;
 const operation=randomUUID();
 await call('/__fixture/controls',{body:{attachmentResponseLostOnce:true}});
 check((await upload(type,target,comment._id,operation)).status===503,'Simulated response loss after file is saved.');
 const retry=await upload(type,target,comment._id,operation);check(retry.status===200,'Retry recovers confirmed file.');
 const again=await upload(type,target,comment._id,operation);check(again.data.attachment._id===retry.data.attachment._id,'Repeated retry retains the same attachment.');
 const conversation=await call('/comments?'+new URLSearchParams({targetType:type,targetId:target,includeAttachments:'1',limit:'50'}));
 const mine=conversation.data.items.find(row=>row._id===comment._id);
 check(mine.attachments.length===1&&mine.attachments[0]._id===retry.data.attachment._id,'File is attached once to its exact comment.');
 check(!Object.hasOwn(mine.attachments[0],'fileName')&&!Object.hasOwn(mine.attachments[0],'uploadId'),'Enriched comments do not expose storage or operation fields.');
 const authorView=await call('/comments?'+new URLSearchParams({targetType:type,targetId:target,includeAttachments:'1',limit:'50'}),{role:'employee'});
 check(authorView.data.items.some(row=>row._id===comment._id&&row.attachments.length===1),'Employee sees the comment attachment.');
 const download=await fetch(base+'/attachments/'+retry.data.attachment._id,{headers:headers('employee')});
 check(download.status===200&&download.headers.get('cache-control')==='no-store','Employee downloads privately.');
 check(Buffer.from(await download.arrayBuffer()).equals(png),'Download bytes match the uploaded file.');
 const notices=await call('/notifications?limit=50',{role:'employee'});
 check(notices.data.items.some(row=>row.user===employee&&row.link==='/'+(type==='idea'?'ideas':'activities')+'/'+target&&row.body===content.slice(0,130)),'Author or assignee receives the comment notification.');
 const reply=await call('/comments',{role:'employee',body:{targetType:type,targetId:target,parentId:comment._id,kind:'comment',body:'Potvrđujem smernicu, pripremam rezultat.'}});
 check(reply.status===201&&reply.data.comment.parent===comment._id,'Employee replies inside the same conversation.');
 const refreshed=await call('/comments?'+new URLSearchParams({targetType:type,targetId:target,includeAttachments:'1',limit:'50'}));
 check(refreshed.data.items.find(row=>row._id===comment._id).responseStatus==='answered','Instruction is answered.');
 const presidentNotices=await call('/notifications?limit=50');
 check(presidentNotices.data.items.some(row=>row.link==='/'+(type==='idea'?'ideas':'activities')+'/'+target&&row.actor===employee),'President receives the reply notification.');
 check((await upload(type,target,comment._id,randomUUID(),'employee')).status===403,'Employee cannot upload to president comment.');
 check((await upload(type,target,reply.data.comment._id,randomUUID())).status===403,'President cannot upload to employee comment.');
 const different=type==='idea'?'c1'+'0'.repeat(22):'66'.repeat(12);
 check((await upload(type,different,comment._id,randomUUID())).status===403,'Cross-target attachment is rejected.');
}
check((await call('/ideas/'+'b0'.repeat(12))).status===403,'Unforwarded idea stays private.');
check((await call('/activities/'+activity,{role:'manager',method:'GET'})).status===200,'Sector manager retains activity access.');
const foreign='c1'+'1'.padStart(22,'0');
check((await call('/ideas/'+foreign,{role:'manager'})).status===403,'Manager cannot read foreign-sector idea.');
console.log('PASS '+checks+' president detail/comment/file checks. Only isolated fixture data used.');
