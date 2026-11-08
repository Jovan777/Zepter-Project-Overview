import {Router} from 'express';
import {Project,Activity,User,Sector} from '../models/index.js';
import {projectAccess,sectorAccess,managing,omniscient,canReadProject,validateTeam,requireSectorScope} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {dateValue,requireId,safePage,same} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify} from '../services/events.js';
import {allow} from '../lib/auth.js';
import {employeeProjects} from '../services/employee.js';
import {managerProjects} from '../services/manager.js';
const r=Router();
r.use(requireSectorScope);
r.get('/mine',allow('employee'),async(req,res)=>res.json(await employeeProjects(req.user,req.query)));
r.get('/sector',allow('manager'),async(req,res)=>res.json(await managerProjects(req.user,req.query)));
r.get('/',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query),filter={archived:false};
 if(req.query.sectorId){requireId(req.query.sectorId);await sectorAccess(req.user,req.query.sectorId);filter.sector=req.query.sectorId;}
 if(req.query.status){if(!['planned','active','at_risk','on_hold','completed','cancelled'].includes(req.query.status))fail(422,'Neispravan status.');filter.status=req.query.status;}
 if(req.query.activeOnly==='1'){
  const active=['active','at_risk','on_hold'];
  filter.status=req.query.status?{$in:active.filter(status=>status===req.query.status)}:{$in:active};
 }
 if(req.user.role==='employee'){
  filter.$or=[{members:req.user._id},{owner:req.user._id}];
  filter.sector=req.user.sector;
 }else if(req.user.role==='manager')filter.sector=req.user.sector;
 const [items,total]=await Promise.all([Project.find(filter).sort({updatedAt:-1}).skip(skip).limit(limit).populate('owner','firstName lastName'),Project.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',async(req,res)=>{
 const d=schemas.project.parse(req.body);
 if(d.startDate&&d.dueDate&&d.startDate>d.dueDate)fail(422,'Rok projekta ne može biti pre datuma početka.');
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
 let p=await projectAccess(req.user,req.params.id,true);const d=schemas.projectPatch.parse(req.body);
 const version=req.get('If-Match');
 if(version&&version!==`"${p.updatedAt?.toISOString()}"`)fail(409,'Projekat je u međuvremenu promenjen. Pregledajte aktuelne podatke pre čuvanja.');
 if(d.memberIds){
  p.members=await validateTeam(d.memberIds,p.sector);
 }
 if(d.ownerId!==undefined){
  if(d.ownerId){await validateTeam([d.ownerId],p.sector);p.owner=d.ownerId;if(!p.members.some(x=>same(x,d.ownerId)))p.members.push(d.ownerId);}
  else p.owner=undefined;
 }
 // Keep the owner and all existing assignees in the effective project team.
 if(d.memberIds!==undefined||d.ownerId!==undefined){
  if(p.owner&&!p.members.some(x=>same(x,p.owner)))p.members.push(p.owner);
  const assigned=await Activity.distinct('assignees',{project:p._id});
  if(assigned.some(id=>!p.members.some(member=>same(member,id))))fail(409,'Član ima dodeljene aktivnosti. Prvo preraspodelite njegova zaduženja, pa ga uklonite iz tima.');
 }
 for(const key of ['title','description','status','priority','archived'])if(d[key]!==undefined)p[key]=d[key];
 for(const key of ['dueDate','startDate'])if(d[key]!==undefined)p[key]=d[key]===null?null:dateValue(d[key]);
 if(p.startDate&&p.dueDate&&p.startDate>p.dueDate)fail(422,'Rok projekta ne može biti pre datuma početka.');
 if(p.status==='completed'&&await Activity.exists({project:p._id,status:{$ne:'completed'}}))fail(409,'Za završetak projekta potrebno je završiti sve aktivnosti.');
 const oldProgress=p.progress;
 if(version){
  const fields={};
  for(const key of ['title','description','status','priority','archived','dueDate','startDate'])if(d[key]!==undefined)fields[key]=p[key];
  if(d.memberIds!==undefined||d.ownerId!==undefined){fields.members=p.members;fields.owner=p.owner||null;}
  p=await Project.findOneAndUpdate({_id:p._id,updatedAt:p.updatedAt},{$set:fields},{new:true,runValidators:true});
  if(!p)fail(409,'Projekat je u međuvremenu promenjen. Vaše izmene nisu prepisale noviju verziju.');
 }else await p.save();
 await audit(req,'project.updated','Project',p._id,{fields:Object.keys(d),oldProgress});
 await notify(p.members.map(String),{type:'project_updated',title:'Promena na projektu',body:p.title,link:`/projects/${p._id}`},req.user._id);
 res.json({project:p});
});
export default r;
