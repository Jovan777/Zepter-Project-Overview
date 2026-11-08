// Explicit temporary database only. The existing demo database is never connected here.
import 'dotenv/config';
import mongoose from 'mongoose';
import {randomBytes,randomUUID} from 'node:crypto';
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
 const {User,Sector,Idea,IdeaRead,Comment,Notification}=await import('../../src/models/index.js');
 const {decideIdea,deliverPendingIdeaDecisions}=await import('../../src/services/idea-decisions.js');
 const {presidentIdeas,markPresidentIdeaRead}=await import('../../src/services/president-ideas.js');
 await Promise.all([User.init(),Sector.init(),Idea.init(),IdeaRead.init(),Comment.init(),Notification.init()]);
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
