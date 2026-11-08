import test from 'node:test';
import assert from 'node:assert/strict';
import {presidentReportFilters,reportSearch,reportMatches,evidenceLink,attentionTime} from '../src/features/president/reportPresentation.js';
test('Report links retain scope, target, period and employee support without leaking a stale target into company scope',()=>{
 const filters=presidentReportFilters(new URLSearchParams('scope=project&id=chosen&type=weekly&day=2026-11-08'));
 assert.deepEqual(filters,{scope:'project',id:'chosen',type:'weekly',day:'2026-11-08'});assert.equal(reportSearch({...filters,scope:'company'}).has('id'),false);
 assert.equal(presidentReportFilters(new URLSearchParams('scope=employee&id=person')).scope,'employee');
});
test('A response from another scope, target, type or period is never shown beneath new report controls',()=>{
 const context={scope:'sector',targetId:'one',type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08'},filters={scope:'sector',id:'one',type:'weekly',day:'2026-11-08'};
 assert.equal(reportMatches({context},filters),true);
 for(const patch of [{scope:'company'},{id:'two'},{type:'daily'},{day:'2026-11-09'},{day:'2026-11-01'},{day:'2026-02-30'}])assert.equal(reportMatches({context},{...filters,...patch}),false);
});
test('Evidence opens the actual activity, otherwise its project, and old snapshots without IDs remain plain text',()=>{
 assert.equal(evidenceLink({activityId:'activity',projectId:'project'}),'/activities/activity');assert.equal(evidenceLink({projectId:'project'}),'/projects/project');assert.equal(evidenceLink({activity:'Old title'}),null);
 assert.equal(attentionTime('invalid'),null);assert.equal(attentionTime(null),null);assert.match(attentionTime('2026-11-08T23:30Z'),/9\./);
});
