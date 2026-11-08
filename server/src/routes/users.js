import {Router} from 'express';
import {User,Project} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {requireId,same} from '../lib/utils.js';
import {omniscient,requireSectorScope} from '../lib/access.js';
const r=Router();
r.use(requireSectorScope);
r.get('/',async(req,res)=>{
 const filter=omniscient(req.user)?{approval:'approved'}:{sector:req.user.sector,approval:'approved'};
 const items=await User.find(filter).select('firstName lastName role jobTitle sector').sort({lastName:1}).limit(300);
 res.json({items});
});
r.get('/:id',async(req,res)=>{
 const person=await User.findById(requireId(req.params.id)).select('firstName lastName role jobTitle sector');if(!person)fail(404,'Korisnik nije pronađen.');
 const allowed=omniscient(req.user)||same(person.sector,req.user.sector)||same(person._id,req.user._id);
 if(!allowed)fail(403,'Nedozvoljen pristup profilu.');
 const filter={$and:[{$or:[{owner:person._id},{members:person._id}]}],archived:false};
 if(req.user.role==='manager')filter.sector=req.user.sector;
 if(req.user.role==='employee')filter.$and.push({$or:[{owner:req.user._id},{members:req.user._id}]});
 const projects=await Project.find(filter).select('title status progress sector');
 res.json({user:person,projects});
});
export default r;
