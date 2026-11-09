// Explicit migration only. Original local files and attachment IDs are retained.
import 'dotenv/config';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {Attachment} from '../models/index.js';
import {databaseOptions} from '../lib/database-options.js';
import {persistAttachment,deleteStoredAttachment} from '../services/attachment-storage.js';
try{
 const args=process.argv.slice(2);if(args.some(arg=>arg!=='--apply'))throw Error('Koristite bez argumenata za pregled ili --apply za primenu.');
 await mongoose.connect(process.env.MONGODB_URI,{...databaseOptions(),autoIndex:false});
 const rows=await Attachment.find({storage:{$ne:'gridfs'}}).select('_id fileName size mime updatedAt').lean(),folder=path.resolve(process.env.UPLOAD_DIR||'./private-uploads');
 const verified=[];
 for(const row of rows){
  if(path.basename(row.fileName)!==row.fileName)throw Error('Neispravna putanja priloga. Migracija je zaustavljena.');
  const full=path.resolve(folder,row.fileName),data=await fs.readFile(full);
  if(data.length!==row.size)throw Error('Nedostajući ili promenjen lokalni fajl. Migracija je zaustavljena.');
  verified.push({row,full,hash:crypto.createHash('sha256').update(data).digest('hex')});
 }
 console.log('Provereno lokalnih priloga za prenos: '+verified.length);
 if(args.includes('--apply')&&verified.length){
  const backup=path.resolve(process.env.ATTACHMENT_MIGRATION_BACKUP_DIR||'backups/attachments');await fs.mkdir(backup,{recursive:true});
  const file=path.join(backup,'migration-'+crypto.randomUUID()+'.json');await fs.writeFile(file,JSON.stringify(rows,null,2),{flag:'wx',mode:0o600});
  process.env.ATTACHMENT_STORAGE='gridfs';
  for(const {row,full,hash}of verified){
   const newName=crypto.randomUUID()+path.extname(row.fileName),store=new mongoose.mongo.GridFSBucket(mongoose.connection.db,{bucketName:'privateAttachments'});
   await persistAttachment({filename:newName},full,row.mime);
   try{
    const grid=await store.find({filename:newName}).limit(1).next(),digest=crypto.createHash('sha256');
    for await(const chunk of store.openDownloadStream(grid._id))digest.update(chunk);
    if(digest.digest('hex')!==hash)throw Error('Provera integriteta fajla nije prošla.');
    const result=await Attachment.updateOne({_id:row._id,fileName:row.fileName,updatedAt:row.updatedAt},{$set:{storage:'gridfs',fileName:newName}},{timestamps:false});
    if(result.matchedCount!==1)throw Error('Prilog je u međuvremenu promenjen.');
   }catch(error){await deleteStoredAttachment({storage:'gridfs',fileName:newName});throw error;}
  }
  console.log('Prenos potvrđen. Originalni fajlovi i ID-jevi su sačuvani; privatna kopija metapodataka je u backups/attachments.');
 }else console.log('Pregled bez upisa. Za prenos koristite --apply.');
}catch{console.error('Prenos nije završen. Proverite lokalne fajlove, stanje baze i prethodne potvrđene prenose. Tajne i nazivi privatnih fajlova nisu ispisani.');process.exitCode=1;}finally{await mongoose.disconnect();}
