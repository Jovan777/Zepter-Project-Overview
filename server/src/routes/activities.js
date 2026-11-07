import {Router} from 'express';
import {Activity,Project} from '../models/index.js';
import {projectAccess,activityAccess,managing,validateTeam} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {dateValue,requireId,same,inRefs} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {audit,notify} from '../services/events.js';
import {updateProjectProgress} from '../services/progress.js';
const r=Router();
r.get('/project/:projectId',async(req,res)=>{
 await projectAccess(req.user,req.params.projectId);
 const items=await Activity.find({project:req.params.projectId}).populate('assignees','firstName lastName jobTitle').sort({createdAt:1});
 res.json({items});
});
r.post('/project/:projectId',async(req,res)=>{
 const p=await projectAccess(req.user,req.params.projectId,true);const d=schemas.activity.parse(req.body);
 const assignees=await validateTeam(d.assigneeIds,p.sector);
 if(assignees.some(id=>!inRefs(p.members,id)))fail(422,'Odgovorna osoba mora biti član projektnog tima.');
 const a=await Activity.create({sector:p.sector,project:p._id,title:d.title,description:d.description,assignees,status:d.status,
  progress:d.status==='completed'?100:d.progress,dueDate:dateValue(d.dueDate),priority:d.priority,createdBy:req.user._id});
 await updateProjectProgress(p._id);await audit(req,'activity.created','Activity',a._id,{project:p._id});
 await notify(assignees,{type:'activity_assigned',title:'Nova aktivnost',body:a.title,link:`/activities/${a._id}`},req.user._id);
 res.status(201).json({activity:a});
});
r.get('/:id',async(req,res)=>{
 const {activity,project}=await activityAccess(req.user,req.params.id);
 await activity.populate('assignees','firstName lastName jobTitle');
 res.json({activity,project:{_id:project._id,title:project.title,sector:project.sector}});
});
r.patch('/:id',async(req,res)=>{
 const {activity:a,project:p}=await activityAccess(req.user,req.params.id,true);
 const manager=managing(req.user,p.sector);
 const d=(manager?schemas.activityPatch:schemas.employeeUpdate).parse(req.body);
 if(d.assigneeIds){const assignees=await validateTeam(d.assigneeIds,p.sector);
  if(assignees.some(id=>!inRefs(p.members,id)))fail(422,'Aktivnost se može dodeliti samo članovima projekta.');
  a.assignees=assignees;}
 for(const key of ['title','description','status','progress','priority','actualWork','nextStep','blockers'])if(d[key]!==undefined)a[key]=d[key];
 if(d.dueDate!==undefined)a.dueDate=d.dueDate===null?null:dateValue(d.dueDate);
 if(a.status==='completed')a.progress=100;
 if(a.progress===100&&a.status!=='completed')a.status='review';
 await a.save();const projectProgress=await updateProjectProgress(p._id);
 await audit(req,'activity.updated','Activity',a._id,{fields:Object.keys(d),projectProgress});
 const receivers=[...a.assignees.map(String),String(p.owner)];
 await notify(receivers,{type:'activity_updated',title:'Aktivnost ažurirana',body:a.title,link:`/activities/${a._id}`},req.user._id);
 res.json({activity:a,projectProgress});
});
export default r;
