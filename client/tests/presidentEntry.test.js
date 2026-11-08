import test from 'node:test';
import assert from 'node:assert/strict';
import {capturePresidentEntry,isPresidentEntryPath} from '../src/features/president/presidentEntry.js';
import {workspaceLinks} from '../src/features/workspace/navigation.js';

test('The presidential entry captures the fragment once and removes it before routing without persistent storage',()=>{
 const calls=[],history={state:{index:1},replaceState(...args){calls.push(args);}};
 const key='a'.repeat(32),entry=capturePresidentEntry({pathname:'/predsednik',search:'',hash:'#'+key},history);
 assert.equal(entry.invalid,false);assert.equal(entry.takeKey(),key);assert.equal(entry.takeKey(),null);
 assert.deepEqual(calls,[[history.state,'','/predsednik']]);
});
test('Invalid credentials are stripped and never accepted; unrelated fragments are untouched',()=>{
 let calls=0;const history={replaceState(){calls++;}};
 const bad=capturePresidentEntry({pathname:'/predsednik',search:'',hash:'#short'},history);
 assert.equal(bad.invalid,true);assert.equal(bad.takeKey(),null);assert.equal(calls,1);
 assert.equal(capturePresidentEntry({pathname:'/projects',hash:'#comments'},history),null);assert.equal(calls,1);
 assert.equal(isPresidentEntryPath('/predsednik/guess'),false);
 assert.deepEqual(workspaceLinks.president.map(([path])=>path),['/','/sectors','/ideas','/my-comments']);
});
