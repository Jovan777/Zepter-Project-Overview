import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePresidentEntry,isPresidentEntryPath,presidentBasename,presidentKeyFromPath,presidentScopedPath} from '../src/features/president/presidentEntry.js';
import {workspaceLinks} from '../src/features/workspace/navigation.js';

test('The presidential entry captures the fragment once and removes it before routing without persistent storage',()=>{
 const calls=[],history={state:{index:1},replaceState(...args){calls.push(args);}};
 const key='a'.repeat(32),entry=capturePresidentEntry({pathname:'/predsednik',search:'',hash:'#'+key},history);
 assert.equal(entry.invalid,false);assert.equal(entry.takeKey(),key);assert.equal(entry.takeKey(),null);
 assert.deepEqual(calls,[[history.state,'','/predsednik']]);
});

test('A personal URL remains in the address bar and supports a fresh opening on another device',()=>{
 const key='b'.repeat(32),pathname='/president-zp-'+key;
 const history={replaceState(){assert.fail('The permanent URL must not be stripped.');}};
 for(let device=0;device<2;device++){
  const entry=capturePresidentEntry({pathname,search:'',hash:''},history);
  assert.equal(entry.basename,pathname);assert.equal(entry.invalid,false);
  assert.equal(entry.takeKey(),key);assert.equal(entry.takeKey(),null);
 }
 assert.equal(presidentKeyFromPath(pathname),key);
});

test('Reloading a personal project/comment link preserves its nested route, query and anchor',()=>{
 const basename='/president-zp-'+'c'.repeat(32),pathname=basename+'/projects/123456789012345678901234';
 const entry=capturePresidentEntry({pathname,search:'?commentId=123456789012345678901234',hash:'#president-project-comments'},{replaceState(){assert.fail('Do not rewrite the deep link.');}});
 assert.equal(entry.basename,basename);assert.equal(entry.takeKey(),'c'.repeat(32));
 assert.equal(presidentBasename(pathname),basename);
 assert.equal(presidentScopedPath(pathname,'/ideas?tab=new'),basename+'/ideas?tab=new');
 assert.equal(presidentScopedPath(pathname,'/'),basename);
 assert.equal(presidentScopedPath(pathname,basename+'/projects'),basename+'/projects');
 assert.equal(presidentScopedPath('/projects','/ideas'),'/ideas');
 assert.equal(presidentScopedPath(pathname,'//foreign.example.test'),basename);
});

test('Guessed, malformed and encoded personal path segments never become credentials',()=>{
 for(const suffix of ['short','a'.repeat(31),'a'.repeat(33),'a'.repeat(31)+'%2f','a'.repeat(32)+'.json']){
  const pathname='/president-zp-'+suffix,entry=capturePresidentEntry({pathname,hash:'',search:''},{});
  assert.equal(entry.invalid,true);assert.equal(entry.takeKey(),null);assert.equal(entry.basename,null);
 }
 assert.equal(presidentKeyFromPath('/projects/president-zp-'+'a'.repeat(32)),null);
 assert.equal(presidentBasename('/president-zp-'+'a'.repeat(32)+'-guessed'),null);
});
test('Invalid credentials are stripped and never accepted; unrelated fragments are untouched',()=>{
 let calls=0;const history={replaceState(){calls++;}};
 const bad=capturePresidentEntry({pathname:'/predsednik',search:'',hash:'#short'},history);
 assert.equal(bad.invalid,true);assert.equal(bad.takeKey(),null);assert.equal(calls,1);
 assert.equal(capturePresidentEntry({pathname:'/projects',hash:'#comments'},history),null);assert.equal(calls,1);
 assert.equal(isPresidentEntryPath('/predsednik/guess'),false);
 assert.deepEqual(workspaceLinks.president.map(([path])=>path),['/','/sectors','/ideas','/my-comments']);
});
