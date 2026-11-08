import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Set ZEPTER_UI_FIXTURE=1.');
const base='http://127.0.0.1:4002/api';
const session=await(await fetch(base+'/auth/refresh',{method:'POST'})).json();assert.equal(session.accessToken,'isolated-ui-fixture');assert.equal(session.user.role,'manager');
async function call(path,{method='GET',body,headers={},status=200}={}){const response=await fetch(base+path,{method,headers:{Authorization:'Bearer isolated-ui-fixture',...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});const data=await response.json();assert.equal(response.status,status,`${method} ${path}: ${JSON.stringify(data)}`);return data;}
const first='b0'.repeat(12),second='b1'.repeat(12),foreign='ac'.repeat(12);
const idea=(await call('/ideas/'+first)).idea;assert.ok(idea.author.firstName);assert.ok(idea.updatedAt);
const files=await call('/attachments/target/idea/'+first);assert.equal(files.items.length,1);
const download=await fetch(base+'/attachments/'+files.items[0]._id);assert.equal(download.status,200);assert.equal(download.headers.get('cache-control'),'no-store');
const comment=await call('/comments',{method:'POST',status:201,body:{targetType:'idea',targetId:first,body:'Izolovani odgovor rukovodioca.',kind:'comment',parentId:'a9'.repeat(12)}});assert.equal(comment.comment.parent,'a9'.repeat(12));
await call('/ideas/'+foreign,{status:403});await call('/ideas/'+foreign+'/review',{method:'POST',body:{action:'forward'},status:403});
await call('/ideas/'+first+'/review',{method:'POST',body:{action:'request_revision',note:''},status:422});
await call('/ideas/'+first+'/review',{method:'POST',body:{action:'forward'},headers:{'If-Match':'"stale"'},status:409});
const revision=await call('/ideas/'+first+'/review',{method:'POST',body:{action:'request_revision',note:'Dopunite budžet i rok.'},headers:{'If-Match':'"'+idea.updatedAt+'"'}});assert.equal(revision.idea.status,'revision_requested');
await call('/ideas/'+first+'/review',{method:'POST',body:{action:'forward'},status:409});
const next=(await call('/ideas/'+second)).idea;const forwarded=await call('/ideas/'+second+'/review',{method:'POST',body:{action:'forward',note:'Za predsednika.'},headers:{'If-Match':'"'+next.updatedAt+'"'}});assert.equal(forwarded.idea.status,'forwarded');
await call('/ideas/'+second+'/review',{method:'POST',body:{action:'forward'},status:409});
console.log('OK private idea/attachment, contextual reply, revision note, version conflict, revision and single forward');
const own=await call('/ideas',{method:'POST',status:201,body:{title:'Sopstveni predlog rukovodioca',description:'Izolovana provera postojeće autorske dopune.'}});
const ownRevision=await call('/ideas/'+own.idea._id+'/review',{method:'POST',body:{action:'request_revision',note:'Dopuniti plan.'}});
const ownSaved=await call('/ideas/'+own.idea._id,{method:'PATCH',body:{description:'Dopunjen plan sopstvene ideje rukovodioca.'},headers:{'If-Match':'"'+ownRevision.idea.updatedAt+'"'}});
assert.equal((await call('/ideas/'+own.idea._id+'/resubmit',{method:'POST',headers:{'If-Match':'"'+ownSaved.idea.updatedAt+'"'}})).idea.status,'submitted');
console.log('OK manager can still create, revise and resubmit an own idea');
for(const category of ['all','president','employees','projects','ideas']){
 const feed=await call('/notifications?view=manager&grouped=true&limit=3&category='+category+'&user=other');assert.ok(feed.items.every(row=>row.user===session.user._id));
 if(category==='president')assert.ok(feed.items.every(row=>row.actor?.role==='president'));
 if(category==='employees')assert.ok(feed.items.every(row=>row.actor?.role==='employee'&&row.type==='comment'));
 if(category==='ideas')assert.ok(feed.items.every(row=>row.link.startsWith('/ideas/')));
}
const feed=await call('/notifications?view=manager&grouped=true&limit=3');const page2=await call('/notifications?view=manager&grouped=true&limit=3&page=2');assert.equal(new Set([...feed.items,...page2.items].map(x=>x._id)).size,feed.items.length+page2.items.length);
await call('/notifications/'+feed.items[0]._id+'/read',{method:'PATCH'});await call('/notifications/'+'e0'.repeat(12)+'/read',{method:'PATCH',status:404});
await call('/notifications/read-all',{method:'POST'});assert.equal((await call('/notifications?view=manager&grouped=true')).unread,0);
console.log('OK manager notification categories, recipient boundaries, grouped pagination, own read and read-all');
console.log('All wave05 checks passed; no MongoDB connection.');
