// Optional controls and a simulated manager reply; never mounted in the actual app.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Enable the isolated fixture explicitly.');
const base='http://127.0.0.1:4002/api',sector='33'.repeat(12);
async function call(path,body,role='manager',headers={}){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':role,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const data=await response.json();assert.ok(response.ok,'Fixture request failed with status '+response.status);return data;
}
const command=process.argv[2];
if(command==='decide-other'){
 const id=process.argv[3];assert.match(id||'',/^[a-f0-9]{24}$/);
 const {idea}=await call('/ideas/'+id,undefined,'president');
 await call('/ideas/'+id+'/decision',{action:'approve',comment:'Plan sa drugog testnog uređaja.',requestId:randomUUID()},'president',{'If-Match':'"'+idea.updatedAt+'"'});
 console.log('Another isolated president session saved its decision.');
}else if(command==='reply'){
 const {items}=await call('/comments?targetType=sector&targetId='+sector);
 const parent=items.filter(x=>x.kind==='instruction'&&x.author?._id==='77'.repeat(12)).at(-1);assert.ok(parent);
 await call('/comments',{targetType:'sector',targetId:sector,parentId:parent._id,kind:'comment',body:'Potvrđujem prioritete. Pripremićemo plan sektora za pregled.'});
 console.log('Fixture manager replied to the president sector instruction.');
}else{
 const modes={'activity-error':{activityFailOnce:true},'idea-detail-error':{ideaDetailFailOnce:true},'attachment-list-error':{attachmentListFailOnce:true},'comments-error':{commentsFailOnce:true},'home-error':{presidentFailOnce:true},'comment-lost':{commentResponseLostOnce:true},'attachment-lost':{attachmentResponseLostOnce:true},'socket-reconnect':{socketDisconnect:true},'ideas-error':{presidentIdeasFailOnce:true},'idea-read-error':{ideaReadFailOnce:true},'decision-lost':{decisionResponseLostOnce:true},'decision-delivery-error':{decisionDeliveryFailOnce:true},'project-options-empty':{reportProjectListEmpty:true},'project-options-normal':{reportProjectListEmpty:false}};
 assert.ok(modes[command],'Unknown QA command.');
 await call('/__fixture/controls',modes[command]);console.log('Fixture mode set: '+command);
}
