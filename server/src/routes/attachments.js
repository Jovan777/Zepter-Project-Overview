import {Router} from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import {fileTypeFromFile} from 'file-type';
import {Attachment,Comment} from '../models/index.js';
import {z} from 'zod';
import {targetAccess,managing} from '../lib/access.js';
import {requireId,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,userDataChanged} from '../services/events.js';
import {persistAttachment,deleteStoredAttachment,downloadStoredAttachment} from '../services/attachment-storage.js';
const r=Router(),storageDir=path.resolve(process.env.UPLOAD_DIR||'./private-uploads');
const fileMap={
 '.pdf':['application/pdf'],'.png':['image/png'],'.jpg':['image/jpeg'],'.jpeg':['image/jpeg'],'.webp':['image/webp'],
 '.docx':['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
 '.xlsx':['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
 '.pptx':['application/vnd.openxmlformats-officedocument.presentationml.presentation']
};
const maxSize=Math.floor(Number(process.env.MAX_UPLOAD_MB||12)*1024*1024);
r.get('/config',(_req,res)=>res.json({maxBytes:maxSize,extensions:Object.keys(fileMap)}));
const upload=multer({storage:multer.diskStorage({destination:(_req,_file,cb)=>cb(null,storageDir),filename:(_req,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase())}),limits:{fileSize:maxSize,files:1},fileFilter:(_req,file,cb)=>{
 const ext=path.extname(file.originalname).toLowerCase();
 if(!fileMap[ext])return cb(Object.assign(new Error('Nepodržan format priloga.'),{status:422}));cb(null,true);
}});
const uploadOne=(req,res)=>new Promise((resolve,reject)=>upload.single('file')(req,res,error=>error?reject(error):resolve()));
r.post('/',async(req,res)=>{
 const type=String(req.query.targetType||''),id=String(req.query.targetId||'');
 if(!['project','activity','idea'].includes(type))fail(422,'Nepodržana vrsta priloga.');
 const resource=await targetAccess(req.user,type,id);
 const commentId=req.query.commentId,uploadId=req.query.uploadId;
 if(commentId!==undefined){
  requireId(commentId);const comment=await Comment.findById(commentId);
  if(!comment||comment.targetType!==type||!same(comment.targetId,id)||!same(comment.author,req.user._id))fail(403,'Prilog možete dodati samo uz svoj komentar u istom razgovoru.');
 }
 if(uploadId!==undefined&&(!commentId||!z.uuid().safeParse(uploadId).success))fail(422,'Neispravan identifikator slanja priloga.');
 if(type==='project'&&req.user.role==='employee'&&!resource.members.some(x=>same(x,req.user._id)))fail(403,'Samo član projekta može dodati prilog.');
 if(type==='activity'&&!managing(req.user,resource.sector)&&!resource.assignees.some(x=>same(x,req.user._id)))fail(403,'Samo zadužena osoba dodaje priloge.');
 if(type==='idea'&&!same(resource.author,req.user._id)&&!(req.user.role==='president'&&commentId))fail(403,'Samo autor ideje ili predsednik uz svoj komentar dodaje priloge.');
 const existing=async()=>{
  const a=await Attachment.findOne({owner:req.user._id,uploadId});
  if(a&&(!same(a.targetId,id)||a.targetType!==type||!same(a.comment,commentId)))fail(409,'Identifikator već pripada drugom prilogu.');
  return a;
 };
 if(uploadId){const a=await existing();if(a)return res.json({attachment:a});}
 await fs.mkdir(storageDir,{recursive:true});
 await uploadOne(req,res);if(!req.file)fail(422,'Pošaljite fajl u polju file.');
 const full=path.join(storageDir,path.basename(req.file.filename));
 let attachment,storage;
 try{
  const ext=path.extname(req.file.originalname).toLowerCase(), detected=await fileTypeFromFile(full);
  if(!detected||!fileMap[ext].includes(detected.mime))fail(422,'Sadržaj fajla ne odgovara dozvoljenom formatu.');
  storage=await persistAttachment(req.file,full,detected.mime);
  attachment=await Attachment.create({targetType:type,targetId:id,owner:req.user._id,...(commentId?{comment:commentId}:{}),...(uploadId?{uploadId}:{}),
   originalName:path.basename(req.file.originalname).slice(0,255),fileName:req.file.filename,mime:detected.mime,size:req.file.size,storage});
 }catch(e){await fs.unlink(full).catch(()=>{});if(storage==='gridfs')await deleteStoredAttachment({storage,fileName:req.file.filename});if(uploadId&&e.code===11000){const a=await existing();if(a)return res.json({attachment:a});}throw e;}
 if(storage==='gridfs')await fs.unlink(full).catch(()=>{});
 // Once metadata exists, a later audit/socket failure must not remove its physical file.
 await audit(req,'attachment.created','Attachment',attachment._id,{targetType:type,targetId:id});
 if(commentId){for(const person of [resource.author,...(resource.assignees||[])].filter(Boolean))await userDataChanged(person,'Attachment');}
 res.status(201).json({attachment});
});
r.get('/target/:type/:id',async(req,res)=>{
 await targetAccess(req.user,req.params.type,req.params.id);
 const items=await Attachment.find({targetType:req.params.type,targetId:req.params.id}).sort({createdAt:-1});res.json({items});
});
r.get('/:id',async(req,res)=>{
 const a=await Attachment.findById(requireId(req.params.id));if(!a)fail(404,'Prilog ne postoji.');
 await targetAccess(req.user,a.targetType,String(a.targetId));
 res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
 if(a.storage==='gridfs'){await downloadStoredAttachment(a,res);return;}
 res.download(path.join(storageDir,path.basename(a.fileName)),a.originalName);
});
r.delete('/:id',async(req,res)=>{
 const a=await Attachment.findById(requireId(req.params.id));if(!a)fail(404,'Prilog ne postoji.');
 const resource=await targetAccess(req.user,a.targetType,String(a.targetId));
 const allowed=same(a.owner,req.user._id)|| (a.targetType==='project'&&managing(req.user,resource.sector))||
  (a.targetType==='activity'&&managing(req.user,resource.sector))||(a.targetType==='idea'&&req.user.role==='admin');
 if(!allowed)fail(403,'Nemate pravo brisanja priloga.');
 await deleteStoredAttachment(a);await a.deleteOne();if(a.storage!=='gridfs')await fs.unlink(path.join(storageDir,path.basename(a.fileName))).catch(()=>{});
 await audit(req,'attachment.deleted','Attachment',a._id);res.json({ok:true});
});
export default r;
