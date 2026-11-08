import test from 'node:test';
import assert from 'node:assert/strict';
import {sectorCode} from '../src/features/admin/sectorPresentation.js';
test('Sector codes support Serbian names and R&D while remaining valid for the existing API',()=>{
 assert.equal(sectorCode('Pravna služba'),'LEGAL');assert.equal(sectorCode('R&D'),'RND');assert.equal(sectorCode('Call Centar'),'CALL');assert.equal(sectorCode('Nabavka i podrška'),'NABAVKA_I_PODRSKA');
 for(const name of ['Logistika','IT','HR','Sektor razvoja i unapređenja poslovanja'])assert.match(sectorCode(name),/^[A-Z0-9_-]{2,20}$/);
});
