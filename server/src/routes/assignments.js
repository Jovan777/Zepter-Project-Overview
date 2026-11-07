import {Router} from 'express';
import {Assignment,User} from '../models/index.js';
import {allow} from '../lib/auth.js';
import {schemas} from '../lib/validation.js';
import {requireId,safePage,same,dateValue} from '../lib/utils.js';
import {assignmentAccess} from '../lib/access.js';
import {fail} from '../lib/errors.js';
import {audit,notify} from '../services/events.js';
const r=Router();
r.get('/',async(req,res)=>{
 if(!['president','manager','admin'].includes(req.user.role))fail(403,'Nemate pristup zaduženjima.');
 const filter=req.user.role==='manager'?{assignedTo:req.user._id}:{};
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([Assignment.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).populate('assignedTo','firstName lastName'),Assignment.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',allow('president'),async(req,res)=>{
 const d=schemas.assignment.parse(req.body);
 const manager=await User.findById(d.assignedTo);
 if(!manager||manager.role!=='manager'||manager.approval!=='approved'||!same(manager.sector,d.sectorId))fail(422,'Zaduženje se dodeljuje aktivnom rukovodiocu izabranog sektora.');
 const assignment=await Assignment.create({sector:d.sectorId,assignedTo:d.assignedTo,title:d.title,description:d.description,dueDate:dateValue(d.dueDate),createdBy:req.user._id});
 await audit(req,'assignment.created','Assignment',assignment._id);
 await notify([d.assignedTo],{type:'president_assignment',title:'Novo zaduženje predsednika',body:d.title,link:`/assignments/${assignment._id}`},req.user._id);
 res.status(201).json({assignment});
});
r.get('/:id',async(req,res)=>res.json({assignment:await assignmentAccess(req.user,req.params.id)}));
r.patch('/:id',async(req,res)=>{
 const assignment=await assignmentAccess(req.user,req.params.id),d=schemas.assignmentPatch.parse(req.body);
 if(!same(req.user._id,assignment.assignedTo))fail(403,'Samo zaduženi rukovodilac ažurira status.');
 assignment.status=d.status;if(d.response!==undefined)assignment.response=d.response;await assignment.save();
 await audit(req,'assignment.updated','Assignment',assignment._id,{status:d.status});
 await notify([assignment.createdBy],{type:'assignment_status',title:'Ažurirano predsednikovo zaduženje',body:assignment.title,link:`/assignments/${assignment._id}`},req.user._id);
 res.json({assignment});
});
export default r;
