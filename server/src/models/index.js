import mongoose from 'mongoose';
const {Schema, model, models} = mongoose;
const O = Schema.Types.ObjectId;
const opts={timestamps:true,versionKey:false};
const ref=(name,required=false)=>({type:O,ref:name,required});
const txt=(max=2000)=>({type:String,trim:true,maxlength:max});

const userSchema=new Schema({
 firstName:{...txt(80),required:true},lastName:{...txt(80),required:true},
 email:{type:String,trim:true,lowercase:true,required:true,unique:true,index:true},
 passwordHash:{type:String,required:true,select:false},jobTitle:txt(150),sector:ref('Sector'),
 role:{type:String,enum:['employee','manager','president','admin'],default:'employee',index:true},
 approval:{type:String,enum:['pending','approved','rejected','disabled'],default:'pending',index:true},
 requestedManager:{type:Boolean,default:false},approvedBy:ref('User'),approvedAt:Date,
 lastLoginAt:Date,passwordChangedAt:Date,sessionVersion:{type:Number,default:0}
},opts);
userSchema.set('toJSON',{transform(_doc,ret){delete ret.passwordHash; return ret;}});
export const User=models.User || model('User',userSchema);

const sectorSchema=new Schema({name:{...txt(120),required:true,unique:true},code:{type:String,uppercase:true,trim:true,unique:true},description:txt(1500),manager:ref('User'),active:{type:Boolean,default:true}},opts);
export const Sector=models.Sector || model('Sector',sectorSchema);

const projectSchema=new Schema({
 sector:{...ref('Sector',true),index:true},title:{...txt(220),required:true},description:txt(5000),
 status:{type:String,enum:['planned','active','at_risk','on_hold','completed','cancelled'],default:'planned',index:true},
 priority:{type:String,enum:['low','medium','high','urgent'],default:'medium'},
 dueDate:Date,startDate:Date,owner:ref('User'),members:[ref('User')],
 progress:{type:Number,min:0,max:100,default:0},archived:{type:Boolean,default:false},
 createdBy:ref('User')
},opts);
projectSchema.index({sector:1,status:1,dueDate:1});
export const Project=models.Project || model('Project',projectSchema);

const activitySchema=new Schema({
 sector:{...ref('Sector',true),index:true},project:{...ref('Project',true),index:true},
 title:{...txt(220),required:true},description:txt(5000),assignees:[ref('User')],
 status:{type:String,enum:['planned','in_progress','review','blocked','completed'],default:'planned',index:true},
 progress:{type:Number,min:0,max:100,default:0},dueDate:Date,priority:{type:String,enum:['low','medium','high','urgent'],default:'medium'},
 actualWork:txt(5000),nextStep:txt(4000),blockers:txt(4000),createdBy:ref('User')
},opts);
activitySchema.index({sector:1,project:1,status:1});
export const Activity=models.Activity || model('Activity',activitySchema);

const workLogSchema=new Schema({
 user:{...ref('User',true),index:true},sector:{...ref('Sector',true),index:true},
 project:ref('Project'),activity:ref('Activity'),day:{type:String,required:true,match:/^\d{4}-\d{2}-\d{2}$/},
 done:{...txt(5000),required:true},nextSteps:txt(4000),blockers:txt(4000),minutes:{type:Number,min:0,max:1440},
 updatedProgress:{type:Number,min:0,max:100}
},opts);
workLogSchema.index({user:1,day:1,activity:1});
export const WorkLog=models.WorkLog || model('WorkLog',workLogSchema);

const commentSchema=new Schema({
 targetType:{type:String,enum:['sector','project','activity','idea','assignment','request'],required:true,index:true},
 targetId:{type:O,required:true,index:true},author:{...ref('User',true),index:true},
 parent:ref('Comment'),body:{...txt(4000),required:true},
 kind:{type:String,enum:['comment','instruction'],default:'comment'},
 responseStatus:{type:String,enum:['open','answered','resolved'],default:'open'},
 addressedTo:[ref('User')]
},opts);
commentSchema.index({targetType:1,targetId:1,createdAt:1});
export const Comment=models.Comment || model('Comment',commentSchema);

