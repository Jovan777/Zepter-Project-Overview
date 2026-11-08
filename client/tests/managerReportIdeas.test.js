import test from 'node:test';
import assert from 'node:assert/strict';
import {reportDirty,reportDraft,reportHeaders,reportSaveBody} from '../src/features/manager/reportEditor.js';
import {sectorIdeaFilters} from '../src/features/manager/ideaPresentation.js';

test('Report drafts preserve saved text and send explicit optimistic create/update conditions',()=>{
 const report={updatedAt:'2026-11-08T12:00:00.000Z',results:'Sačuvani tekst',problems:'Prepreka',nextSteps:'Dalje'};
 const baseline=reportDraft(report),draft={...baseline,results:' Nova dopuna '};
 assert.equal(reportDirty(baseline,baseline),false);assert.equal(reportDirty(draft,baseline),true);
 assert.deepEqual(reportHeaders(null),{'If-None-Match':'*'});
 assert.deepEqual(reportHeaders(report),{'If-Match':'"2026-11-08T12:00:00.000Z"'});
 assert.deepEqual(reportSaveBody({sectorId:'own',type:'weekly',day:'2026-11-08',draft}),{sectorId:'own',type:'weekly',day:'2026-11-08',results:'Nova dopuna',problems:'Prepreka',nextSteps:'Dalje'});
 assert.deepEqual(reportDraft(null),{results:'',problems:'',nextSteps:''});
});
test('Idea filters preserve manager dashboard links and clamp invalid pagination',()=>{
 for(const status of ['submitted','in_review'])assert.equal(sectorIdeaFilters(new URLSearchParams({status})).tab,'review');
 assert.deepEqual(sectorIdeaFilters(new URLSearchParams('tab=revision&page=2.9')),{tab:'revision',page:2});
 assert.deepEqual(sectorIdeaFilters(new URLSearchParams('tab=__proto__&page=-8')),{tab:'all',page:1});
 assert.equal(sectorIdeaFilters(new URLSearchParams('page=Infinity')).page,10000);
});
