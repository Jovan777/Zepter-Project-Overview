import {Router} from 'express';
import {Project,Activity,Idea,Comment,Assignment,Notification,Sector,User,DecisionRequest} from '../models/index.js';
import {omniscient} from '../lib/access.js';
import {same,belgradeDay} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {allow} from '../lib/auth.js';
import {employeeOverview} from '../services/employee.js';
import {managerOverview} from '../services/manager.js';
const r=Router();
r.get('/employee',allow('employee'),async(req,res)=>res.json(await employeeOverview(req.user,req.query)));
r.get('/manager',allow('manager'),async(req,res)=>res.json(await managerOverview(req.user,req.query)));
r.get('/overview',async(req,res)=>{
 const u=req.user;let projectFilter={archived:false},activityFilter={},ideaFilter={};
 if(u.role==='manager'){projectFilter.sector=u.sector;activityFilter.sector=u.sector;ideaFilter={sector:u.sector,status:{$in:['submitted','in_review']}};}
 if(u.role==='employee'){
  projectFilter.$or=[{members:u._id},{owner:u._id}];projectFilter.sector=u.sector;
  activityFilter.assignees=u._id;
  ideaFilter.author=u._id;
 }
 if(u.role==='president')ideaFilter.status='forwarded';
 const todayStart=new Date(belgradeDay()+'T00:00:00Z');
 const [totalProjects,activeProjects,delayedActivities,newIdeas,unread,sectorCount]=await Promise.all([
  Project.countDocuments(projectFilter),Project.countDocuments({...projectFilter,status:{$in:['active','at_risk','on_hold']}}),
  Activity.countDocuments({...activityFilter,status:{$ne:'completed'},dueDate:{$lt:todayStart}}),
  Idea.countDocuments(ideaFilter),Notification.countDocuments({user:u._id,readAt:null}),
  omniscient(u)?Sector.countDocuments({active:true}):Promise.resolve(1)
 ]);
 let attention=0;
 if(u.role==='president'){
  attention=await DecisionRequest.countDocuments({status:'open'})+await Assignment.countDocuments({status:{$in:['new','blocked']}})+await Project.countDocuments({status:'at_risk',archived:false})+
   await Comment.countDocuments({author:u._id,kind:'instruction',responseStatus:'open'});
 }
 if(u.role==='manager')attention=await Assignment.countDocuments({assignedTo:u._id,status:{$in:['new','blocked']}});
 res.json({role:u.role,stats:{totalProjects,activeProjects,delayedActivities,newIdeas,unread,sectorCount,attention}});
});
r.get('/attention',async(req,res)=>{
 if(!['president','manager','admin'].includes(req.user.role))fail(403,'Nemate pristup važnim pitanjima.');
 const todayStart=new Date(belgradeDay()+'T00:00:00Z');
 const projectQ={archived:false,$or:[{status:'at_risk'},{status:{$nin:['completed','cancelled']},dueDate:{$lt:todayStart}}]};
 const activityQ={status:{$ne:'completed'},$or:[{status:'blocked'},{dueDate:{$lt:todayStart}}]};
 if(req.user.role==='manager'){projectQ.sector=req.user.sector;activityQ.sector=req.user.sector;}
 const assignmentsQ=req.user.role==='manager'?{assignedTo:req.user._id,status:{$ne:'done'}}:{status:{$ne:'done'}};
 const [projects,activities,assignments,requests]=await Promise.all([
  Project.find(projectQ).limit(25).select('title sector dueDate status'),
  Activity.find(activityQ).limit(25).select('title sector project dueDate status'),
  Assignment.find(assignmentsQ).limit(25).select('title sector assignedTo dueDate status'),
  DecisionRequest.find(req.user.role==='manager'?{sector:req.user.sector,status:'open'}:{status:'open'}).limit(25).select('title type sector status')
 ]);
 const items=[...projects.map(p=>({kind:'project',id:p._id,title:p.title,status:p.status,dueDate:p.dueDate,link:`/projects/${p._id}`})),
  ...activities.map(a=>({kind:'activity',id:a._id,title:a.title,status:a.status,dueDate:a.dueDate,link:`/activities/${a._id}`})),
  ...assignments.map(a=>({kind:'assignment',id:a._id,title:a.title,status:a.status,dueDate:a.dueDate,link:`/assignments/${a._id}`})),
  ...requests.map(a=>({kind:'request',id:a._id,title:a.title,status:a.status,link:`/requests/${a._id}`}))];
 res.json({items});
});
export default r;
