import {Router} from 'express';
import {Idea,User} from '../models/index.js';
import {ideaAccess,omniscient,managing} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {safePage,requireId,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify,notifyManagers} from '../services/events.js';
const r=Router();
r.get('/',async(req,res)=>{
 const filter={};
 if(req.user.role==='president')filter.status='forwarded';
 else if(req.user.role==='manager')filter.sector=req.user.sector;
 else if(req.user.role==='employee')filter.author=req.user._id;
 if(req.query.status){
  if(!['submitted','in_review','revision_requested','forwarded'].includes(req.query.status))fail(422,'Nepoznat status ideje.');
  if(req.user.role==='president'&&req.query.status!=='forwarded')fail(403,'Predsedniku su dostupne samo prosleđene ideje.');
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
 const idea=await ideaAccess(req.user,req.params.id,true);
 if(idea.status!=='revision_requested')fail(409,'Ideja može da se dopuni samo kada je vraćena na doradu.');
 const d=schemas.ideaPatch.parse(req.body);Object.assign(idea,d);await idea.save();
 await audit(req,'idea.edited','Idea',idea._id,{fields:Object.keys(d)});res.json({idea});
});
r.post('/:id/resubmit',async(req,res)=>{
 const idea=await ideaAccess(req.user,req.params.id,true);
 if(idea.status!=='revision_requested')fail(409,'Ideja trenutno nije na doradi.');
 idea.status='submitted';idea.reviewNote='';idea.revisionCount+=1;await idea.save();
 await audit(req,'idea.resubmitted','Idea',idea._id);
 await notifyManagers(idea.sector,{type:'idea_resubmitted',title:'Dopunjena ideja',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 res.json({idea});
});
r.post('/:id/review',async(req,res)=>{
 const idea=await Idea.findById(requireId(req.params.id));if(!idea)fail(404,'Ideja ne postoji.');
 if(req.user.role!=='manager'||!same(req.user.sector,idea.sector))fail(403,'Samo rukovodilac sektora razmatra ideju.');
 if(!['submitted','in_review'].includes(idea.status))fail(409,'Ideja nije dostupna za ovu odluku.');
 const d=schemas.review.parse(req.body);
 if(d.action==='request_revision'&&!d.note?.trim())fail(422,'Unesite objašnjenje za doradu.');
 idea.status=d.action==='forward'?'forwarded':'revision_requested';idea.reviewNote=d.note||'';idea.reviewedBy=req.user._id;
 if(d.action==='forward')idea.forwardedAt=new Date();await idea.save();
 await audit(req,'idea.'+(d.action==='forward'?'forwarded':'revision_requested'),'Idea',idea._id,{note:d.note});
 await notify([idea.author],{type:'idea_status',title:d.action==='forward'?'Ideja prosleđena predsedniku':'Ideja vraćena na doradu',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 if(d.action==='forward'){
  const presidents=await User.find({role:'president',approval:'approved'}).select('_id');
  await notify(presidents.map(x=>x._id),{type:'idea_forwarded',title:'Nova ideja za pregled',body:idea.title,link:`/ideas/${idea._id}`},req.user._id);
 }
 res.json({idea});
});
export default r;
