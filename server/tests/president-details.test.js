import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Idea,Project,Activity,Comment,Attachment,Audit} from '../src/models/index.js';
import {withRoutes,query} from './helpers/http.mjs';
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'zepter-president-files-'));
process.env.UPLOAD_DIR=folder;
const {default:routes}=await import('../src/routes/attachments.js');
const {default:comments}=await import('../src/routes/comments.js');
const png=await fs.readFile(new URL('../../client/public/icons/icon-192.png',import.meta.url));
const id=n=>String(n).repeat(24),president={_id:id(1),role:'president',approval:'approved'},author={_id:id(2),role:'employee',sector:id(3)};
const ideaId=id(4),commentId=id(5),activityId=id(6);
after(async()=>{if(path.dirname(folder)!==path.resolve(os.tmpdir())||!path.basename(folder).startsWith('zepter-president-files-'))throw Error('Unsafe cleanup');await fs.rm(folder,{recursive:true,force:true});});
function setup(t){
 const idea={_id:ideaId,author:author._id,sector:author.sector,status:'forwarded'};
 const comment={_id:commentId,targetType:'idea',targetId:ideaId,author:president._id};
 const records=[];let creates=0;
 t.mock.method(Idea,'findById',async()=>idea);t.mock.method(Comment,'findById',async()=>comment);
 t.mock.method(Project,'findById',async()=>({_id:id(7),sector:author.sector,members:[author._id],owner:id(8)}));
 t.mock.method(Activity,'findById',async()=>({_id:activityId,project:id(7),sector:author.sector,assignees:[author._id]}));
 t.mock.method(Audit,'create',async()=>({}));
 t.mock.method(Attachment,'findOne',async filter=>records.find(row=>row.owner===filter.owner&&row.uploadId===filter.uploadId)||null);
 t.mock.method(Attachment,'create',async fields=>{creates++;const row={_id:randomUUID().replaceAll('-','').slice(0,24),...fields};records.push(row);return row;});
 t.mock.method(Attachment,'findById',async value=>records.find(row=>row._id===value));
 return {idea,comment,records,creates:()=>creates};
}
async function upload(base,{type='idea',target=ideaId,comment=commentId,key=randomUUID()}={}){
 const body=new FormData();body.append('file',new Blob([png],{type:'image/png'}),'Plan.png');
 const params=new URLSearchParams({targetType:type,targetId:target,...(comment?{commentId:comment}:{}),...(key?{uploadId:key}:{})});
 return fetch(base+'/attachments?'+params,{method:'POST',body});
}
test('President files belong to the actual comment; retry does not create another file and the author can download privately',async t=>{
 const f=setup(t),key=randomUUID();let attachment;
 await withRoutes(president,[['/attachments',routes]],async base=>{
  const first=await upload(base,{key});assert.equal(first.status,201);attachment=(await first.json()).attachment;
  assert.equal(attachment.comment,commentId);assert.equal(attachment.owner,president._id);
  assert.equal((await upload(base,{key})).status,200);assert.equal(f.creates(),1);
  assert.equal(f.records.length,1);assert.deepEqual(await fs.readFile(path.join(folder,attachment.fileName)),png);
 });
 await withRoutes(author,[['/attachments',routes]],async base=>{const result=await fetch(base+'/attachments/'+attachment._id);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.deepEqual(Buffer.from(await result.arrayBuffer()),png);});
});
test('Wrong author, target, malformed ID and hidden idea cannot create a president attachment',async t=>{
 const f=setup(t),before=await fs.readdir(folder);
 await withRoutes(president,[['/attachments',routes]],async base=>{
  f.comment.author=author._id;assert.equal((await upload(base)).status,403);f.comment.author=president._id;
  f.comment.targetId=id(9);assert.equal((await upload(base)).status,403);f.comment.targetId=ideaId;
  f.comment.targetType='activity';assert.equal((await upload(base)).status,403);f.comment.targetType='idea';
  assert.equal((await upload(base,{comment:'bad'})).status,400);
  assert.equal((await upload(base,{key:'bad'})).status,422);
  assert.equal((await upload(base,{comment:null,key:null})).status,403);
  f.idea.status='submitted';assert.equal((await upload(base)).status,403);
 });assert.equal(f.creates(),0);assert.deepEqual(await fs.readdir(folder),before);
});
test('Employee cannot attach to another person’s activity comment or read another sector’s conversation files',async t=>{
 const f=setup(t);f.comment.targetType='activity';f.comment.targetId=activityId;
 await withRoutes(author,[['/attachments',routes]],async base=>{assert.equal((await upload(base,{type:'activity',target:activityId})).status,403);});
 const outsider={_id:id(9),role:'manager',sector:id(8)};
 await withRoutes(outsider,[['/attachments',routes]],async base=>{assert.equal((await fetch(base+'/attachments/target/idea/'+ideaId)).status,403);assert.equal((await upload(base)).status,403);});assert.equal(f.creates(),0);
});
test('An operation key cannot be reused for a different conversation',async t=>{
 const f=setup(t),key=randomUUID();f.records.push({_id:id(9),owner:president._id,uploadId:key,targetType:'activity',targetId:activityId,comment:commentId});
 await withRoutes(president,[['/attachments',routes]],async base=>{assert.equal((await upload(base,{key})).status,409);});assert.equal(f.creates(),0);
});
test('A later audit failure retains a saved file and a retry recovers it without uploading again',async t=>{
 const f=setup(t),key=randomUUID();t.mock.method(Audit,'create',async()=>{throw Object.assign(Error('Simulated audit outage'),{status:503});});
 await withRoutes(president,[['/attachments',routes]],async base=>{
  assert.equal((await upload(base,{key})).status,503);assert.equal(f.records.length,1);
  assert.deepEqual(await fs.readFile(path.join(folder,f.records[0].fileName)),png);
  assert.equal((await upload(base,{key})).status,200);assert.equal(f.creates(),1);
 });
});
test('Optional enriched comments return only files from that authorized target, attached to their own message',async t=>{
 setup(t);const row={_id:commentId,body:'Predlog',toObject(){return {_id:this._id,body:this.body};}};
 t.mock.method(Comment,'find',()=>query([row]));t.mock.method(Comment,'countDocuments',async()=>1);
 t.mock.method(Attachment,'find',filter=>{assert.equal(filter.targetType,'idea');assert.equal(filter.targetId,ideaId);assert.deepEqual(filter.comment.$in,[commentId]);return query([{_id:id(9),comment:commentId,originalName:'Plan.png',mime:'image/png',size:200}]);});
 await withRoutes(author,[['/comments',comments]],async base=>{
  const plain=await (await fetch(base+'/comments?targetType=idea&targetId='+ideaId)).json();assert.equal(plain.items[0].attachments,undefined);
  const enriched=await (await fetch(base+'/comments?targetType=idea&targetId='+ideaId+'&includeAttachments=1')).json();assert.equal(enriched.items[0].attachments[0].originalName,'Plan.png');
 });
});
test('A concurrent duplicate upload removes only its extra physical file and returns the saved winner',async t=>{
 const f=setup(t),key=randomUUID();
 const saved={_id:id(9),owner:president._id,uploadId:key,targetType:'idea',targetId:ideaId,comment:commentId,originalName:'Plan.png',fileName:'concurrent-existing.png',mime:'image/png',size:png.length};
 await fs.writeFile(path.join(folder,saved.fileName),png);const before=await fs.readdir(folder);
 t.mock.method(Attachment,'create',async()=>{f.records.push(saved);throw Object.assign(Error('Concurrent winner'),{code:11000});});
 await withRoutes(president,[['/attachments',routes]],async base=>{const result=await upload(base,{key});assert.equal(result.status,200);assert.equal((await result.json()).attachment._id,saved._id);});
 assert.deepEqual(await fs.readdir(folder),before);assert.deepEqual(await fs.readFile(path.join(folder,saved.fileName)),png);
});
