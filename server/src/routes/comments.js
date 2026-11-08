import {Router} from 'express';
import {Comment,Project,Activity,Idea,Assignment,User,DecisionRequest,Attachment} from '../models/index.js';
import {targetAccess,managerRecipients,omniscient} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {safePage,requireId,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify} from '../services/events.js';
const r=Router();
r.get('/',async(req,res)=>{
 const {targetType,targetId}=req.query;
 if(!targetType||!targetId)fail(422,'Nedostaje cilj komentara.');
 await targetAccess(req.user,targetType,targetId);
 let {limit,skip,page}=safePage(req.query);const q={targetType,targetId};
 if(req.query.focus){
  const focus=await Comment.findOne({...q,_id:requireId(req.query.focus)}).select('_id createdAt');
  if(!focus)fail(404,'Povezani komentar nije pronađen u ovom razgovoru.');
  const before=await Comment.countDocuments({...q,$or:[{createdAt:{$lt:focus.createdAt}},{createdAt:focus.createdAt,_id:{$lt:focus._id}}]});
  page=Math.floor(before/limit)+1;skip=(page-1)*limit;
 }
 const [items,total]=await Promise.all([Comment.find(q).sort({createdAt:1,_id:1}).skip(skip).limit(limit).populate('author','firstName lastName role').populate('addressedTo','firstName lastName'),Comment.countDocuments(q)]);
 const context={total,page,limit,...(req.query.focus?{focusId:req.query.focus}:{})};
 if(req.query.includeAttachments!=='1')return res.json({items,...context});
 const files=items.length?await Attachment.find({targetType,targetId,comment:{$in:items.map(c=>c._id)}}).select('_id comment originalName mime size owner').lean():[];
 res.json({items:items.map(c=>({...c.toObject(),attachments:files.filter(a=>same(a.comment,c._id)).map(a=>({_id:a._id,originalName:a.originalName,mime:a.mime,size:a.size,owner:a.owner}))})),...context});
});
r.post('/',async(req,res)=>{
 const d=schemas.comment.parse(req.body);
 const target=await targetAccess(req.user,d.targetType,d.targetId,true);
 if(d.kind==='instruction'&&!['president','manager'].includes(req.user.role))fail(403,'Instrukcije mogu izdavati predsednik i rukovodilac.');
 if(d.kind==='instruction'&&req.user.role==='manager'&&d.targetType==='sector')fail(403,'Instrukciju na nivou sektora izdaje predsednik.');
 let parent=null;
 if(d.parentId){parent=await Comment.findById(d.parentId);
  if(!parent||parent.targetType!==d.targetType||!same(parent.targetId,d.targetId))fail(422,'Odgovor mora biti unutar iste konverzacije.');}
 if(d.addressedTo?.length){
  const users=await User.find({_id:{$in:d.addressedTo},approval:'approved'}).select('_id');
  if(users.length!==new Set(d.addressedTo).size)fail(422,'Nepostojeći primalac komentara.');
  const members=d.targetType==='idea'&&!['forwarded','approved','rejected'].includes(target.status)?[]:await User.find({approval:'approved',role:'president'}).select('_id');
  const allowed=new Set(members.map(x=>String(x._id)));
  if(d.targetType==='sector'||d.targetType==='project'||d.targetType==='activity'||d.targetType==='idea'||d.targetType==='assignment'||d.targetType==='request') {
   const sectorId=d.targetType==='sector'?target._id:target.sector;
   const managers=await managerRecipients(sectorId);managers.forEach(x=>allowed.add(String(x._id)));
   if(d.targetType==='project'){target.members.forEach(x=>allowed.add(String(x)));if(target.owner)allowed.add(String(target.owner));}
   if(d.targetType==='activity'){target.assignees.forEach(x=>allowed.add(String(x)));}
   if(d.targetType==='idea')allowed.add(String(target.author));
   if(d.targetType==='assignment')allowed.add(String(target.assignedTo));
   if(d.targetType==='request')allowed.add(String(target.createdBy));
  }
  if(d.addressedTo.some(x=>!allowed.has(String(x))))fail(403,'Primalac nije uključen u ovaj projekat, sektor ili ideju.');
 }
 const comment=await Comment.create({targetType:d.targetType,targetId:d.targetId,body:d.body,kind:d.kind,
  addressedTo:d.addressedTo||[],parent:parent?._id,author:req.user._id,responseStatus:'open'});
 if(parent&&!same(parent.author,req.user._id)&&parent.responseStatus==='open'){
  parent.responseStatus='answered';await parent.save();
 }
 await audit(req,'comment.created','Comment',comment._id,{targetType:d.targetType,targetId:d.targetId,kind:d.kind});
 const people=new Set((d.addressedTo||[]).map(String));
 if(parent)people.add(String(parent.author));
 let sectorId=null;
 if(d.targetType==='sector'){sectorId=target._id;}
 if(d.targetType==='project'){sectorId=target.sector;people.add(String(target.owner));target.members.forEach(id=>people.add(String(id)));}
 if(d.targetType==='activity'){
  sectorId=target.sector;target.assignees.forEach(id=>people.add(String(id)));
  const p=await Project.findById(target.project);if(p?.owner)people.add(String(p.owner));
 }
 if(d.targetType==='idea'){sectorId=target.sector;people.add(String(target.author));}
 if(d.targetType==='assignment'){sectorId=target.sector;people.add(String(target.assignedTo));people.add(String(target.createdBy));}
 if(d.targetType==='request'){sectorId=target.sector;people.add(String(target.createdBy));}
 if(sectorId){const managers=await managerRecipients(sectorId);managers.forEach(x=>people.add(String(x._id)));}
 if(d.targetType==='idea'&&!['forwarded','approved','rejected'].includes(target.status)){
  const presidents=await User.find({role:'president'}).select('_id');
  presidents.forEach(person=>people.delete(String(person._id)));
 }
 // President receives a reply to their comment, not every routine employee update.
 const link=`/${d.targetType==='activity'?'activities':d.targetType==='sector'?'sectors':d.targetType==='assignment'?'assignments':d.targetType==='request'?'requests':d.targetType==='idea'?'ideas':'projects'}/${d.targetId}`;
 await notify([...people],{type:'comment',title:d.kind==='instruction'?'Nova instrukcija':'Novi komentar',body:d.body.slice(0,130),link},req.user._id);
 res.status(201).json({comment});
});
r.patch('/:id/resolve',async(req,res)=>{
 const c=await Comment.findById(requireId(req.params.id));if(!c)fail(404,'Komentar ne postoji.');
 await targetAccess(req.user,c.targetType,c.targetId);
 if(c.kind!=='instruction'||!same(c.author,req.user._id))fail(403,'Samo autor instrukcije može označiti instrukciju kao rešenu.');
 c.responseStatus='resolved';await c.save();await audit(req,'instruction.resolved','Comment',c._id);
 res.json({comment:c});
});
r.get('/mine/instructions',async(req,res)=>{
 if(req.user.role!=='president')fail(403,'Ovaj pregled je namenjen predsedniku.');
 const {limit,skip,page}=safePage(req.query),filter={author:req.user._id};
 if(req.query.status){if(!['open','answered','resolved'].includes(req.query.status))fail(422,'Neispravan status.');filter.responseStatus=req.query.status;}
 const [items,total]=await Promise.all([Comment.find(filter).sort({createdAt:-1}).skip(skip).limit(limit),Comment.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
export default r;
