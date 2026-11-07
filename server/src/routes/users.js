import {Router} from 'express';
import {User,Project} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {requireId,same} from '../lib/utils.js';
import {omniscient} from '../lib/access.js';
const r=Router();
r.get('/',async(req,res)=>{
 const filter=omniscient(req.user)?{approval:'approved'}:{sector:req.user.sector,approval:'approved'};
 const items=await User.find(filter).select('firstName lastName role jobTitle sector').sort({lastName:1}).limit(300);
 res.json({items});
});
r.get('/:id',async(req,res)=>{
 const person=await User.findById(requireId(req.params.id)).select('firstName lastName role jobTitle sector');if(!person)fail(404,'Korisnik nije pronađen.');
 const allowed=omniscient(req.user)||same(person.sector,req.user.sector)||same(person._id,req.user._id);
 if(!allowed)fail(403,'Nedozvoljen pristup profilu.');
 const projects=await Project.find({$or:[{owner:person._id},{members:person._id}],archived:false}).select('title status progress sector');
 res.json({user:person,projects:omniscient(req.user)||req.user.role==='manager'||same(person._id,req.user._id)?projects:projects.filter(p=>p.members.some(m=>same(m,req.user._id))||same(p.owner,req.user._id))});
});
export default r;
