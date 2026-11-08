import 'dotenv/config';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as models from '../../src/models/index.js';
import {planCompanySeed,applyCompanySeed,companySeedProjection,legacySeedId} from '../../src/services/company-seed.js';
if(process.env.ZEPTER_COMPANY_DB_TEST!=='1')throw Error('Enable the isolated company database check explicitly.');
const uri=new URL(process.env.MONGODB_URI||'');
if(uri.protocol!=='mongodb:'||!['localhost','127.0.0.1'].includes(uri.hostname)||uri.username||uri.password)throw Error('Expected a local MongoDB server.');
const name='zepter_company_test_'+crypto.randomBytes(8).toString('hex');uri.pathname='/'+name;uri.search='';
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
async function snapshot(){const data={};for(const [key,projection]of Object.entries(companySeedProjection))data[key]=await models[key].find().select(projection).lean();return data;}
try{
 await mongoose.connect(uri.href,{serverSelectionTimeoutMS:10000});
 const sid=new mongoose.Types.ObjectId(legacySeedId('sector','DEMO_IT'));
 const sector=await models.Sector.create({_id:sid,name:'DEMO | IT',code:'DEMO_IT'});
 const user=await models.User.create({firstName:'Demo',lastName:'Predsednik',email:'predsednik@demo.zepter.test',passwordHash:'synthetic-not-for-login',role:'president',approval:'approved'});
 const project=await models.Project.create({_id:legacySeedId('project','DEMO_IT:p0'),sector:sid,title:'DEMO | Migracija CMS platforme',status:'active',owner:user._id,members:[user._id],progress:47});
 const activity=await models.Activity.create({sector:sid,project:project._id,title:'DEMO | Pregled',assignees:[user._id],progress:25,status:'blocked',actualWork:'Zabeležen rad',dueDate:new Date('2026-11-20T12:00Z')});
 const stamp=new Date('2026-11-07T12:00Z');
 const report=await models.Report.create({sector:sid,scope:'sector',type:'daily',periodStart:'2026-11-07',periodEnd:'2026-11-07',status:'published',createdBy:user._id,generated:{generatedAt:stamp,stats:{projects:1,avgProgress:47},projects:[{id:project._id,title:'DEMO | Migracija CMS platforme'}]}});
 const link=await models.PresidentAccessLink.create({user:user._id,tokenHash:'0'.repeat(64),generation:5});
 const beforeProject=await models.Project.findById(project._id).lean();
 await applyCompanySeed(planCompanySeed(await snapshot()),models);
 const changedUser=await models.User.findById(user._id).select('+passwordHash').lean(),changedProject=await models.Project.findById(project._id).lean(),changedActivity=await models.Activity.findById(activity._id).lean(),changedReport=await models.Report.findById(report._id).lean(),changedLink=await models.PresidentAccessLink.findById(link._id).select('+tokenHash').lean();
 check(await models.Sector.countDocuments()===12,'Twelve unique company sectors.');
 check((await models.Sector.findById(sector._id)).code==='IT','The original sector ID is retained.');
 check(changedUser.firstName==='Philip'&&changedUser.email==='predsednik@zepter.test','Display name and local email updated.');
 check(changedUser.passwordHash===user.passwordHash&&changedUser.role===user.role&&changedUser.approval===user.approval,'Credentials and privileges preserved.');
 check(String(changedProject.owner)===String(user._id)&&changedProject.progress===47&&changedProject.status==='active','Project owner/status/progress preserved.');
 check(changedProject.updatedAt.getTime()===beforeProject.updatedAt.getTime(),'A label cleanup does not fabricate a work-update timestamp.');
 check(changedActivity.actualWork==='Zabeležen rad'&&changedActivity.progress===25&&changedActivity.status==='blocked','Actual work preserved.');
 check(String(changedActivity.project)===String(project._id)&&String(changedActivity.assignees[0])===String(user._id),'Assignment/reference preserved.');
 check(changedReport.generated.generatedAt instanceof Date&&changedReport.generated.generatedAt.getTime()===stamp.getTime(),'Mixed snapshot date type preserved.');
 check(String(changedReport.generated.projects[0].id)===String(project._id)&&changedReport.generated.stats.avgProgress===47,'Report references and results preserved.');
 check(changedLink.tokenHash===link.tokenHash&&changedLink.generation===5,'Personal link remains unchanged.');
 check(planCompanySeed(await snapshot()).length===0,'Second run has no changes or duplicates.');
 console.log('PASS '+checks+' isolated MongoDB company-seed checks.');
}finally{
 if(mongoose.connection.readyState){if(mongoose.connection.name!==name||!/^zepter_company_test_[a-f0-9]{16}$/.test(name))throw Error('Refusing to drop an unexpected database.');await mongoose.connection.dropDatabase();}
 await mongoose.disconnect();
}
