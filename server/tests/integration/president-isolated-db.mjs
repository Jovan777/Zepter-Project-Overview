// Explicit temporary database only. The existing demo database is never connected here.
import 'dotenv/config';
import mongoose from 'mongoose';
import {randomBytes,randomUUID} from 'node:crypto';
import {withRoutes} from '../helpers/http.mjs';
if(process.env.ZEPTER_ISOLATED_DB_TEST!=='1')throw Error('Enable ZEPTER_ISOLATED_DB_TEST=1 explicitly.');
const configured=new URL(process.env.MONGODB_URI);
if(!['127.0.0.1','localhost'].includes(configured.hostname)||configured.pathname!=='/zepter_management_demo')throw Error('Expected local demo configuration.');
const prefix='zepter_president_wave02_test_',database=prefix+randomBytes(8).toString('hex');
configured.pathname='/'+database;
delete process.env.VAPID_PUBLIC_KEY;delete process.env.VAPID_PRIVATE_KEY;
let connected=false,checks=0;
function check(value,label){if(!value)throw Error('Check failed: '+label);checks++;}
try{
 await mongoose.connect(configured.href,{serverSelectionTimeoutMS:5000});connected=true;
 if(mongoose.connection.name!==database||!database.startsWith(prefix))throw Error('Unsafe database target.');
 const {User,Sector,Idea,IdeaRead,Comment,Notification,Attachment,Project,Activity,WorkLog,Report}=await import('../../src/models/index.js');
 const {decideIdea,deliverPendingIdeaDecisions}=await import('../../src/services/idea-decisions.js');
 const {presidentIdeas,markPresidentIdeaRead}=await import('../../src/services/president-ideas.js');
 const {generateReport}=await import('../../src/services/reports.js');
 const {presidentReport}=await import('../../src/services/president-reports.js');
 const {presidentAttention,presidentOverview}=await import('../../src/services/president.js');
 await Promise.all([User.init(),Sector.init(),Idea.init(),IdeaRead.init(),Comment.init(),Notification.init(),Attachment.init(),Project.init(),Activity.init(),WorkLog.init(),Report.init()]);
 const sector=await Sector.create({name:'Isolated test sector',code:'ISOLATED_W02'});
 const makeUser=(role,index)=>User.create({firstName:'Test',lastName:role,email:'isolated-'+index+'@fixture.zepter.test',passwordHash:'synthetic-not-for-login',role,approval:'approved',...(role==='president'?{}:{sector:sector._id})});
 const [president,manager,author,otherManager]=await Promise.all([makeUser('president',1),makeUser('manager',2),makeUser('employee',3),makeUser('manager',4)]);
 const proposal=title=>Idea.create({title,description:'Temporary integration data.',sector:sector._id,author:author._id,reviewedBy:manager._id,status:'forwarded',forwardedAt:new Date()});
 const idea=await proposal('Isolated approval'),stamp='"'+idea.updatedAt.toISOString()+'"',body={action:'approve',comment:'Pripremite plan sa rokovima.',requestId:randomUUID()};
 const results=await Promise.all([decideIdea(president,String(idea._id),body,stamp),decideIdea(president,String(idea._id),body,stamp)]);
 check(results.every(x=>x.idea.status==='approved'&&!x.pending),'Concurrent identical decisions finish.');
 const saved=await Idea.findById(idea._id),instruction=await Comment.findOne({targetType:'idea',targetId:idea._id});
 check(saved.decision.note===body.comment&&saved.decision.deliveryStatus==='complete','Real Mongoose stores decision and delivery.');
 check(!saved.toJSON().decisionDelivery,'Private delivery data is absent from JSON.');
 check(await Comment.countDocuments({targetType:'idea',targetId:idea._id})===1,'One instruction in MongoDB.');
 check(instruction.kind==='instruction'&&String(instruction.addressedTo[0])===String(manager._id),'Instruction addresses actual forwarding manager.');
 check(await Notification.countDocuments({user:manager._id,link:'/ideas/'+idea._id})===1,'Forwarding manager receives one notification.');
 check(await Notification.countDocuments({user:otherManager._id,link:'/ideas/'+idea._id})===0,'Other manager is not substituted for the forwarder.');
 check(await Notification.countDocuments({user:author._id,link:'/ideas/'+idea._id})===1,'Author receives status notification.');
 const rejected=await proposal('Isolated rejection');
 const rejection=await decideIdea(president,String(rejected._id),{action:'reject',comment:'',requestId:randomUUID()},'"'+rejected.updatedAt.toISOString()+'"');
 check(rejection.idea.status==='rejected','Rejection without extra comment.');
 let blocked=false;try{await decideIdea(president,String(rejected._id),body,'"'+rejection.idea.updatedAt.toISOString()+'"');}catch(error){blocked=error.status===409;}
 check(blocked,'A rejected idea cannot be reopened.');
 const pending=await proposal('Isolated concurrent choice'),raceStamp='"'+pending.updatedAt.toISOString()+'"';
 const race=await Promise.allSettled(['First','Second'].map(comment=>decideIdea(president,String(pending._id),{action:'approve',comment,requestId:randomUUID()},raceStamp)));
 check(race.filter(x=>x.status==='fulfilled').length===1&&race.some(x=>x.status==='rejected'&&x.reason.status===409),'Two distinct decisions have exactly one winner.');
 check(await Comment.countDocuments({targetType:'idea',targetId:pending._id})===1,'No instruction from losing decision.');
 const unread=await proposal('Isolated unread proposal');
 check((await presidentIdeas(president,{tab:'new'})).total===1,'New marker is backed by actual database state.');
 await Promise.all([markPresidentIdeaRead(president,String(unread._id)),markPresidentIdeaRead(president,String(unread._id))]);
 check(await IdeaRead.countDocuments({user:president._id,idea:unread._id})===1,'Unique personal marker survives concurrent reads.');
 check((await presidentIdeas(president,{tab:'new'})).total===0&&(await presidentIdeas(president,{tab:'review'})).total===1,'New/review filters follow actual read marker.');
 check((await presidentIdeas(president,{tab:'approved'})).total===2&&(await presidentIdeas(president,{tab:'rejected'})).total===1,'Final decision filters.');
 const missingManager=await Sector.create({name:'Isolated sector without a manager',code:'ISOLATED_NO_MANAGER'});
 for(let i=0;i<21;i++)await Idea.create({title:'Isolated undeliverable '+i,description:'Temporary queue record.',sector:missingManager._id,author:author._id,status:'approved',decision:{action:'approve',by:president._id,at:new Date(Date.now()-3600000),note:'Saved instruction.',deliveryStatus:'pending',commentId:new mongoose.Types.ObjectId()},decisionDelivery:{requestId:randomUUID()}});
 const queued=await Idea.create({title:'Isolated deliverable record',description:'This item must not starve behind failed records.',sector:sector._id,author:author._id,reviewedBy:manager._id,status:'approved',decision:{action:'approve',by:president._id,at:new Date(),note:'Deliver this instruction.',deliveryStatus:'pending',commentId:new mongoose.Types.ObjectId()},decisionDelivery:{requestId:randomUUID()}});
 await deliverPendingIdeaDecisions();await deliverPendingIdeaDecisions();
 check((await Idea.findById(queued._id)).decision.deliveryStatus==='complete','An unavailable manager cannot starve other sectors in the recovery queue.');
 const uploadId=randomUUID(),file={targetType:'idea',targetId:idea._id,owner:president._id,comment:instruction._id,uploadId,originalName:'Synthetic.pdf',fileName:'synthetic-not-on-disk.pdf',mime:'application/pdf',size:50};
 const files=await Promise.allSettled([Attachment.create(file),Attachment.create(file)]);
 check(files.filter(x=>x.status==='fulfilled').length===1&&files.some(x=>x.status==='rejected'&&x.reason.code===11000),'Concurrent file keys have one winner.');
 check(await Attachment.countDocuments({owner:president._id,uploadId})===1,'Unique comment upload persisted once.');
 const otherUpload=await Attachment.create({...file,owner:author._id});check(String(otherUpload.comment)===String(instruction._id),'Optional comment reference casts correctly; operation keys belong to their owner.');
 await Attachment.create({...file,uploadId:undefined});await Attachment.create({...file,uploadId:undefined});check(await Attachment.countDocuments({uploadId:{$exists:false}})===2,'Legacy attachments without a key remain compatible.');
 const project=await Project.create({title:'Isolated reporting project',sector:sector._id,owner:manager._id,members:[manager._id,author._id],status:'active',progress:50,archived:false});
 const finished=await Activity.create({title:'Snapshot finished activity',sector:sector._id,project:project._id,status:'completed',progress:100,assignees:[author._id]});
 await WorkLog.create({user:author._id,sector:sector._id,project:project._id,activity:finished._id,day:'2026-11-06',done:'Saved period evidence.',nextSteps:'Review the saved evidence.'});
 const generated=await generateReport({scope:'sector',id:String(sector._id),type:'weekly',day:'2026-11-08'});
 const report=await Report.create({sector:sector._id,type:'weekly',periodStart:'2026-11-02',periodEnd:'2026-11-08',status:'published',generated,results:'Frozen manager results.',publishedAt:new Date()});
 await Activity.updateOne({_id:finished._id},{$set:{status:'in_progress',progress:30}});
 const frozen=await presidentReport(president,{reportId:String(report._id)});
 check(frozen.completedActivities.length===1&&frozen.metrics.completedActivities===1,'Real saved Mixed snapshot does not follow later activity changes.');
 check(String(frozen.results[0].activityId)===String(finished._id),'Saved evidence retains its actual activity destination.');
 check((await presidentReport(president,{scope:'sector',id:String(sector._id),type:'weekly',day:'2026-11-08'})).mode==='published','Exact saved sector period is read from MongoDB.');
 check((await presidentReport(president,{scope:'project',id:String(project._id),type:'weekly',day:'2026-11-09'})).results.length===0,'Another project period has no stale results.');
 const instruction1=await Comment.create({targetType:'sector',targetId:sector._id,author:president._id,kind:'instruction',responseStatus:'answered',body:'Sector answer awaits review.'});
 const instruction2=await Comment.create({targetType:'project',targetId:project._id,author:president._id,kind:'instruction',responseStatus:'answered',body:'Project answer awaits review.'});
 const attention=await presidentAttention(president,{tab:'comments',sectorId:String(sector._id)});
 check(attention.total===2&&attention.items.every(row=>!row.link.includes('undefined')),'Actual populated targets support both sector and project answers.');
 const all=await presidentAttention(president,{}),overview=await presidentOverview(president,{});
 check(all.total===overview.stats.attention,'Real MongoDB attention and home totals agree.');
 check(overview.sectors.items.find(row=>String(row._id)===String(sector._id)).attentionCount===(await presidentAttention(president,{sectorId:String(sector._id)})).total,'Actual sector count includes answer targets.');
 await Comment.updateOne({_id:instruction1._id},{$set:{responseStatus:'resolved'}});
 check((await presidentAttention(president,{tab:'comments'})).total===1,'Resolving an actual instruction removes the pending answer.');
 for(let i=0;i<23;i++)await Comment.create({targetType:'project',targetId:project._id,author:manager._id,body:'Earlier isolated comment '+i,createdAt:new Date('2026-11-01T08:00Z')});
 const {default:commentRoutes}=await import('../../src/routes/comments.js');
 await withRoutes(president,[['/comments',commentRoutes]],async base=>{
  const response=await fetch(base+'/comments?'+new URLSearchParams({targetType:'project',targetId:String(project._id),focus:String(instruction2._id),limit:20})),body=await response.json();
  check(response.ok&&body.page===2&&body.items.some(row=>row._id===String(instruction2._id)),'Real focused pagination finds the authorized comment on a later page.');
  check((await fetch(base+'/comments?'+new URLSearchParams({targetType:'project',targetId:String(project._id),focus:String(instruction1._id)}))).status===404,'Real focus query cannot use another conversation.');
 });
 console.log('PASS '+checks+' real MongoDB checks in a temporary isolated database. Demo data unchanged.');
}catch(error){
 console.error(error.message?.startsWith('Check failed:')?error.message:'Isolated MongoDB check failed ('+error.name+'). No configuration values printed.');process.exitCode=1;
}finally{
 if(connected){
  if(mongoose.connection.name!==database||!database.startsWith(prefix)||database==='zepter_management_demo')throw Error('Refusing unsafe database cleanup.');
  await mongoose.connection.dropDatabase();console.log('Only this test’s temporary database was removed.');
 }
 await mongoose.disconnect();
}
