import {Router} from 'express';
import {WorkLog,User,Activity} from '../models/index.js';
import {activityAccess,projectAccess,managing,omniscient,requireSectorScope} from '../lib/access.js';
import {schemas} from '../lib/validation.js';
import {fail} from '../lib/errors.js';
import {belgradeDay,requireId,safePage,same,validDay,dateValue} from '../lib/utils.js';
import {audit,notifyManagers} from '../services/events.js';
import {updateProjectProgress} from '../services/progress.js';
const r=Router();
r.use(requireSectorScope);
r.post('/',async(req,res)=>{
 if(!['employee','manager'].includes(req.user.role)||!req.user.sector)fail(403,'Dnevne unose vode samo zaposleni i rukovodioci sektora.');
 const d=schemas.worklog.parse(req.body);
 if(!validDay(d.day))fail(422,'Neispravan datum.');
 if(d.updatedProgress!==undefined&&!d.activityId)fail(422,'Promena napretka zahteva izabranu aktivnost.');
 // Allow a standalone daily report even when no activity is assigned.
 let projectId=null,activityId=null;
 if(d.activityId){
  const {activity,project}=await activityAccess(req.user,d.activityId);
  if(!activity.assignees.some(x=>same(x,req.user._id))&&!managing(req.user,project.sector))fail(403,'Dnevni unos je moguć samo za sopstvenu aktivnost.');
  projectId=project._id;activityId=activity._id;
  if(d.projectId&&!same(d.projectId,projectId))fail(422,'Aktivnost ne pripada izabranom projektu.');
  if(d.updatedProgress!==undefined){
   const status=d.updatedProgress===100&&activity.status!=='completed'?'review':activity.status;
   const changed=d.updatedProgress!==activity.progress||status!==activity.status;
   if(changed&&(project.archived||['completed','cancelled'].includes(project.status)))fail(409,'Ponovo aktivirajte projekat pre promene napretka.');
   if(activity.status==='completed'&&d.updatedProgress<100)fail(409,'Završena aktivnost ne može se vratiti na manji napredak dnevnim unosom.');
   if(changed){activity.progress=d.updatedProgress;activity.status=status;
    await activity.save();await updateProjectProgress(project._id);}}
 }else if(d.projectId){
  const p=await projectAccess(req.user,d.projectId);projectId=p._id;
 }
 const item=await WorkLog.create({user:req.user._id,sector:req.user.sector||undefined,project:projectId,activity:activityId,
  day:d.day,done:d.done,nextSteps:d.nextSteps,blockers:d.blockers,minutes:d.minutes,updatedProgress:d.updatedProgress});
 await audit(req,'worklog.created','WorkLog',item._id,{day:item.day,activity:activityId});
 if(d.blockers)await notifyManagers(req.user.sector,{type:'worklog_blocker',title:'Prijavljena prepreka',body:d.blockers.slice(0,130),link:activityId?`/activities/${activityId}`:projectId?`/projects/${projectId}`:`/reports?scope=sector&type=daily&day=${d.day}`},req.user._id);
 res.status(201).json({workLog:item});
});
r.get('/mine',async(req,res)=>{
 const {limit,skip,page}=safePage(req.query),filter={user:req.user._id};
 if(req.query.day){if(!validDay(req.query.day))fail(422,'Neispravan datum.');filter.day=req.query.day;}
 const [items,total]=await Promise.all([WorkLog.find(filter).sort({day:-1,createdAt:-1}).skip(skip).limit(limit).populate('project','title').populate('activity','title'),WorkLog.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.get('/team',async(req,res)=>{
 if(req.user.role==='employee')fail(403,'Pregled dnevnih unosa drugih zaposlenih nije dozvoljen.');
 const filter={};if(req.user.role==='manager')filter.sector=req.user.sector;
 if(req.query.sectorId){requireId(req.query.sectorId);if(req.user.role==='manager'&&!same(req.user.sector,req.query.sectorId))fail(403,'Drugi sektor.');filter.sector=req.query.sectorId;}
 if(req.query.day){if(!validDay(req.query.day))fail(422,'Neispravan datum.');filter.day=req.query.day;}
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([WorkLog.find(filter).sort({createdAt:-1}).skip(skip).limit(limit).populate('user','firstName lastName').populate('activity','title'),WorkLog.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.get('/compliance',async(req,res)=>{
 if(!['manager','president','admin'].includes(req.user.role))fail(403,'Nedozvoljeno.');
 const day=req.query.day||belgradeDay();if(!validDay(day))fail(422,'Neispravan datum.');
 const sectorId=req.user.role==='manager'?req.user.sector:req.query.sectorId;
 if(!sectorId)fail(422,'Izaberite sektor.');requireId(String(sectorId));
 const employees=await User.find({sector:sectorId,approval:'approved',role:{$in:['employee','manager']}}).select('firstName lastName');
 const logged=await WorkLog.distinct('user',{sector:sectorId,day});
 res.json({day,submitted:employees.filter(x=>logged.some(u=>same(u,x._id))),missing:employees.filter(x=>!logged.some(u=>same(u,x._id)))});
});
export default r;
