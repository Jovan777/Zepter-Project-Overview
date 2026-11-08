import test from 'node:test';
import assert from 'node:assert/strict';
import {presidentAccessUrl,presidentUrlKey} from '../src/lib/president-link-url.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const key='t'.repeat(32),origin='https://app.example.test';
test('Formatting preserves the same key and origin in a stable president-zp path',()=>{
 const url=presidentAccessUrl(origin,key);
 assert.equal(url,origin+'/president-zp-'+key);
 assert.equal(presidentUrlKey(url,origin),key);
 assert.equal(presidentUrlKey(url+'/',origin),key);
 assert.equal(presidentAccessUrl(origin,presidentUrlKey(origin+'/predsednik#'+key,origin)),url);
 assert.equal(presidentUrlKey(origin+'/president#'+key,origin),key);
});
test('Foreign origins, embedded credentials and invalid or guessed URLs cannot be reformatted',()=>{
 for(const url of ['https://foreign.example.test/president-zp-'+key,origin+'/president-zp-short',origin+'/president-zp-'+key+'extra',origin+'/projects/'+key,'not-a-url','https://user:pass@app.example.test/president-zp-'+key])assert.throws(()=>presidentUrlKey(url,origin));
 assert.throws(()=>presidentAccessUrl(origin,'short'));assert.throws(()=>presidentAccessUrl('javascript:invalid',key));
});
test('The format command changes only the private URL file, is idempotent and does not connect to MongoDB',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'zepter-link-format-'));
 try{
  const privateFolder=path.join(folder,'private-access'),file=path.join(privateFolder,'predsednik-link.txt');
  await fs.mkdir(privateFolder);await fs.writeFile(file,origin+'/predsednik#'+key+'\n');
  for(let attempt=0;attempt<2;attempt++){
   const result=spawnSync(process.execPath,[fileURLToPath(new URL('../src/scripts/president-link.js',import.meta.url)),'format'],{cwd:folder,env:{...process.env,CLIENT_ORIGIN:origin,MONGODB_URI:'mongodb://127.0.0.1:1/unreachable',NODE_ENV:'test'},encoding:'utf8',timeout:10000});
   assert.equal(result.status,0,result.stderr);assert.ok(!result.stdout.includes(key));
   assert.equal(await fs.readFile(file,'utf8'),presidentAccessUrl(origin,key)+'\n');
   assert.deepEqual(await fs.readdir(privateFolder),['predsednik-link.txt']);
  }
 }finally{
  if(path.dirname(path.resolve(folder))!==path.resolve(os.tmpdir())||!path.basename(folder).startsWith('zepter-link-format-'))throw Error('Unexpected test path.');
  await fs.rm(folder,{recursive:true,force:true});
 }
});
