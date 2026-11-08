import test from 'node:test';
import assert from 'node:assert/strict';
import {projectTeam,projectActivities,presidentDate,recoverDecisionDraft,ideaExcerpt} from '../src/features/president/presentation.js';
test('President team includes the real owner once and preserves all members',()=>{
 const owner={_id:'1',firstName:'Test'},member={_id:'2'};
 assert.deepEqual(projectTeam({owner,members:[owner,member]}),[owner,member]);
 assert.deepEqual(projectTeam({members:[]}),[]);
});
test('Activity filters preserve the source order and never hide blocked or review work from unfinished tasks',()=>{
 const items=['completed','blocked','review','planned','in_progress'].map(status=>({status}));
 assert.deepEqual(projectActivities(items,'open').map(a=>a.status),['blocked','review','planned','in_progress']);
 assert.deepEqual(projectActivities(items,'completed'),[items[0]]);assert.equal(items.length,5);
});
test('President deadlines use Belgrade calendar dates and show missing or invalid values honestly',()=>{
 assert.match(presidentDate('2026-11-08T23:30:00Z'),/9\./);
 assert.equal(presidentDate(null),'Nije postavljen');assert.equal(presidentDate('invalid'),'Nije postavljen');
});
test('A different decision from another device preserves the unsent local instructions',()=>{
 assert.equal(recoverDecisionDraft('Moj plan',{status:'approved',decision:{note:'Plan sa drugog uređaja'}}),'Moj plan');
 assert.equal(recoverDecisionDraft('Moj plan',{status:'rejected',decision:{note:''}}),'Moj plan');
});
test('A confirmed identical decision clears only the already saved draft',()=>{
 assert.equal(recoverDecisionDraft('  Moj plan  ',{status:'approved',decision:{note:'Moj plan'}}),'');
 assert.equal(recoverDecisionDraft('Moj plan',{status:'forwarded'}),'');
});
test('Idea excerpts use the existing description, normalize spacing and do not split Unicode characters',()=>{
 assert.equal(ideaExcerpt('  Kratak\n opis. '),'Kratak opis.');
 assert.equal(ideaExcerpt(''), '');
 assert.equal(ideaExcerpt('😀'.repeat(180)), '😀'.repeat(175)+'…');
 assert.equal(ideaExcerpt('Jedan veoma dug opis ideje',15),'Jedan veoma…');
});
