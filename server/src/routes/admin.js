import {Router} from 'express';
import {User,Sector,Audit,Project} from '../models/index.js';
import {allow} from '../lib/auth.js';
import {schemas} from '../lib/validation.js';
import {fail} from '../lib/errors.js';
import {requireId,safePage} from '../lib/utils.js';
import {audit} from '../services/events.js';
import {adminChange,changeManagedUser,checkAdminVersion} from '../services/admin-users.js';
const r=Router();r.use(allow('admin'));
const literal=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function userFilter(query){
 const filter={};
 if(query.role){if(!['employee','manager','admin','president'].includes(query.role))fail(422,'Nepoznata uloga.');filter.role=query.role;}
 if(query.approval){if(!['pending','approved','rejected','disabled'].includes(query.approval))fail(422,'Nepoznat status naloga.');filter.approval=query.approval;}
 if(query.sectorId)filter.sector=requireId(query.sectorId);
 if(query.q){if(typeof query.q!=='string'||query.q.length>120)fail(422,'Pretraga može imati do 120 znakova.');const terms=query.q.trim().split(/\s+/).filter(Boolean);if(terms.length)filter.$and=terms.map(term=>({$or:['firstName','lastName','email','jobTitle'].map(key=>({[key]:{$regex:literal(term),$options:'i'}}))}));}
 return filter;
}
r.get('/overview',async(_req,res)=>{
 const [users,pending,approved,disabled,managers,sectors,activeSectors,unmanaged]=await Promise.all([
  User.countDocuments({}),User.countDocuments({approval:'pending'}),User.countDocuments({approval:'approved'}),User.countDocuments({approval:'disabled'}),User.countDocuments({approval:'approved',role:'manager'}),
  Sector.countDocuments({}),Sector.countDocuments({active:true}),Sector.countDocuments({active:true,manager:null})
 ]);
 res.json({users,pending,approved,disabled,managers,sectors,activeSectors,unmanaged});
});
r.get('/registrations',async(req,res)=>{
 const status=['pending','approved','rejected','disabled'].includes(req.query.status)?req.query.status:'pending';
 const {limit,skip,page}=req.query.limit||req.query.page?safePage(req.query):{limit:200,skip:0,page:1},filter=userFilter({...req.query,approval:status});
 const [items,total]=await Promise.all([User.find(filter).populate('sector','name').sort({createdAt:-1,_id:-1}).skip(skip).limit(limit),User.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.get('/users',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query);
 const filter=userFilter(req.query);
 const [items,total]=await Promise.all([User.find(filter).populate('sector','name active').sort({createdAt:-1,_id:-1}).skip(skip).limit(limit),User.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.get('/users/:id',async(req,res)=>{const user=await User.findById(requireId(req.params.id)).populate('sector','name active');if(!user)fail(404,'Korisnik nije pronađen.');res.json({user});});
r.patch('/users/:id/approve',async(req,res)=>{
 res.json({user:await changeManagedUser(req,requireId(req.params.id),'approve',schemas.approval.parse(req.body))});
});
r.patch('/users/:id/reject',async(req,res)=>{
 res.json({user:await changeManagedUser(req,requireId(req.params.id),'reject',schemas.rejection.parse(req.body))});
});
r.patch('/users/:id/disable',async(req,res)=>{
 res.json({user:await changeManagedUser(req,requireId(req.params.id),'disable')});
});
r.patch('/users/:id/activate',async(req,res)=>res.json({user:await changeManagedUser(req,requireId(req.params.id),'activate')}));
r.patch('/users/:id',async(req,res)=>res.json({user:await changeManagedUser(req,requireId(req.params.id),'edit',schemas.adminUserPatch.parse(req.body))}));
r.post('/sectors',async(req,res)=>{
 const d=schemas.sector.parse(req.body);d.name=d.name.normalize('NFC').replace(/\s+/g,' ');d.code=d.code.toUpperCase();
 const escaped=d.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(await Sector.findOne({$or:[{name:{$regex:'^'+escaped+'$',$options:'i'}},{code:d.code}]}))fail(409,'Sektor sa ovim nazivom ili šifrom već postoji.');
 let sector;try{sector=await Sector.create(d);}catch(error){if(error.code===11000)fail(409,'Sektor sa ovim nazivom ili šifrom već postoji.');throw error;}
 await audit(req,'admin.sector_created','Sector',sector._id);
 res.status(201).json({sector});
});
r.patch('/sectors/:id',async(req,res)=>{
 const d=schemas.sectorPatch.parse(req.body),id=requireId(req.params.id);
 const sector=await adminChange(async()=>{
  const previous=await Sector.findById(id);if(!previous)fail(404,'Nepostojeći sektor.');checkAdminVersion(req,previous);
  if(d.name){d.name=d.name.normalize('NFC').replace(/\s+/g,' ');if(await Sector.exists({_id:{$ne:id},name:{$regex:'^'+literal(d.name)+'$',$options:'i'}}))fail(409,'Sektor sa ovim nazivom već postoji.');}
  if(d.active===false){
   const [users,projects]=await Promise.all([User.exists({sector:id,approval:'approved'}),Project.exists({sector:id,archived:false,status:{$nin:['completed','cancelled']}})]);
   if(users||projects)fail(409,'Sektor ima aktivne naloge ili otvorene projekte. Razrešite ih pre deaktivacije.');
  }
  const changed=await Sector.findOneAndUpdate({_id:id,updatedAt:previous.updatedAt},{$set:d},{returnDocument:'after',runValidators:true});
  if(!changed)fail(409,'Sektor je u međuvremenu promenjen. Osvežite podatke.');
  await audit(req,'admin.sector_updated','Sector',id,{changedFields:Object.keys(d)});return changed;
 });res.json({sector});
});
r.get('/audit',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query);
 const filter={};if(req.query.entity){if(!['User','Sector','Project','Activity','Idea','Report','Comment','Attachment','WorkLog','Assignment','DecisionRequest'].includes(req.query.entity))fail(422,'Nepoznat tip promene.');filter.entity=req.query.entity;}
 if(req.query.administrative==='true')filter.action={$regex:'^admin\\.'};
 const [items,total]=await Promise.all([Audit.find(filter).sort({createdAt:-1,_id:-1}).skip(skip).limit(limit).populate('actor','firstName lastName email'),Audit.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
export default r;
