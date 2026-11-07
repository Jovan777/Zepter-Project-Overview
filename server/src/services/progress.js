import {Project,Activity} from '../models/index.js';
export function averageProgress(items){if(!items.length)return 0;return Math.round(items.reduce((sum,a)=>sum+a.progress,0)/items.length);}
export async function updateProjectProgress(projectId){
 const activities=await Activity.find({project:projectId}).select('progress');
 const progress=averageProgress(activities);
 await Project.updateOne({_id:projectId},{$set:{progress}});
 return progress;
}
