import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseOptions} from '../src/lib/database-options.js';
import {attachmentStorage} from '../src/services/attachment-storage.js';
test('Production pools are bounded and index creation is kept out of cold startup',()=>{
 const production=databaseOptions({NODE_ENV:'production'});assert.equal(production.maxPoolSize,10);assert.equal(production.minPoolSize,0);assert.equal(production.autoIndex,false);assert.equal(production.serverSelectionTimeoutMS,10000);
 assert.equal(databaseOptions({NODE_ENV:'development'}).autoIndex,true);assert.throws(()=>databaseOptions({MONGO_POOL_SIZE:'1000'}));
});
test('Render cannot silently use ephemeral local files while local development remains compatible',()=>{
 assert.equal(attachmentStorage({}),'local');assert.equal(attachmentStorage({RENDER:'true',ATTACHMENT_STORAGE:'gridfs'}),'gridfs');assert.throws(()=>attachmentStorage({RENDER:'true'}),/gridfs/);assert.throws(()=>attachmentStorage({ATTACHMENT_STORAGE:'public'}));
});
