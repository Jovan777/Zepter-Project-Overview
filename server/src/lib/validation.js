import {z} from 'zod';
const id=z.string().regex(/^[0-9a-fA-F]{24}$/);
const str=(n=4000)=>z.string().trim().min(1).max(n);
const maybe=(n=4000)=>z.string().trim().max(n).optional();
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const progress=z.number().min(0).max(100);
const projectStatus=z.enum(['planned','active','at_risk','on_hold','completed','cancelled']);
const activityStatus=z.enum(['planned','in_progress','review','blocked','completed']);
export const schemas={
 register:z.strictObject({firstName:str(80),lastName:str(80),email:z.email(),password:z.string().min(12).max(128),jobTitle:str(150),sectorId:id,requestedManager:z.boolean().default(false)}),
 login:z.strictObject({email:z.email(),password:z.string().min(1)}),
 changePassword:z.strictObject({oldPassword:str(128),newPassword:z.string().min(12).max(128)}),
 sector:z.strictObject({name:str(120),code:z.string().regex(/^[A-Za-z0-9_-]{2,20}$/),description:maybe(1500)}),
 sectorPatch:z.strictObject({name:str(120).optional(),description:maybe(1500),active:z.boolean().optional()}),
 approval:z.strictObject({role:z.enum(['employee','manager']),sectorId:id.optional()}),
 adminUserPatch:z.strictObject({firstName:str(80).optional(),lastName:str(80).optional(),jobTitle:maybe(150),role:z.enum(['employee','manager']).optional(),sectorId:id.optional()}).refine(value=>Object.keys(value).length>0),
 rejection:z.strictObject({reason:maybe(400)}),
 project:z.strictObject({sectorId:id,title:str(220),description:maybe(5000),status:projectStatus.default('planned'),priority:z.enum(['low','medium','high','urgent']).default('medium'),dueDate:day.optional(),startDate:day.optional(),ownerId:id.optional(),memberIds:z.array(id).max(80).default([])}),
 projectPatch:z.strictObject({title:str(220).optional(),description:maybe(5000),status:projectStatus.optional(),priority:z.enum(['low','medium','high','urgent']).optional(),dueDate:day.nullable().optional(),startDate:day.nullable().optional(),ownerId:id.nullable().optional(),memberIds:z.array(id).max(80).optional(),archived:z.boolean().optional()}),
 activity:z.strictObject({title:str(220),description:maybe(5000),assigneeIds:z.array(id).max(30).default([]),status:activityStatus.default('planned'),progress:progress.default(0),dueDate:day.optional(),priority:z.enum(['low','medium','high','urgent']).default('medium')}),
 activityPatch:z.strictObject({title:str(220).optional(),description:maybe(5000),assigneeIds:z.array(id).max(30).optional(),status:activityStatus.optional(),progress:progress.optional(),dueDate:day.nullable().optional(),priority:z.enum(['low','medium','high','urgent']).optional(),actualWork:maybe(5000),nextStep:maybe(4000),blockers:maybe(4000)}),
 employeeUpdate:z.strictObject({status:activityStatus.optional(),progress:progress.optional(),actualWork:maybe(5000),nextStep:maybe(4000),blockers:maybe(4000)}),
 worklog:z.strictObject({day,activityId:id.optional(),projectId:id.optional(),done:str(5000),nextSteps:maybe(4000),blockers:maybe(4000),minutes:z.number().int().min(0).max(1440).optional(),updatedProgress:progress.optional()}),
 comment:z.strictObject({targetType:z.enum(['sector','project','activity','idea','assignment','request']),targetId:id,body:str(4000),kind:z.enum(['comment','instruction']).default('comment'),parentId:id.optional(),addressedTo:z.array(id).max(20).optional()}),
 idea:z.strictObject({title:str(220),description:str(7000),benefit:maybe(4000)}),
 ideaPatch:z.strictObject({title:str(220).optional(),description:str(7000).optional(),benefit:maybe(4000)}),
 review:z.strictObject({action:z.enum(['forward','request_revision']),note:maybe(3000)}),
 presidentIdeaDecision:z.strictObject({action:z.enum(['approve','reject']),comment:z.string().trim().max(4000).default(''),requestId:z.uuid()}).refine(d=>d.action!=='approve'||d.comment.length>0,{message:'Za odobrenje unesite komentar sa narednim koracima.',path:['comment']}),
 report:z.strictObject({sectorId:id,type:z.enum(['daily','weekly']),day,results:maybe(8000),problems:maybe(8000),nextSteps:maybe(8000)}),
 reportPatch:z.strictObject({results:maybe(8000),problems:maybe(8000),nextSteps:maybe(8000)}),
 assignment:z.strictObject({sectorId:id,assignedTo:id,title:str(220),description:maybe(4000),dueDate:day.optional()}),
 assignmentPatch:z.strictObject({status:z.enum(['new','in_progress','blocked','done']),response:maybe(4000)}),
 decision:z.strictObject({title:str(220),description:str(4000),type:z.enum(['question','approval','problem']),referenceType:z.enum(['sector','project','activity']).default('sector'),referenceId:id.optional()}),
 decisionResponse:z.strictObject({status:z.enum(['answered','closed']),decision:str(4000)}),
 push:z.strictObject({endpoint:z.url().max(2000),keys:z.strictObject({p256dh:str(300),auth:str(150)})})
};
export {id};
