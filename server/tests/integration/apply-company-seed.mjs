// Explicitly authorized local migration with a before/after preservation audit.
import 'dotenv/config';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import {execFileSync} from 'node:child_process';
import * as models from '../../src/models/index.js';
if(process.env.ZEPTER_APPLY_COMPANY!=='1')throw Error('Enable ZEPTER_APPLY_COMPANY=1 explicitly.');
if(!/^mongodb:\/\/(127\.0\.0\.1|localhost):27017\/zepter_management_demo(?:\?|$)/.test(process.env.MONGODB_URI||''))throw Error('Expected the existing local database.');
const protectedFields={
 User:'_id +passwordHash role approval sector jobTitle sessionVersion requestedManager approvedBy approvedAt passwordChangedAt createdAt',
 Sector:'_id manager active createdAt',Project:'_id sector status priority dueDate startDate owner members progress archived createdBy createdAt',
 Activity:'_id sector project assignees status progress dueDate priority createdBy createdAt',WorkLog:'_id user sector project activity day minutes updatedProgress createdAt',
 Comment:'_id targetType targetId author parent kind responseStatus addressedTo createdAt',Idea:'_id sector author status reviewedBy forwardedAt revisionCount decision +decisionDelivery createdAt',
 Report:'_id scope sector type periodStart periodEnd status createdBy publishedAt createdAt',Attachment:'_id targetType targetId owner fileName mime size comment uploadId createdAt',
 Assignment:'_id sector assignedTo createdBy dueDate status createdAt',DecisionRequest:'_id sector createdBy type referenceType referenceId status answeredAt createdAt',
 Notification:'_id user actor type link readAt createdAt',PresidentAccessLink:'_id +tokenHash user generation revokedAt expiresAt createdAt',Audit:'_id actor action entity entityId details ip createdAt'
};
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function capture(){const result={};for(const [name,fields]of Object.entries(protectedFields))result[name]=new Map((await models[name].find().select(fields).lean()).map(row=>[String(row._id),digest(row)]));return result;}
try{
 await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:10000});
 const before=await capture();
 const output=execFileSync(process.execPath,['src/scripts/seed-company.js','--apply'],{encoding:'utf8',timeout:60000,env:process.env});process.stdout.write(output);
 const after=await capture();let preserved=0;
 for(const [name,records]of Object.entries(before))for(const [id,hash]of records){if(after[name].get(id)!==hash)throw Error('The preservation check found changed protected fields. Review the private backup before continuing.');preserved++;}
 console.log('PASS: '+preserved+' existing records retain their protected fields, credentials, references and access-link state.');
}finally{await mongoose.disconnect();}
