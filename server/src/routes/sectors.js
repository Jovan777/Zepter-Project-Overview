import {Router} from 'express';
import {Sector,User,Project,Activity} from '../models/index.js';
import {sectorAccess,omniscient,requireSectorScope} from '../lib/access.js';
import {same} from '../lib/utils.js';
import {allow} from '../lib/auth.js';
import {presidentSector,presidentSectorProjects} from '../services/president.js';
const r=Router();
r.get('/public',async(_req,res)=>res.json({items:await Sector.find({active:true}).select('_id name code').sort({name:1})}));
r.use(requireSectorScope);
r.get('/:id/president',allow('president'),async(req,res)=>res.json(await presidentSector(req.user,req.params.id)));
r.get('/:id/president/projects',allow('president'),async(req,res)=>res.json(await presidentSectorProjects(req.user,req.params.id,req.query)));
r.get('/',async(req,res)=>{
 const filter=omniscient(req.user)?{}:{_id:req.user.sector};
 res.json({items:await Sector.find(filter).populate('manager','firstName lastName jobTitle').sort({name:1})});
});
r.get('/:id',async(req,res)=>{
 const sector=await sectorAccess(req.user,req.params.id);
 const pFilter={sector:sector._id,archived:false};
 if(req.user.role==='employee'){
  pFilter.$or=[{members:req.user._id},{owner:req.user._id}];
 }
 const projects=await Project.find(pFilter).sort({updatedAt:-1});
 const counts={total:projects.length,active:projects.filter(p=>['active','at_risk','on_hold'].includes(p.status)).length,atRisk:projects.filter(p=>p.status==='at_risk').length,avgProgress:projects.length?Math.round(projects.reduce((a,p)=>a+p.progress,0)/projects.length):0};
 res.json({sector,counts,projects});
});
r.get('/:id/people',async(req,res)=>{
 await sectorAccess(req.user,req.params.id);
 const users=await User.find({sector:req.params.id,approval:'approved'}).select('firstName lastName jobTitle role').sort({lastName:1});
 res.json({items:users});
});
export default r;
