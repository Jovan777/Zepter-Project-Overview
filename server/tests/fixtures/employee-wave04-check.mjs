// Deliberately writes ONLY to the gated in-memory fixture on loopback:4002.
import assert from 'node:assert/strict';
if(process.env.ZEPTER_UI_FIXTURE!=='1')throw Error('Set ZEPTER_UI_FIXTURE=1; start a fresh employee-ui-server fixture first.');
const base='http://127.0.0.1:4002';
const call=async(path,options={})=>{
 const response=await fetch(base+'/api'+path,{...options,headers:{'Content-Type':'application/json',...options.headers},body:options.body===undefined?undefined:JSON.stringify(options.body),signal:AbortSignal.timeout(8000)});
 return {status:response.status,data:await response.json()};
};
const auth=await call('/auth/refresh',{method:'POST'});
assert.equal(auth.data.accessToken,'isolated-ui-fixture','Never run this against a real server');
const id='b2'.repeat(12), version=idea=>({'If-Match':`"${idea.updatedAt}"`});
const source=await call('/ideas/'+id); assert.equal(source.status,200); assert.equal(source.data.idea.status,'revision_requested');
const before=source.data.idea;
const saved=await call('/ideas/'+id,{method:'PATCH',headers:version(before),body:{title:before.title,description:before.description+' Dopunjen plan i budžet.',benefit:before.benefit}});
assert.equal(saved.status,200); assert.equal(saved.data.idea.status,'revision_requested');
assert.equal((await call('/ideas/'+id,{method:'PATCH',headers:version(before),body:{description:'Stale overwrite'}})).status,409);
const parentId='dddddddddddddddddddddddd';
assert.equal((await call('/comments',{method:'POST',body:{targetType:'idea',targetId:id,parentId,kind:'comment',body:'Dopunjen je plan i procena troškova.'}})).status,201);
const discussion=await call('/comments?targetType=idea&targetId='+id);
assert.equal(discussion.data.total,2); assert.equal(discussion.data.items.find(item=>item._id===parentId).responseStatus,'answered');
assert.equal((await call('/ideas/'+id+'/resubmit',{method:'POST',headers:version(saved.data.idea)})).status,200);
assert.equal((await call('/ideas/'+id+'/resubmit',{method:'POST',headers:version(saved.data.idea)})).status,409);
const submitted=(await call('/ideas/'+id)).data.idea;
assert.equal(submitted.status,'submitted');assert.equal(submitted.revisionCount,1);assert.equal(submitted.reviewNote,'');
console.log('OK revision, optimistic conflict, reply, single resubmission and status');
for(const [category,total] of [['all',5],['tasks',2],['projects',1],['ideas',2],['guidance',1]]){
 const response=await call('/notifications?grouped=true&category='+category);
 assert.equal(response.status,200);assert.equal(response.data.total,total,category);assert.equal(response.data.unread,3);
}
const boundary=await call('/notifications?grouped=true&limit=2&page=2');
assert.equal(boundary.data.items.length,2);assert.equal(boundary.data.items[0].readAt,null);assert.ok(boundary.data.items[1].readAt);
assert.equal((await call('/notifications/'+'e0'.repeat(12)+'/read',{method:'PATCH'})).status,200);
assert.equal((await call('/notifications?grouped=true')).data.unread,2);
assert.equal((await call('/notifications/read-all',{method:'POST'})).data.updated,2);
assert.equal((await call('/notifications?grouped=true')).data.unread,0);
console.log('OK notification categories, pagination boundary, single/read-all and counts');
for(const path of ['/ideas/'+id,'/notifications'])assert.equal((await fetch(base+path)).status,200);
console.log('OK frontend SPA routes served; visual browser QA is a separate check');
