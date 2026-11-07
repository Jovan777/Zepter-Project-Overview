import {Router} from 'express';
import {Report,Project,User} from '../models/index.js';
import {authorizeReport,generateReport} from '../services/reports.js';
import {schemas} from '../lib/validation.js';
import {managing,sectorAccess,omniscient} from '../lib/access.js';
import {belgradeDay,periodRange,requireId,same,safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {allow} from '../lib/auth.js';
import {audit,notify} from '../services/events.js';
const r=Router();
r.get('/preview',async(req,res)=>{
 const {scope='company',id,type='daily',day=belgradeDay()}=req.query;
 await authorizeReport(req.user,scope,id);
 res.json({report:await generateReport({scope,id,type,day})});
});
r.get('/',async(req,res)=>{
 const filter={};
 if(req.user.role==='employee')fail(403,'Sektorski izveštaji nisu dostupni zaposlenima.');
 if(req.user.role==='manager')filter.sector=req.user.sector;
 else if(req.query.sectorId){requireId(req.query.sectorId);filter.sector=req.query.sectorId;}
 if(req.query.type){if(!['daily','weekly'].includes(req.query.type))fail(422,'Neispravan tip.');filter.type=req.query.type;}
 if(req.user.role==='president')filter.status='published';
 const {limit,skip,page}=safePage(req.query);
 const [items,total]=await Promise.all([Report.find(filter).sort({periodStart:-1}).skip(skip).limit(limit).populate('sector','name'),Report.countDocuments(filter)]);
 res.json({items,total,page,limit});
});
r.post('/',async(req,res)=>{
 if(!['manager','admin'].includes(req.user.role))fail(403,'Samo rukovodioci pripremaju izveštaje sektora.');
 const d=schemas.report.parse(req.body);
 if(!managing(req.user,d.sectorId))fail(403,'Izveštaj drugog sektora nije dostupan.');
 const {start,end}=periodRange(d.type,d.day);
 const generated=await generateReport({scope:'sector',id:d.sectorId,type:d.type,day:d.day});
 const existing=await Report.findOne({sector:d.sectorId,type:d.type,periodStart:start});
 if(existing?.status==='published')fail(409,'Objavljen izveštaj se ne može menjati.');
 const report=existing || new Report({sector:d.sectorId,type:d.type,periodStart:start,periodEnd:end,createdBy:req.user._id});
 report.generated=generated;report.results=d.results||'';report.problems=d.problems||'';report.nextSteps=d.nextSteps||'';
 await report.save();
 await audit(req,'report.draft_saved','Report',report._id,{periodStart:start,type:d.type});res.status(201).json({report});
});
r.get('/:id',async(req,res)=>{
 const report=await Report.findById(requireId(req.params.id));if(!report)fail(404,'Izveštaj ne postoji.');
 if(req.user.role==='employee'||(req.user.role==='manager'&&!same(req.user.sector,report.sector)))fail(403,'Nemate pristup izveštaju.');
 if(req.user.role==='president'&&report.status!=='published')fail(403,'Izveštaj još nije objavljen.');
 res.json({report});
});
r.patch('/:id',allow('manager','admin'),async(req,res)=>{
 const report=await Report.findById(requireId(req.params.id));if(!report)fail(404,'Izveštaj ne postoji.');
 if(!managing(req.user,report.sector)||report.status==='published')fail(403,'Objavljen izveštaj se ne može menjati.');
 const d=schemas.reportPatch.parse(req.body);Object.assign(report,d);await report.save();
 await audit(req,'report.edited','Report',report._id,{fields:Object.keys(d)});res.json({report});
});
r.post('/:id/publish',allow('manager','admin'),async(req,res)=>{
 const report=await Report.findById(requireId(req.params.id));if(!report)fail(404,'Izveštaj ne postoji.');
 if(!managing(req.user,report.sector))fail(403,'Samo rukovodilac sektora objavljuje njegov izveštaj.');
 if(report.status!=='draft')fail(409,'Izveštaj je već objavljen.');
 report.generated=await generateReport({scope:'sector',id:String(report.sector),type:report.type,day:report.periodStart});
 report.status='published';report.publishedAt=new Date();await report.save();
 await audit(req,'report.published','Report',report._id);
 const presidents=await User.find({role:'president',approval:'approved'}).select('_id');
 await notify(presidents.map(x=>x._id),{type:'report_published',title:'Objavljen izveštaj sektora',body:`${report.type==='daily'?'Dnevni':'Nedeljni'} izveštaj za ${report.periodStart}`,link:`/reports/${report._id}`},req.user._id);
 res.json({report});
});
export default r;
