import {Router} from 'express';
import {Activity,Project,Audit,WorkLog} from '../models/index.js';
import {projectAccess,activityAccess,managing,validateTeam} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {dateValue,requireId,same,inRefs,safePage} from '../lib/utils.js';
import {allow} from '../lib/auth.js';
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
 if(p.archived||['completed','cancelled'].includes(p.status))fail(409,'Ponovo aktivirajte projekat pre dodavanja aktivnosti.');
 const assignees=await validateTeam(d.assigneeIds,p.sector);
 if(assignees.some(id=>!inRefs(p.members,id)))fail(422,'Odgovorna osoba mora biti član projektnog tima.');
 const a=await Activity.create({sector:p.sector,project:p._id,title:d.title,description:d.description,assignees,status:d.status,
  progress:d.status==='completed'?100:d.progress,dueDate:dateValue(d.dueDate),priority:d.priority,createdBy:req.user._id,
  ...(d.status!=='completed'&&d.progress===100?{status:'review'}:{})});
 await updateProjectProgress(p._id);await audit(req,'activity.created','Activity',a._id,{project:p._id});
 await notify(assignees,{type:'activity_assigned',title:'Nova aktivnost',body:a.title,link:`/activities/${a._id}`},req.user._id);
 res.status(201).json({activity:a});
});
r.get('/:id/history',allow('manager'),async(req,res)=>{
 if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');
 const {activity,project}=await activityAccess(req.user,req.params.id);
 const paging=value=>{const p=safePage({...req.query,page:value,limit:req.query.limit||10});p.page=Math.floor(p.page);p.limit=Math.floor(p.limit);p.skip=(p.page-1)*p.limit;return p;};
 const eventsPage=paging(req.query.page),logsPage=paging(req.query.worklogPage);
 const eventFilter={entity:'Activity',entityId:activity._id,action:{$in:['activity.created','activity.updated']}};
 const logFilter={activity:activity._id,project:project._id,sector:project.sector};
 const [events,eventTotal,logs,logTotal]=await Promise.all([
  Audit.find(eventFilter).select('action actor createdAt details.fields details.projectProgress').sort({createdAt:-1}).skip(eventsPage.skip).limit(eventsPage.limit).populate('actor','firstName lastName role').lean(),Audit.countDocuments(eventFilter),
  WorkLog.find(logFilter).select('user day done nextSteps blockers minutes createdAt').sort({day:-1,createdAt:-1}).skip(logsPage.skip).limit(logsPage.limit).populate('user','firstName lastName').lean(),WorkLog.countDocuments(logFilter)
 ]);
 const fields=new Set(['title','description','assigneeIds','status','progress','priority','dueDate','actualWork','nextStep','blockers']);
 const person=p=>p&&typeof p==='object'&&p.firstName!==undefined?{_id:p._id,firstName:p.firstName,lastName:p.lastName}:null;
 res.set('Cache-Control','no-store').json({events:{items:events.map(e=>({_id:e._id,action:e.action,createdAt:e.createdAt,actor:person(e.actor),fields:(e.details?.fields||[]).filter(key=>fields.has(key))})),total:eventTotal,page:eventsPage.page,limit:eventsPage.limit},
  worklogs:{items:logs.map(log=>({_id:log._id,user:person(log.user),day:log.day,done:log.done,nextSteps:log.nextSteps,blockers:log.blockers,minutes:log.minutes,createdAt:log.createdAt})),total:logTotal,page:logsPage.page,limit:logsPage.limit}});
});
r.get('/:id',async(req,res)=>{
 const {activity,project}=await activityAccess(req.user,req.params.id);
 await activity.populate('assignees','firstName lastName jobTitle');
 res.json({activity,project:{_id:project._id,title:project.title,sector:project.sector}});
});
r.patch('/:id',async(req,res)=>{
 const {activity:current,project:p}=await activityAccess(req.user,req.params.id,true);
 let a=current;
 const previousStatus=a.status,previousProgress=a.progress;
 const version=req.get('If-Match');
 if(version&&version!==`"${a.updatedAt?.toISOString()}"`)fail(409,'Aktivnost je u međuvremenu promenjena. Pregledajte aktuelne podatke pre čuvanja.');
 const manager=managing(req.user,p.sector);
 const d=(manager?schemas.activityPatch:schemas.employeeUpdate).parse(req.body);
 if(d.assigneeIds){const assignees=await validateTeam(d.assigneeIds,p.sector);
  if(assignees.some(id=>!inRefs(p.members,id)))fail(422,'Aktivnost se može dodeliti samo članovima projekta.');
  a.assignees=assignees;}
 for(const key of ['title','description','status','progress','priority','actualWork','nextStep','blockers'])if(d[key]!==undefined)a[key]=d[key];
 if(d.dueDate!==undefined)a.dueDate=d.dueDate===null?null:dateValue(d.dueDate);
 if(a.status==='completed')a.progress=100;
 if(a.progress===100&&a.status!=='completed')a.status='review';
 if((a.status!==previousStatus||a.progress!==previousProgress)&&(p.archived||p.status==='cancelled'||p.status==='completed'&&a.status!=='completed'))fail(409,'Ponovo aktivirajte projekat pre promene statusa ili napretka aktivnosti.');
 if(version){
  const fields={status:a.status,progress:a.progress};
  for(const key of ['title','description','priority','actualWork','nextStep','blockers'])if(d[key]!==undefined)fields[key]=a[key];
  if(d.assigneeIds!==undefined)fields.assignees=a.assignees;
  if(d.dueDate!==undefined)fields.dueDate=a.dueDate;
  a=await Activity.findOneAndUpdate({_id:a._id,updatedAt:current.updatedAt},{$set:fields},{new:true,runValidators:true});
  if(!a)fail(409,'Aktivnost je u međuvremenu promenjena. Vaše izmene nisu prepisale noviju verziju.');
 }else await a.save();
 const projectProgress=await updateProjectProgress(p._id);
 await audit(req,'activity.updated','Activity',a._id,{fields:Object.keys(d),projectProgress});
 const receivers=[...a.assignees.map(String),String(p.owner)];
 await notify(receivers,{type:'activity_updated',title:'Aktivnost ažurirana',body:a.title,link:`/activities/${a._id}`},req.user._id);
 res.json({activity:a,projectProgress});
});
export default r;
