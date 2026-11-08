import test from 'node:test';
import assert from 'node:assert/strict';
import {managerActivityDraft,managerActivityPatch,changeManagerActivity} from '../src/features/manager/activityManagement.js';
import {reportFilters,reportPeriod,reportSummary,validReportDay} from '../src/features/manager/reportPresentation.js';

const initial={title:'Dizajn',description:'Opis',priority:'high',status:'in_progress',progress:70,assignees:[{_id:'b'},{_id:'a'}],dueDate:'2026-11-30T12:00:00Z',actualWork:'Prvi predlog',nextStep:'Pregled',blockers:''};
test('Manager activity patches only changed fields, preserves work and removes dates explicitly',()=>{
 const baseline=managerActivityDraft(initial);
 assert.deepEqual(managerActivityPatch({...baseline,assigneeIds:['b','a','a']},baseline),{});
 assert.deepEqual(managerActivityPatch({...baseline,title:' Novo ',assigneeIds:['b'],dueDate:''},baseline),{title:'Novo',dueDate:null,assigneeIds:['b']});
 const patch=managerActivityPatch({...baseline,priority:'urgent'},baseline);
 assert.deepEqual(patch,{priority:'urgent'});assert.equal('actualWork'in patch,false);assert.equal('sector'in patch,false);
});
test('Manager status and progress controls preserve backend completion/review rules',()=>{
 const baseline=managerActivityDraft(initial);
 const done=changeManagerActivity(baseline,'status','completed');assert.equal(done.progress,100);
 assert.equal(changeManagerActivity(done,'progress',80).status,'in_progress');
 assert.equal(changeManagerActivity(baseline,'progress',100).status,'review');
 assert.equal(changeManagerActivity(baseline,'progress',-20).progress,0);
 assert.equal(changeManagerActivity(baseline,'title','Novi naziv').actualWork,'Prvi predlog');
});
test('Report filter state sanitizes type/page/day and retains valid Belgrade dates',()=>{
 assert.equal(validReportDay('2026-02-30'),false);assert.equal(validReportDay('2028-02-29'),true);
 const state=reportFilters(new URLSearchParams('type=weekly&page=2.8&day=2026-11-08'));
 assert.deepEqual(state,{type:'weekly',page:2,day:'2026-11-08'});
 assert.equal(reportFilters(new URLSearchParams('type=unexpected&page=-7')).type,'daily');
 assert.equal(reportFilters(new URLSearchParams('page=-7')).page,1);
 assert.equal(reportFilters(new URLSearchParams('page=Infinity')).page,10000);
 assert.equal(validReportDay(reportFilters(new URLSearchParams('day=not-a-date')).day),true);
});
test('Report cards show actual summaries and complete weekly periods without inventing results',()=>{
 assert.equal(reportSummary({results:'  Urađen\n pregled.  '}),'Urađen pregled.');
 assert.equal(reportSummary({generated:{stats:{workEntries:0,avgProgress:0}}}),'0 dnevnih unosa · napredak sektora 0%');
 assert.match(reportSummary({status:'draft'}),/Nacrt/);
 assert.match(reportPeriod({type:'weekly',periodStart:'2026-12-28',periodEnd:'2027-01-03'}),/2026.*2027/);
 assert.equal(reportPeriod({type:'daily',periodStart:'invalid'}),'Datum nije dostupan');
});
