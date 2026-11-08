import {User,Sector,Session,Project,Activity,Assignment,DecisionRequest,Idea} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {same} from '../lib/utils.js';
import {audit,disconnectUserSockets} from './events.js';

// Serialize administrative changes within this API instance. Sector leadership
// is additionally claimed atomically; user writes always compare their version.
let tail=Promise.resolve();
export function adminChange(task){const next=tail.then(task,task);tail=next.catch(()=>{});return next;}
export function checkAdminVersion(req,row){
 const version=req.get('If-Match');
 if(version&&version!==`"${row.updatedAt?.toISOString()}"`)fail(409,'Podaci su u međuvremenu promenjeni. Proverite trenutno stanje pre nastavka.');
}
export async function checkSectorTransfer(user,sectorId,role){
 const transfer=!same(user.sector,sectorId),demotion=user.role==='manager'&&role!=='manager';
 if(transfer){
  const [project,activity,idea]=await Promise.all([
   Project.exists({$or:[{owner:user._id},{members:user._id}]}),Activity.exists({assignees:user._id}),
   Idea.exists({author:user._id,status:{$in:['submitted','in_review','revision_requested']}})
  ]);
  if(project||activity||idea)fail(409,'Pre promene sektora potrebno je razrešiti članstvo i odgovornosti u projektima, dodeljene aktivnosti i ideje na razmatranju. Postojeći podaci nisu menjani.');
 }
 if(transfer||demotion){
  const [assignment,request]=await Promise.all([Assignment.exists({assignedTo:user._id,status:{$ne:'done'}}),DecisionRequest.exists({createdBy:user._id,status:'open'})]);
  if(assignment||request)fail(409,'Korisnik ima otvorena predsednička zaduženja ili zahteve. Razrešite ih pre promene sektora ili rukovodeće uloge.');
 }
}
export async function changeManagedUser(req,id,action,data={}){
 return adminChange(async()=>{
  const user=await User.findById(id);if(!user)fail(404,'Korisnik nije pronađen.');
  if(['admin','president'].includes(user.role))fail(403,'Administratorski i predsednički nalog ne menjaju se ovim postupkom.');
  checkAdminVersion(req,user);
  const permitted={approve:['pending','rejected'],reject:['pending'],disable:['approved','disabled'],activate:['disabled'],edit:['approved','disabled']};
  if(!permitted[action]?.includes(user.approval))fail(409,'Status naloga se promenio ili ova radnja nije dostupna. Proverite trenutno stanje.');
  const next={};
  if(action==='approve')Object.assign(next,{role:data.role,sector:data.sectorId||user.sector,approval:'approved',approvedBy:req.user._id,approvedAt:new Date()});
  if(action==='reject')next.approval='rejected';
  if(action==='disable')next.approval='disabled';
  if(action==='activate')next.approval='approved';
  if(action==='edit'){
   for(const key of ['firstName','lastName','jobTitle','role'])if(data[key]!==undefined)next[key]=data[key];
   if(data.sectorId!==undefined)next.sector=data.sectorId;
  }
  const role=next.role||user.role,sectorId=next.sector||user.sector,approval=next.approval||user.approval;
  const rightsChanged=role!==user.role||!same(sectorId,user.sector)||approval!==user.approval;
  let sector,claimed=false;
  if(['approve','activate'].includes(action)||(action==='edit'&&rightsChanged)){
   sector=sectorId?await Sector.findById(sectorId):null;
   if(!sector?.active)fail(422,'Izaberite aktivan sektor.');
   if(action==='edit')await checkSectorTransfer(user,sectorId,role);
  }
  try{
   if(approval==='approved'&&role==='manager'&&sector){
    if(sector.manager&&!same(sector.manager,user._id)||await User.exists({_id:{$ne:user._id},sector:sectorId,role:'manager',approval:'approved'}))fail(409,'Sektor već ima aktivnog rukovodioca. Izaberite zaposlenog ili drugi sektor.');
    if(!same(sector.manager,user._id)){
     const taken=await Sector.findOneAndUpdate({_id:sectorId,active:true,$or:[{manager:null},{manager:user._id}]},{$set:{manager:user._id}},{returnDocument:'after'});
     if(!taken)fail(409,'Sektor je u međuvremenu dobio rukovodioca ili je deaktiviran.');
     claimed=true;
    }
   }
   if(rightsChanged)next.sessionVersion=(user.sessionVersion||0)+1;
   const changed=await User.findOneAndUpdate({_id:user._id,updatedAt:user.updatedAt,role:user.role,approval:user.approval},{$set:next},{returnDocument:'after',runValidators:true});
   if(!changed)fail(409,'Nalog je u međuvremenu promenjen. Proverite trenutno stanje.');
   // From here the new version already invalidates access and refresh tokens,
   // including a concurrent refresh that persisted after session revocation.
   claimed=false;
   if(user.role==='manager'&&(role!=='manager'||approval!=='approved'||!same(user.sector,sectorId)))await Sector.updateMany({manager:user._id,...(role==='manager'&&approval==='approved'?{_id:{$ne:sectorId}}:{})},{$unset:{manager:1}});
   if(rightsChanged||action==='disable'){
    await Session.updateMany({user:user._id,revokedAt:null},{$set:{revokedAt:new Date()}});
    disconnectUserSockets(user._id);
   }
   const actions={approve:'approved',reject:'rejected',disable:'disabled',activate:'activated',edit:'updated'};
   await audit(req,'admin.user_'+actions[action],'User',user._id,{role,sectorId,changedFields:Object.keys(next).filter(key=>key!=='sessionVersion'),...(data.reason?{reason:data.reason}:{})});
   return changed;
  }catch(error){
   if(claimed)await Sector.updateOne({_id:sectorId,manager:user._id},{$unset:{manager:1}});
   throw error;
  }
 });
}
