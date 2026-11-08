import {WorkLog,Project,Activity,User,Report} from '../models/index.js';
import {periodRange} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {same,hasRole} from '../lib/utils.js';
import {projectAccess,sectorAccess,omniscient} from '../lib/access.js';
import {managerDayStart} from './manager.js';

export async function authorizeReport(user,scope,id){
 if(!['company','sector','project','employee'].includes(scope))fail(422,'Nepoznat nivo izveštaja.');
 if(user.role==='employee' && (scope!=='employee'||!same(id,user._id)))fail(403,'Zaposleni vidi samo svoj lični pregled rada.');
 if(scope==='company'&& !omniscient(user))fail(403,'Izveštaj kompanije je dostupan predsedniku.');
 if(scope==='sector')await sectorAccess(user,id);
 if(scope==='project')await projectAccess(user,id);
 if(scope==='employee'){
  if(!id)fail(422,'Nedostaje ID zaposlenog.');
  if(!omniscient(user)&&!same(user._id,id)&&!(user.role==='manager'&&(await User.findById(id))?.sector?.equals(user.sector)))fail(403,'Nemate pristup izveštaju zaposlenog.');
 }
}
export async function generateReport({scope,id,type,day,now=new Date()}){
 const {start,end}=periodRange(type,day);
 let projectsFilter={},logsFilter={day:{$gte:start,$lte:end}};
 if(scope==='sector'){projectsFilter.sector=id;logsFilter.sector=id;}
 if(scope==='project'){projectsFilter._id=id;logsFilter.project=id;}
 if(scope==='employee'){logsFilter.user=id;}
 const projects=scope==='employee'?await Project.find({$or:[{members:id},{owner:id}]}).select('_id title sector status progress dueDate archived'):
  await Project.find(projectsFilter).select('_id title sector status progress dueDate archived');
 const projectIds=projects.map(x=>x._id);
 const activities=scope==='employee' ? await Activity.find({assignees:id}).select('title project status progress dueDate'):
  await Activity.find({project:{$in:projectIds}}).select('title project status progress dueDate');
 const logs=await WorkLog.find(logsFilter).sort({day:-1}).populate('user','firstName lastName').populate('project','title').populate('activity','title').lean();
 const generatedAt=now,todayStart=managerDayStart(generatedAt);
 const stats={projects:projects.length,activities:activities.length,completedActivities:activities.filter(x=>x.status==='completed').length,
   blockedActivities:activities.filter(x=>x.status==='blocked').length,lateActivities:activities.filter(x=>x.dueDate&&x.dueDate<todayStart&&x.status!=='completed').length,
   avgProgress:projects.length?Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length):0,workEntries:logs.length};
 const context=x=>({day:x.day,employee:x.user?`${x.user.firstName} ${x.user.lastName}`:'',project:x.project?.title,activity:x.activity?.title,projectId:x.project?._id,activityId:x.activity?._id});
 const completed=logs.filter(x=>x.done).map(x=>({...context(x),text:x.done}));
 const blockers=logs.filter(x=>x.blockers).map(x=>({...context(x),text:x.blockers}));
 const nextSteps=logs.filter(x=>x.nextSteps).map(x=>({...context(x),text:x.nextSteps}));
 const openProjects=new Set(projects.filter(p=>!p.archived&&!['completed','cancelled'].includes(p.status)).map(p=>String(p._id)));
 const snapshotRow=a=>({id:a._id,title:a.title,projectId:a.project,project:projects.find(p=>String(p._id)===String(a.project))?.title,progress:a.progress,dueDate:a.dueDate});
 const activitySnapshot={asOf:generatedAt.toISOString(),completed:activities.filter(a=>a.status==='completed').map(snapshotRow),late:activities.filter(a=>a.status!=='completed'&&a.dueDate&&a.dueDate<todayStart&&openProjects.has(String(a.project))).map(snapshotRow)};
 stats.lateActivities=activitySnapshot.late.length;
 const publishedSectorReports=(scope==='company')?await Report.find({status:'published',periodStart:start,type}).select('sector results problems nextSteps'):[];
 return {scope,targetId:id||null,type,periodStart:start,periodEnd:end,generatedAt:generatedAt.toISOString(),activitySnapshot,stats,projects:projects.map(p=>({id:p._id,title:p.title,status:p.status,progress:p.progress})),
  completed,blockers,nextSteps,publishedSectorReports:publishedSectorReports.map(r=>({sectorId:r.sector,results:r.results,problems:r.problems,nextSteps:r.nextSteps}))};
}
