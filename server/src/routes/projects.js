import {Router} from 'express';
import {Project,Activity,User,Sector} from '../models/index.js';
import {projectAccess,sectorAccess,managing,omniscient,canReadProject,validateTeam} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {dateValue,requireId,safePage,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify} from '../services/events.js';
const r=Router();
r.get('/',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query),filter={archived:false};
 if(req.query.sectorId){requireId(req.query.sectorId);await sectorAccess(req.user,req.query.sectorId);filter.sector=req.query.sectorId;}
 if(req.query.status){if(!['planned','active','at_risk','on_hold','completed','cancelled'].includes(req.query.status))fail(422,'Neispravan status.');filter.status=req.query.status;}
 if(req.user.role==='employee'){
  filter.$or=[{members:req.user._id},{owner:req.user._id}];
  filter.sector=req.user.sector;
 }else if(req.user.role==='manager')filter.sector=req.user.sector;
 const [items,total]=await Promise.all([Project.find(filter).sort({updatedAt:-1}).skip(skip).limit(limit).populate('owner','firstName lastName'),Project.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',async(req,res)=>{
 const d=schemas.project.parse(req.body);
 if(!managing(req.user,d.sectorId))fail(403,'Samo rukovodilac sektora kreira njegove projekte.');
 const sector=await Sector.findById(d.sectorId);if(!sector?.active)fail(422,'Nepostojeći ili neaktivan sektor.');
 const members=await validateTeam(d.memberIds,d.sectorId);
 const owner=d.ownerId||(req.user.role==='manager'?req.user._id:sector.manager);
 if(!owner)fail(422,'Izaberite odgovornu osobu iz ovog sektora.');
 await validateTeam([owner],d.sectorId);
 const p=await Project.create({sector:d.sectorId,title:d.title,description:d.description,status:d.status,priority:d.priority,
   dueDate:dateValue(d.dueDate),startDate:dateValue(d.startDate),owner,members:[...new Set([...members,String(owner)])],createdBy:req.user._id});
 await audit(req,'project.created','Project',p._id,{sector:p.sector,title:p.title});
 await notify(p.members.map(String),{type:'project_created',title:'Novi projekat',body:p.title,link:`/projects/${p._id}`},req.user._id);
 res.status(201).json({project:p});
});
r.get('/:id',async(req,res)=>{
 const p=await projectAccess(req.user,req.params.id);await p.populate([{path:'owner',select:'firstName lastName jobTitle'},{path:'members',select:'firstName lastName jobTitle'}]);
 res.json({project:p});
});
r.patch('/:id',async(req,res)=>{
 const p=await projectAccess(req.user,req.params.id,true);const d=schemas.projectPatch.parse(req.body);
 if(d.memberIds){
  p.members=await validateTeam(d.memberIds,p.sector);
 }
 if(d.ownerId!==undefined){
  if(d.ownerId){await validateTeam([d.ownerId],p.sector);p.owner=d.ownerId;if(!p.members.some(x=>same(x,d.ownerId)))p.members.push(d.ownerId);}
  else p.owner=undefined;
 }
 for(const key of ['title','description','status','priority','archived'])if(d[key]!==undefined)p[key]=d[key];
 for(const key of ['dueDate','startDate'])if(d[key]!==undefined)p[key]=d[key]===null?null:dateValue(d[key]);
 if(p.status==='completed'&&await Activity.exists({project:p._id,status:{$ne:'completed'}}))fail(409,'Za završetak projekta potrebno je završiti sve aktivnosti.');
 const oldProgress=p.progress;await p.save();
 await audit(req,'project.updated','Project',p._id,{fields:Object.keys(d),oldProgress});
 await notify(p.members.map(String),{type:'project_updated',title:'Promena na projektu',body:p.title,link:`/projects/${p._id}`},req.user._id);
 res.json({project:p});
});
export default r;
