import mongoose from 'mongoose';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {fail} from '../lib/errors.js';

export function attachmentStorage(env=process.env){
 const storage=env.ATTACHMENT_STORAGE||'local';
 if(!['local','gridfs'].includes(storage))throw Error('ATTACHMENT_STORAGE mora biti local ili gridfs.');
 if(env.RENDER==='true'&&storage!=='gridfs')throw Error('Render zahteva ATTACHMENT_STORAGE=gridfs radi očuvanja privatnih priloga.');
 return storage;
}
function bucket(){if(!mongoose.connection.db)throw Error('Skladište priloga trenutno nije dostupno.');return new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'privateAttachments'});}
export async function persistAttachment(file,full,mime){
 if(attachmentStorage()!=='gridfs')return 'local';
 const store=bucket(),stream=store.openUploadStream(file.filename,{metadata:{mime}});
 try{await pipeline(createReadStream(full),stream);}catch(error){await stream.abort().catch(()=>{});throw error;}
 return 'gridfs';
}
export async function deleteStoredAttachment(attachment){
 if(attachment.storage!=='gridfs')return;
 const store=bucket(),file=await store.find({filename:attachment.fileName}).limit(1).next();if(file)await store.delete(file._id);
}
export async function downloadStoredAttachment(attachment,res){
 const store=bucket(),file=await store.find({filename:attachment.fileName}).limit(1).next();
 if(!file)fail(404,'Fajl priloga nije pronađen.');
 res.type(attachment.mime).attachment(attachment.originalName).set('Content-Length',String(file.length));
 await pipeline(store.openDownloadStream(file._id),res);
}
