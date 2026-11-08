import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRequest,canReviewIdea} from '../src/features/manager/ideaReview.js';
import {managerNotificationIcon,managerNotificationDestination,managerNotificationTabs} from '../src/features/manager/notifications.js';
test('Idea review requires an explicit action and note for revision, preserves version and uses existing statuses',()=>{
 const idea={status:'in_review',updatedAt:'2026-11-08T12:00:00.000Z'};
 assert.equal(canReviewIdea(idea),true);assert.equal(canReviewIdea({status:'forwarded'}),false);
 assert.throws(()=>reviewRequest(idea,'request_revision',' '));assert.throws(()=>reviewRequest(idea,'approved','ok'));
 assert.deepEqual(reviewRequest(idea,'request_revision',' Dopunite rok. '),{method:'POST',body:{action:'request_revision',note:'Dopunite rok.'},headers:{'If-Match':'"2026-11-08T12:00:00.000Z"'}});
 assert.equal(reviewRequest(idea,'forward','').body.action,'forward');assert.throws(()=>reviewRequest({status:'revision_requested'},'forward',''));
});
test('Manager notification icons use actual actors and supported links reject external and unsafe destinations',()=>{
 assert.equal(managerNotificationIcon({type:'comment',actor:{role:'president'}}),'crown');
 assert.equal(managerNotificationIcon({type:'activity_overdue'}),'warning');
 assert.equal(managerNotificationIcon({type:'new_idea',link:'/ideas/'+'a'.repeat(24)}),'bulb');
 assert.equal(managerNotificationDestination('/sectors/'+'b'.repeat(24)),'/sectors/'+'b'.repeat(24));
 for(const link of ['https://example.test','//example.test','javascript:alert(1)','/admin','/ideas/../../admin'])assert.equal(managerNotificationDestination(link),null);
 assert.deepEqual(managerNotificationTabs.map(([key])=>key),['all','president','employees','projects','ideas']);
});
