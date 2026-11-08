import {User,Sector,Project,Activity,Idea,Assignment,DecisionRequest} from '../models/index.js';
import {fail} from './errors.js';
import {requireId,same,inRefs} from './utils.js';

export const omniscient=u=>['president','admin'].includes(u.role);
export const managing=(u,sector)=>omniscient(u)||(u.role==='manager'&&!!u.sector&&!!sector&&same(u.sector,sector));
export function requireSectorScope(req,_res,next){
 if(!omniscient(req.user)&&!req.user.sector)return next(Object.assign(new Error('Nalog nema dodeljen sektor.'),{status:403}));
 next();
}
export const projectMember=(u,p)=>inRefs(p.members,u._id)||same(p.owner,u._id);
export function canReadProject(u,p){return managing(u,p.sector)||(u.role==='employee'&&!!u.sector&&same(u.sector,p.sector)&&projectMember(u,p));}
export async function sectorAccess(u,id,write=false){
 requireId(id);const sector=await Sector.findById(id);if(!sector)fail(404,'Sektor nije pronađen.');
 if(write?!managing(u,id):!(omniscient(u)||same(u.sector,id)))fail(403,'Nemate pristup sektoru.');
 return sector;
}
export async function projectAccess(u,id,write=false){
 requireId(id);const p=await Project.findById(id);if(!p)fail(404,'Projekat nije pronađen.');
 if(write?!managing(u,p.sector):!canReadProject(u,p))fail(403,'Nemate pristup projektu.');
 return p;
}
export async function activityAccess(u,id,write=false){
 requireId(id);const a=await Activity.findById(id);if(!a)fail(404,'Aktivnost nije pronađena.');
 const p=await Project.findById(a.project);
 if(!p||!canReadProject(u,p))fail(403,'Nemate pristup aktivnosti.');
 if(write && !(managing(u,p.sector)||inRefs(a.assignees,u._id)))fail(403,'Možete menjati samo svoje aktivnosti.');
 return {activity:a,project:p};
}
export async function ideaAccess(u,id,write=false){
 requireId(id);const idea=await Idea.findById(id);if(!idea)fail(404,'Ideja nije pronađena.');
 const allowed=omniscient(u) ? (u.role!=='president'||['forwarded','approved','rejected'].includes(idea.status)) :
  same(idea.author,u._id)||(u.role==='manager'&&same(idea.sector,u.sector));
 if(!allowed)fail(403,'Nemate pristup ideji.');
 if(write && !same(idea.author,u._id))fail(403,'Samo autor uređuje ideju.');
 return idea;
}
export async function assignmentAccess(u,id){
 requireId(id);const assignment=await Assignment.findById(id);if(!assignment)fail(404,'Zaduženje nije pronađeno.');
 if(!(omniscient(u)||same(assignment.assignedTo,u._id)))fail(403,'Nemate pristup zaduženju.');
 return assignment;
}
export async function requestAccess(u,id){
 requireId(id);const request=await DecisionRequest.findById(id);if(!request)fail(404,'Zahtev ne postoji.');
 if(!(omniscient(u)||(u.role==='manager'&&same(u.sector,request.sector))))fail(403,'Nemate pristup ovom zahtevu.');
 return request;
}
export async function targetAccess(u,type,id,write=false){
 if(type==='sector'){
  const s=await sectorAccess(u,id);
  if(write&&!managing(u,s._id))fail(403,'Komentarisanje sektora nije dozvoljeno.');
  return s;
 }
 if(type==='project')return projectAccess(u,id);
 if(type==='activity')return (await activityAccess(u,id)).activity;
 if(type==='idea')return ideaAccess(u,id);
 if(type==='assignment')return assignmentAccess(u,id);
 if(type==='request')return requestAccess(u,id);
 fail(422,'Nepoznati tip sadržaja.');
}
export async function validateTeam(ids,sectorId){
 const unique=[...new Set(ids.map(String))];
 if(!unique.length)return unique;
 const users=await User.find({_id:{$in:unique},sector:sectorId,approval:'approved',role:{$in:['employee','manager']}});
 if(users.length!==unique.length)fail(422,'Svi članovi tima moraju biti aktivni korisnici iz izabranog sektora.');
 return unique;
}
export async function managerRecipients(sectorId){return User.find({sector:sectorId,role:'manager',approval:'approved'}).select('_id');}
