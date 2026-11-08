import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Use the explicit WAVE02/WAVE05 president QA fixture.');
const base='http://127.0.0.1:4002/api',activity='55'.repeat(12),other='22'.repeat(12),cookies=[];
let checks=0,token;
const check=(value,label)=>{assert.ok(value,label);checks++;};
async function call(path,{role,body,method=body?'POST':'GET',headers={}}={}){
 const response=await fetch(base+path,{method,headers:{Origin:'http://127.0.0.1:4002',...(role?{Authorization:'Bearer isolated-ui-fixture','X-Zepter-Fixture-Role':role}:token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{data={error:raw};}return {status:response.status,data,response};
}
try{
 const auth=await call('/auth/president-link',{body:{key:'p'.repeat(32)}});const cookie=auth.response.headers.get('set-cookie')?.split(';')[0];if(cookie)cookies.push(cookie);token=auth.data.accessToken;check(auth.status===200,'Real president session from personal fixture link.');
 const first=await call('/comments/mine/president'),data=first.data;check(first.status===200,'President history responds.');check(first.response.headers.get('cache-control')==='no-store','History is private and uncached.');
 check(data.total>24&&data.items.length===8,'All history is paginated.');
 const items=[...data.items];for(let page=2;page<=Math.ceil(data.total/data.limit);page++){const result=await call('/comments/mine/president?page='+page);check(JSON.stringify(result.data.stats)===JSON.stringify(data.stats),'Counters stay global across pages.');items.push(...result.data.items);}
 check(items.length===data.total&&new Set(items.map(row=>row._id)).size===data.total,'No skipped or repeated records.');
 check(data.stats.total===data.stats.open+data.stats.answered+data.stats.resolved+data.stats.unavailable,'Every item has one explicit state.');
 check(!JSON.stringify(items).includes('PRIVATE_UNFORWARDED_HISTORY')&&!JSON.stringify(items).includes('FOREIGN_AUTHOR_HISTORY'),'No private idea or other-author history.');
 check(!JSON.stringify(items).includes('passwordHash')&&!JSON.stringify(items).includes('email'),'No account secrets in reply previews.');
 const spoof=await call('/comments/mine/president?author='+other+'&userId='+other);check(spoof.data.total===data.total,'Caller cannot select another author.');
 for(const role of ['employee','manager','admin'])check((await call('/comments/mine/president',{role})).status===403,'Role denied: '+role);
 for(const query of ['status=garbage','targetType=constructor','targetType=idea&targetType=project'])check((await call('/comments/mine/president?'+query)).status===422,'Invalid filters rejected.');
 for(const status of ['open','answered','resolved','unavailable']){const result=await call('/comments/mine/president?status='+status);check(result.data.total===data.stats[status]&&result.data.items.every(row=>row.status===status),'Correct status '+status);}
 for(const type of ['sector','project','activity','idea','assignment','request']){const result=await call('/comments/mine/president?targetType='+type);check(result.data.total===data.stats.byType[type]&&result.data.items.every(row=>row.targetType===type),'Correct target type '+type);}
 const firstActivity=items.find(row=>row._id==='a5'+'0'.repeat(22));check(firstActivity.status==='answered'&&firstActivity.reply.body.startsWith('Poslednji odgovor zaposlenog'),'Latest other-person reply overrides legacy open and ignores president’s self-followup.');
 check(firstActivity.target.projectTitle==='Test projekat — web sajt','Activity carries its real project context.');
 for(const row of items.filter(row=>row.link))check((await call(row.link.split('#')[0])).status===200,'Actual destination for '+row.targetType);
 const focus=await call('/comments?'+new URLSearchParams({targetType:'activity',targetId:activity,focus:firstActivity._id,includeAttachments:'1',limit:20}));
 check(focus.data.page>=3&&focus.data.items.some(row=>row._id===firstActivity._id),'History link opens the exact comment outside first conversation page.');
 check(items.find(row=>row._id==='a9'.repeat(12)).status==='unavailable'&&items.find(row=>row._id==='a9'.repeat(12)).link===null,'Missing project remains readable history without a broken action.');
 const selected=items.find(row=>row._id==='a5'+'9'.padStart(22,'0'));check(selected.status==='open'&&selected.kind==='instruction','Candidate instruction is initially waiting.');
 const reply=await call('/comments',{role:'manager',body:{targetType:selected.targetType,targetId:selected.link.split('/')[2].split('?')[0],parentId:selected._id,body:'Novi rukovodiočev odgovor u istoriji.',kind:'comment'}});check(reply.status===201,'Manager replies inside actual target conversation.');
 const answered=(await call('/comments/mine/president?status=answered&targetType=project')).data;
 check(answered.items.some(row=>row._id===selected._id&&row.reply.body==='Novi rukovodiočev odgovor u istoriji.'),'New reply is visible with exact author and text.');
 check(answered.stats.open===data.stats.open-1&&answered.stats.answered===data.stats.answered+1,'Counters follow the new reply.');
 check((await call('/comments/'+selected._id+'/resolve',{method:'PATCH'})).status===200,'President resolves the same instruction.');
 const resolved=(await call('/comments/mine/president?status=resolved')).data;
 check(resolved.items.some(row=>row._id===selected._id&&row.reply.body==='Novi rukovodiočev odgovor u istoriji.'),'Resolved instruction retains its genuine answer.');
 check(resolved.stats.resolved===data.stats.resolved+1&&resolved.stats.answered===data.stats.answered,'Resolved count stays distinct from answered.');
 const legacy=await call('/comments/mine/instructions?status=resolved');check(legacy.status===200&&legacy.data.items.some(row=>row._id===selected._id),'Legacy endpoint remains compatible.');
 await call('/__fixture/controls',{role:'president',body:{presidentCommentsFailOnce:true}});check((await call('/comments/mine/president')).status===503,'Temporary failure is surfaced.');check((await call('/comments/mine/president')).status===200,'Retry recovers.');
 await call('/__fixture/controls',{role:'president',body:{presidentCommentsEmpty:true}});check((await call('/comments/mine/president')).data.total===0,'Empty history response.');await call('/__fixture/controls',{role:'president',body:{presidentCommentsEmpty:false}});
 console.log('PASS '+checks+' president history/auth/reply checks; isolated fixture only.');
}finally{for(const cookie of cookies){const result=await call('/auth/logout',{method:'POST',headers:{Cookie:cookie}});if(result.status!==200)throw Error('Fixture session logout failed.');}console.log('Fixture test sessions logged out.');}
