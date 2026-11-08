// Manual browser QA controls. Requires the optional in-memory fixture QA mode.
import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Set ZEPTER_UI_FIXTURE=1.');
const origin='http://127.0.0.1:4002';
const session=await(await fetch(origin+'/api/auth/refresh',{method:'POST'})).json();
assert.equal(session.accessToken,'isolated-ui-fixture');assert.ok(['employee','manager'].includes(session.user.role));
const command=process.argv[2],commands={
 'ideas-empty':{ideasMode:'empty'},'ideas-normal':{ideasMode:'normal'},'ideas-error':{ideasFailOnce:true},
 'prepare-error':{prepareFailOnce:true},'prepare-delay':{prepareDelayOnce:true},
 'save-error':{saveFailOnce:true},'publish-error':{publishFailOnce:true},'save-lost':{saveResponseLostOnce:true},
 'review-error':{reviewFailOnce:true},'review-lost':{reviewResponseLostOnce:true},'notifications-error':{notificationFailOnce:true},'notifications-empty':{notificationsEmpty:true},'notifications-normal':{notificationsEmpty:false},'read-error':{readFailOnce:true},
 'comment-lost':{commentResponseLostOnce:true},'worklog-lost':{worklogResponseLostOnce:true},'attachment-lost':{attachmentResponseLostOnce:true}
};
async function api(path,body,headers={},method=body?'POST':'GET'){
 const response=await fetch(origin+'/api'+path,{method,headers:{Authorization:'Bearer isolated-ui-fixture',...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
 const result=await response.json();assert.equal(response.status,200);return result;
}
if(Object.hasOwn(commands,command)){await api('/__fixture/controls',commands[command]);console.log('Fixture control set: '+command);}
else if(['race','assert-draft','assert-published'].includes(command)){
 const {report}=await api('/reports/prepare?type=weekly&day=2026-11-22');assert.ok(report,'QA report must exist');
 if(command==='race'){
  assert.equal(report.status,'draft');await api('/reports/'+report._id,{results:'Izmena iz druge test sesije.'},{'If-Match':'"'+report.updatedAt+'"'},'PATCH');console.log('Fixture draft changed from another test session.');
 }else {
  assert.equal(report.status,command==='assert-draft'?'draft':'published');
  const list=await api('/reports?type=weekly&limit=50');assert.equal(list.items.filter(row=>row.periodStart==='2026-11-16').length,1);
  if(command==='assert-published'){
   assert.equal(report.results,'Izmena iz druge test sesije.');
   assert.equal(report.nextSteps,'Nastaviti sledećim ekranima posle potvrđenih provera.');
  }
  console.log('Fixture report verified: '+report.status+'; exactly one record for the period.');
 }
}else if(command==='status'){
 const data=await api('/ideas/sector');console.log('Fixture ideas: '+data.stats.total+'; review: '+data.stats.review);
}else throw Error('Unknown QA command.');
