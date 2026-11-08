import {Router} from 'express';
import {Idea,User,Attachment} from '../models/index.js';
import {ideaAccess,omniscient,managing} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {safePage,requireId,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify,notifyManagers} from '../services/events.js';
import {allow} from '../lib/auth.js';
import {presidentIdeas,markPresidentIdeaRead} from '../services/president-ideas.js';
import {decideIdea,retryIdeaDecisionDelivery} from '../services/idea-decisions.js';
const r=Router();
r.get('/president',allow('president'),async(req,res)=>res.json(await presidentIdeas(req.user,req.query)));
r.post('/:id/read',allow('president'),async(req,res)=>res.json(await markPresidentIdeaRead(req.user,req.params.id,req.get('If-Match'))));
r.post('/:id/decision',allow('president'),async(req,res)=>{const result=await decideIdea(req.user,req.params.id,req.body,req.get('If-Match'));res.status(result.pending?202:200).json(result);});
r.post('/:id/decision/deliver',allow('president'),async(req,res)=>{const result=await retryIdeaDecisionDelivery(req.user,req.params.id);res.status(result.pending?202:200).json(result);});
// Manager feed: every list and global count derives its sector from the session.
r.get('/sector',allow('manager'),async(req,res)=>{
 if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');
 const tabs={all:null,review:['submitted','in_review'],revision:['revision_requested'],forwarded:['forwarded','approved','rejected']};
 const tab=req.query.tab||'all';if(!Object.hasOwn(tabs,tab))fail(422,'Nepoznat filter ideja.');
 const own={sector:req.user.sector},filter={...own,...(tabs[tab]?{status:{$in:tabs[tab]}}:{})};
 const {page:rawPage,limit:rawLimit}=safePage(req.query),page=Math.floor(rawPage),limit=Math.floor(rawLimit);
 const [items,total,all,review,revision,forwarded]=await Promise.all([
  Idea.find(filter).select('title description author createdAt status').sort({createdAt:-1,_id:-1}).skip((page-1)*limit).limit(limit).populate('author','firstName lastName').lean(),
  Idea.countDocuments(filter),Idea.countDocuments(own),Idea.countDocuments({...own,status:{$in:tabs.review}}),
  Idea.countDocuments({...own,status:'revision_requested'}),Idea.countDocuments({...own,status:{$in:tabs.forwarded}})
 ]);
 res.set('Cache-Control','no-store').json({items,total,page,limit,stats:{total:all,review,revision,forwarded}});
});
// Separate employee feed: totals cover all the author's ideas, independent of pagination/filter.
r.get('/mine',async(req,res)=>{
 if(req.user.role!=='employee')fail(403,'Pregled je namenjen zaposlenom.');
 const statuses={all:null,review:['submitted','in_review'],revision:['revision_requested'],forwarded:['forwarded','approved','rejected']};
 const tab=req.query.tab||'all';
 if(!Object.hasOwn(statuses,tab))fail(422,'Nepoznat filter ideja.');
 const own={author:req.user._id};
 const filter={...own,...(statuses[tab]?{status:{$in:statuses[tab]}}:{})};
 const {limit,skip,page}=safePage(req.query);
 const [items,total,all,revision]=await Promise.all([
  Idea.find(filter).select('title description status reviewNote createdAt').sort({createdAt:-1,_id:-1}).skip(skip).limit(limit).lean(),
  Idea.countDocuments(filter),Idea.countDocuments(own),Idea.countDocuments({...own,status:'revision_requested'})
 ]);
 const images=items.length?await Attachment.find({targetType:'idea',targetId:{$in:items.map(x=>x._id)},mime:{$in:['image/png','image/jpeg','image/webp']}}).select('_id targetId').sort({createdAt:1,_id:1}).lean():[];
 const thumbnails=new Map();
 for(const image of images)if(!thumbnails.has(String(image.targetId)))thumbnails.set(String(image.targetId),image._id);
 res.json({items:items.map(x=>({...x,thumbnailId:thumbnails.get(String(x._id))||null})),total,page,limit,stats:{total:all,revision}});
});
r.get('/',async(req,res)=>{
 const filter={};
 if(req.user.role==='president')filter.status={$in:['forwarded','approved','rejected']};
 else if(req.user.role==='manager'){if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');filter.sector=req.user.sector;}
 else if(req.user.role==='employee')filter.author=req.user._id;
 if(req.query.status){
  if(!['submitted','in_review','revision_requested','forwarded','approved','rejected'].includes(req.query.status))fail(422,'Nepoznat status ideje.');
  if(req.user.role==='president'&&!['forwarded','approved','rejected'].includes(req.query.status))fail(403,'Predsedniku su dostupne samo prosleđene ideje.');
  filter.status=req.query.status;
 }
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([Idea.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).populate('author','firstName lastName').populate('sector','name'),Idea.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',async(req,res)=>{
 if(!['employee','manager'].includes(req.user.role)||!req.user.sector)fail(403,'Samo zaposleni sektora šalju ideje.');
 const d=schemas.idea.parse(req.body);
 const idea=await Idea.create({...d,sector:req.user.sector,author:req.user._id,status:'submitted'});
 await audit(req,'idea.submitted','Idea',idea._id,{sector:idea.sector});
 await notifyManagers(idea.sector,{type:'new_idea',title:'Nova ideja zaposlenog',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 res.status(201).json({idea});
});
r.get('/:id',async(req,res)=>{
 const idea=await ideaAccess(req.user,req.params.id);
 await idea.populate([{path:'author',select:'firstName lastName jobTitle'},{path:'sector',select:'name'}]);res.json({idea});
});
r.patch('/:id',async(req,res)=>{
 let idea=await ideaAccess(req.user,req.params.id,true);
 if(idea.status!=='revision_requested')fail(409,'Ideja može da se dopuni samo kada je vraćena na doradu.');
 const version=req.get('If-Match');
 if(version&&version!==`"${idea.updatedAt?.toISOString()}"`)fail(409,'Ideja je u međuvremenu promenjena. Pregledajte aktuelni predlog.');
 const d=schemas.ideaPatch.parse(req.body);
 if(version){
  idea=await Idea.findOneAndUpdate({_id:idea._id,author:req.user._id,status:'revision_requested',updatedAt:idea.updatedAt},{$set:d},{new:true,runValidators:true});
  if(!idea)fail(409,'Ideja je u međuvremenu promenjena. Vaš unos je sačuvan u formi.');
 }else {Object.assign(idea,d);await idea.save();}
 await audit(req,'idea.edited','Idea',idea._id,{fields:Object.keys(d)});res.json({idea});
});
r.post('/:id/resubmit',async(req,res)=>{
 let idea=await ideaAccess(req.user,req.params.id,true);
 if(idea.status!=='revision_requested')fail(409,'Ideja trenutno nije na doradi.');
 const version=req.get('If-Match');
 if(version&&version!==`"${idea.updatedAt?.toISOString()}"`)fail(409,'Ideja je u međuvremenu promenjena. Pregledajte aktuelni predlog.');
 // Status condition makes resubmission a single transition, including for legacy callers.
 idea=await Idea.findOneAndUpdate({_id:idea._id,author:req.user._id,status:'revision_requested',...(version?{updatedAt:idea.updatedAt}:{})},{$set:{status:'submitted',reviewNote:''},$inc:{revisionCount:1}},{new:true,runValidators:true});
 if(!idea)fail(409,'Ideja više nije na doradi. Osvežite predlog da proverite status.');
 await audit(req,'idea.resubmitted','Idea',idea._id);
 await notifyManagers(idea.sector,{type:'idea_resubmitted',title:'Dopunjena ideja',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 res.json({idea});
});
r.post('/:id/review',allow('manager'),async(req,res)=>{
 if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');
 const current=await Idea.findById(requireId(req.params.id));if(!current)fail(404,'Ideja ne postoji.');
 if(!same(req.user.sector,current.sector))fail(403,'Samo rukovodilac sektora razmatra ideju.');
 if(!['submitted','in_review'].includes(current.status))fail(409,'Ideja nije dostupna za ovu odluku.');
 const version=req.get('If-Match');
 if(version&&version!==`"${current.updatedAt?.toISOString()}"`)fail(409,'Predlog je u međuvremenu promenjen. Proverite aktuelnu verziju pre odluke.');
 const d=schemas.review.parse(req.body);
 if(d.action==='request_revision'&&!d.note?.trim())fail(422,'Unesite objašnjenje za doradu.');
 const fields={status:d.action==='forward'?'forwarded':'revision_requested',reviewNote:d.note||'',reviewedBy:req.user._id};
 if(d.action==='forward')fields.forwardedAt=new Date();
 const idea=await Idea.findOneAndUpdate({_id:current._id,sector:req.user.sector,status:{$in:['submitted','in_review']},...(version?{updatedAt:current.updatedAt}:{})},{$set:fields},{new:true,runValidators:true});
 if(!idea)fail(409,'Ideja je promenjena ili je odluka već doneta. Proverite aktuelni predlog.');
 await audit(req,'idea.'+(d.action==='forward'?'forwarded':'revision_requested'),'Idea',idea._id,{note:d.note});
 await notify([idea.author],{type:'idea_status',title:d.action==='forward'?'Ideja prosleđena predsedniku':'Ideja vraćena na doradu',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 if(d.action==='forward'){
  const presidents=await User.find({role:'president',approval:'approved'}).select('_id');
  await notify(presidents.map(x=>x._id),{type:'idea_forwarded',title:'Nova ideja za pregled',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 }
 res.json({idea});
});
export default r;
