import test from 'node:test';
import assert from 'node:assert/strict';
import {managerProjectStatus} from '../src/features/manager/presentation.js';
test('Manager cards use sector review work and retain risk/paused/terminal project statuses',()=>{
  assert.equal(managerProjectStatus({status:'active',hasReview:true,onTrack:true}).label,'Na proveri');
  assert.equal(managerProjectStatus({status:'active',hasReview:false,onTrack:true}).label,'Po planu');
  assert.equal(managerProjectStatus({status:'active',hasReview:false,onTrack:false}).label,'U toku');
  for(const [status,label] of [['at_risk','Rok ugrožen'],['on_hold','Pauzirano'],['completed','Završeno'],['planned','Planirano'],['cancelled','Otkazano']])assert.equal(managerProjectStatus({status,hasReview:true,onTrack:true}).label,label);
});
