import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Start a fresh president fixture with ZEPTER_UI_QA=1 and ZEPTER_UI_WAVE02=1.');
const base='http://127.0.0.1:4002/api',sector='33'.repeat(12),project='44'.repeat(12),approvedId='b3'.repeat(12),rejectId='c1'+'0'.repeat(22);
let token,cookie,count=0;
const check=(condition,message)=>{assert.ok(condition,message);count++;};
async function call(path,{body,role,headers={},method=body?'POST':'GET'}={}){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:4002',Authorization:role?'Bearer isolated-ui-fixture':'Bearer '+token,...(role?{'X-Zepter-Fixture-Role':role}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={error:text};}return {status:response.status,data,response};
}
try{
 const auth=await call('/auth/president-link',{body:{key:'p'.repeat(32)}});
 cookie=auth.response.headers.get('set-cookie')?.split(';')[0];token=auth.data.accessToken;check(auth.status===200,'President link authentication.');
 const list=await call('/ideas/president');check(list.status===200,'President idea feed.');
 check(list.data.total===17&&list.data.items.length===12,'All forwarded/final ideas paginate.');
 check(list.data.stats.new===13&&list.data.stats.review===2&&list.data.stats.approved===1&&list.data.stats.rejected===1,'Personal reading and final-decision counts.');
 const second=await call('/ideas/president?page=2');
 check(new Set([...list.data.items,...second.data.items].map(x=>x._id)).size===17,'No duplicated or skipped ideas.');
 check([...list.data.items,...second.data.items].some(x=>x.sector._id!==sector),'Ideas from multiple sectors are visible.');
 for(const tab of ['new','review','approved','rejected']){
  const filtered=await call('/ideas/president?tab='+tab);check(filtered.data.total===list.data.stats[tab],'Global count matches '+tab+' filter.');
 }
 for(const q of ['.*','[','('])check((await call('/ideas/president?q='+encodeURIComponent(q))).data.total===0,'Literal search '+q);
 check((await call('/ideas/president?q='+encodeURIComponent('Loyalty'))).data.total===1,'Title search.');
 check((await call('/ideas/president?tab=submitted')).status===422,'Unforwarded state is not a president filter.');
 for(const role of ['employee','manager','admin']){
  check((await call('/ideas/president',{role})).status===403,'President feed rejects '+role);
  check((await call('/ideas/'+approvedId+'/decision',{role,body:{action:'approve',comment:'Test',requestId:randomUUID()}})).status===403,'Decision rejects '+role);
 }
 check((await call('/ideas/'+'b0'.repeat(12))).status===403,'Unforwarded proposal is private.');
 check((await call('/ideas/'+'b0'.repeat(12)+'/read',{method:'POST'})).status===403,'Cannot mark a private proposal.');
 const candidate=(await call('/ideas/'+approvedId)).data.idea,stamp='"'+candidate.updatedAt+'"';
 check((await call('/ideas/'+approvedId+'/read',{method:'POST',headers:{'If-Match':stamp}})).status===200,'Mark read.');
 check((await call('/ideas/'+approvedId+'/read',{method:'POST'})).status===200,'Repeated reading is idempotent.');
 const marked=await call('/ideas/president?tab=new');check(marked.data.total===12,'Reading clears the new marker.');
 check((await call('/ideas/president?tab=review')).data.total===3,'Reading moves to pending review.');
 for(const comment of ['', '   '])check((await call('/ideas/'+approvedId+'/decision',{body:{action:'approve',comment,requestId:randomUUID()},headers:{'If-Match':stamp}})).status===422,'Approval requires next steps.');
 check((await call('/ideas/'+approvedId+'/decision',{body:{action:'approve',comment:'Naredni koraci.',requestId:randomUUID()}})).status===428,'A decision requires a version.');
 check((await call('/ideas/'+approvedId+'/decision',{body:{action:'approve',comment:'Naredni koraci.',requestId:randomUUID()},headers:{'If-Match':'"stale"'}})).status===409,'Stale decision rejected.');
 const attentionBefore=(await call('/dashboard/president')).data.stats.attention;
 const operation=randomUUID(),note='Pripremite plan primene sa odgovornim osobama i rokovima.';
 const approved=await call('/ideas/'+approvedId+'/decision',{body:{action:'approve',comment:note,requestId:operation},headers:{'If-Match':stamp}});
 check(approved.status===200&&approved.data.idea.status==='approved','Approve the forwarded idea.');
 check(approved.data.idea.decision.note===note&&approved.data.idea.decision.deliveryStatus==='complete','Decision and delivery are complete.');
 check(!Object.hasOwn(approved.data.idea,'decisionDelivery'),'Internal delivery metadata is private.');
 check((await call('/dashboard/president')).data.stats.attention===attentionBefore-1,'Approval clears one waiting president reaction.');
 const repeat=await call('/ideas/'+approvedId+'/decision',{body:{action:'approve',comment:note,requestId:operation},headers:{'If-Match':stamp}});check(repeat.status===200,'Retry the same request safely.');
 const comments=await call('/comments?targetType=idea&targetId='+approvedId);
 const instruction=comments.data.items.filter(x=>x.body===note);check(instruction.length===1&&instruction[0].kind==='instruction','Exactly one mandatory instruction exists.');
 check(instruction[0].addressedTo.some(x=>(x._id||x)==='22'.repeat(12)),'Instruction addresses the forwarding manager.');
 const notifications=await call('/notifications?view=manager&category=president&limit=50',{role:'manager'});
 check(notifications.data.items.filter(x=>x.link==='/ideas/'+approvedId&&x.type==='instruction').length===1,'Forwarding manager receives one president instruction.');
 const managerIdea=await call('/ideas/'+approvedId,{role:'manager'});check(managerIdea.data.idea.decision.note===note,'Manager sees the actual next steps.');
 check((await call('/ideas/'+approvedId+'/decision',{body:{action:'reject',comment:'',requestId:randomUUID()},headers:{'If-Match':stamp}})).status===409,'Final approval cannot be changed.');
 const rejection=(await call('/ideas/'+rejectId)).data.idea;
 const rejected=await call('/ideas/'+rejectId+'/decision',{body:{action:'reject',comment:'',requestId:randomUUID()},headers:{'If-Match':'"'+rejection.updatedAt+'"'}});
 check(rejected.status===200&&rejected.data.idea.status==='rejected','Rejection needs no extra comment.');
 check((await call('/dashboard/president')).data.stats.attention===attentionBefore-2,'Rejection also clears the waiting reaction.');
 check((await call('/ideas/'+rejectId,{role:'employee',method:'PATCH',body:{title:'Pokušaj promene'}})).status===409,'Author cannot edit a rejected idea.');
 check((await call('/ideas/'+rejectId+'/resubmit',{role:'employee',method:'POST'})).status===409,'Rejected idea cannot be resubmitted.');
 check((await call('/ideas/'+rejectId+'/review',{role:'manager',body:{action:'forward'}})).status===409,'Manager cannot reopen a rejected idea.');
 check((await call('/ideas/sector?tab=forwarded&limit=50',{role:'manager'})).data.items.some(x=>x.status==='approved'),'Manager history keeps approved ideas.');
 check((await call('/ideas/mine?tab=forwarded&limit=50',{role:'employee'})).data.items.some(x=>x.status==='rejected'),'Author history keeps rejected ideas.');
 const foreign='c1'+'1'.padStart(22,'0');check((await call('/ideas/'+foreign,{role:'manager'})).status===403,'Manager cannot read another sector idea.');
 const tasks=await call('/activities/project/'+project);check(tasks.data.items.length===16,'The full project activity list is available.');
 check((await call('/projects/'+project)).data.project.members.length===3,'Real team is available.');
 const detail=(await call('/activities/'+'55'.repeat(12))).data;check(detail.activity.status==='in_progress'&&detail.project._id===project,'Activity opens from the project.');
 for(const type of ['daily','weekly']){const report=await call('/reports/preview?scope=project&id='+project+'&type='+type);check(report.status===200&&report.data.report.targetId===project&&report.data.report.type===type,'Project report '+type);}
 const recoveryId='c1'+'2'.padStart(22,'0'),recoveryIdea=(await call('/ideas/'+recoveryId)).data.idea,recoveryNote='Oporavak: pripremite detaljan plan.';
 await call('/__fixture/controls',{role:'manager',body:{decisionDeliveryFailOnce:true}});
 const pending=await call('/ideas/'+recoveryId+'/decision',{body:{action:'approve',comment:recoveryNote,requestId:randomUUID()},headers:{'If-Match':'"'+recoveryIdea.updatedAt+'"'}});
 check(pending.status===202&&pending.data.idea.decision.deliveryStatus==='pending','Saved approval survives an instruction-delivery outage.');
 const recovered=await call('/ideas/'+recoveryId+'/decision/deliver',{method:'POST'});
 check(recovered.status===200&&recovered.data.idea.decision.deliveryStatus==='complete','Delivery can resume after the original request.');
 await call('/ideas/'+recoveryId+'/decision/deliver',{method:'POST'});
 check((await call('/comments?targetType=idea&targetId='+recoveryId)).data.items.filter(x=>x.body===recoveryNote).length===1,'Recovery never duplicates the instruction.');
 const lostId='c1'+'3'.padStart(22,'0'),lostIdea=(await call('/ideas/'+lostId)).data.idea,lostBody={action:'approve',comment:'Plan čija potvrda nije stigla.',requestId:randomUUID()},lostHeaders={'If-Match':'"'+lostIdea.updatedAt+'"'};
 await call('/__fixture/controls',{role:'manager',body:{decisionResponseLostOnce:true}});
 check((await call('/ideas/'+lostId+'/decision',{body:lostBody,headers:lostHeaders})).status===503,'The response can be lost after committing.');
 check((await call('/ideas/'+lostId)).data.idea.status==='approved','A fresh read reveals the committed decision.');
 check((await call('/ideas/'+lostId+'/decision',{body:lostBody,headers:lostHeaders})).status===200,'An identical retry is safe after a lost response.');
 check((await call('/comments?targetType=idea&targetId='+lostId)).data.items.filter(x=>x.body===lostBody.comment).length===1,'Lost responses never duplicate next steps.');
 console.log('PASS '+count+' president wave 02 checks; no MongoDB connection.');
}finally{
 if(cookie){await fetch(base+'/auth/logout',{method:'POST',headers:{Cookie:cookie,Origin:'http://127.0.0.1:4002'}});console.log('Test president session logged out.');}
}