const ideaSchema=new Schema({
 title:{...txt(220),required:true},description:{...txt(7000),required:true},benefit:txt(4000),
 sector:{...ref('Sector',true),index:true},author:{...ref('User',true),index:true},
 status:{type:String,enum:['submitted','in_review','revision_requested','forwarded','approved','rejected'],default:'submitted',index:true},
 reviewNote:txt(3000),reviewedBy:ref('User'),forwardedAt:Date,revisionCount:{type:Number,default:0},
 decision:{type:new Schema({action:{type:String,enum:['approve','reject'],required:true},by:ref('User',true),at:{type:Date,required:true},note:txt(4000),commentId:O,deliveryStatus:{type:String,enum:['pending','complete'],required:true}},{_id:false}),default:undefined},
 decisionDelivery:{type:Schema.Types.Mixed,select:false}
},opts);
ideaSchema.index({'decision.deliveryStatus':1,'decisionDelivery.lastAttemptAt':1,'decision.at':1});
ideaSchema.set('toJSON',{transform(_doc,ret){delete ret.decisionDelivery;return ret;}});
export const Idea=models.Idea || model('Idea',ideaSchema);
export {IdeaRead} from './idea-read.js';

const reportSchema=new Schema({
 scope:{type:String,enum:['sector'],default:'sector'},sector:{...ref('Sector',true),index:true},
 type:{type:String,enum:['daily','weekly'],required:true},periodStart:{type:String,required:true},periodEnd:{type:String,required:true},
 status:{type:String,enum:['draft','published'],default:'draft',index:true},
 generated:{type:Schema.Types.Mixed},results:txt(8000),problems:txt(8000),nextSteps:txt(8000),
 createdBy:ref('User'),publishedAt:Date
},opts);
reportSchema.index({sector:1,type:1,periodStart:1},{unique:true});
export const Report=models.Report || model('Report',reportSchema);

const decisionSchema=new Schema({
 sector:{...ref('Sector',true),index:true},createdBy:{...ref('User',true),index:true},
 title:{...txt(220),required:true},description:{...txt(4000),required:true},
 type:{type:String,enum:['question','approval','problem'],required:true},
 referenceType:{type:String,enum:['sector','project','activity'],default:'sector'},referenceId:O,
 status:{type:String,enum:['open','answered','closed'],default:'open',index:true},decision:txt(4000),answeredAt:Date
},opts);
export const DecisionRequest=models.DecisionRequest || model('DecisionRequest',decisionSchema);

const assignmentSchema=new Schema({
 sector:{...ref('Sector',true),index:true},assignedTo:{...ref('User',true),index:true},
 title:{...txt(220),required:true},description:txt(4000),dueDate:Date,
 status:{type:String,enum:['new','in_progress','blocked','done'],default:'new',index:true},
 response:txt(4000),createdBy:ref('User')
},opts);
export const Assignment=models.Assignment || model('Assignment',assignmentSchema);

const notificationSchema=new Schema({
 user:{...ref('User',true),index:true},actor:ref('User'),
 type:{type:String,required:true},title:{...txt(200),required:true},body:txt(600),
 link:{type:String,required:true,maxlength:400},readAt:Date
},opts);
notificationSchema.index({user:1,createdAt:-1});
export const Notification=models.Notification || model('Notification',notificationSchema);

const attachmentSchema=new Schema({
 targetType:{type:String,enum:['project','activity','idea'],required:true},targetId:{type:O,required:true},
 owner:{...ref('User',true)},originalName:{...txt(255),required:true},fileName:{...txt(255),required:true},
 mime:{type:String,required:true},size:{type:Number,required:true}
},opts);
export const Attachment=models.Attachment || model('Attachment',attachmentSchema);

const auditSchema=new Schema({actor:ref('User'),action:{type:String,required:true},entity:{type:String,required:true},entityId:O,
 details:{type:Schema.Types.Mixed},ip:txt(120)},opts);
auditSchema.index({createdAt:-1});
export const Audit=models.Audit || model('Audit',auditSchema);

const sessionSchema=new Schema({
 user:{...ref('User',true),index:true},tokenHash:{type:String,required:true,unique:true},
 presidentLink:ref('PresidentAccessLink'),presidentLinkGeneration:Number,
 expiresAt:{type:Date,required:true},revokedAt:Date,createdIp:txt(100),device:txt(240)
},opts);
sessionSchema.index({expiresAt:1},{expireAfterSeconds:0});
export const Session=models.Session || model('Session',sessionSchema);
export {PresidentAccessLink} from './president-access-link.js';

const subscriptionSchema=new Schema({user:{...ref('User',true),index:true},endpoint:{type:String,required:true,unique:true},
 keys:{p256dh:String,auth:String}},opts);
export const PushSubscription=models.PushSubscription || model('PushSubscription',subscriptionSchema);
