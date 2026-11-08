import {Project,Activity} from '../models/index.js';
export function averageProgress(items){if(!items.length)return 0;return Math.round(items.reduce((sum,a)=>sum+a.progress,0)/items.length);}
const pending=new Map();
export async function updateProjectProgress(projectId){
 // Serialize recalculation within this API instance: a slower earlier read must
 // not overwrite a newer activity update with its old average.
 const key=String(projectId),previous=pending.get(key)||Promise.resolve();
 const current=previous.catch(()=>{}).then(async()=>{
  const activities=await Activity.find({project:projectId}).select('progress');
  const progress=averageProgress(activities);
  await Project.updateOne({_id:projectId},{$set:{progress}});return progress;
 });
 pending.set(key,current);
 try{return await current;}finally{if(pending.get(key)===current)pending.delete(key);}
}
