import {Router} from 'express';
import {Report,Project,User} from '../models/index.js';
import {authorizeReport,generateReport} from '../services/reports.js';
import {schemas} from '../lib/validation.js';
import {managing,sectorAccess,omniscient} from '../lib/access.js';
import {belgradeDay,periodRange,requireId,same,safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';
import {allow} from '../lib/auth.js';
import {audit,notify} from '../services/events.js';
import {presidentReport,presidentReportOptions} from '../services/president-reports.js';
const r=Router();
r.get('/president/options',allow('president'),async(req,res)=>res.json(await presidentReportOptions(req.user,req.query)));
r.get('/president',allow('president'),async(req,res)=>res.json(await presidentReport(req.user,req.query)));
const checkVersion=(req,report)=>{
 const version=req.get('If-Match');
 if(version&&(!report||version!==`"${report.updatedAt?.toISOString()}"`))fail(409,'Izveštaj je u međuvremenu promenjen. Proverite sačuvanu verziju pre nastavka.');
 return version?{updatedAt:report.updatedAt}:{};
};
r.get('/prepare',allow('manager'),async(req,res)=>{
 if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');
 const sector=await sectorAccess(req.user,String(req.user.sector));
 const type=req.query.type||'daily',day=req.query.day||belgradeDay(),{start,end}=periodRange(type,day);
 const report=await Report.findOne({sector:sector._id,type,periodStart:start});
 const generated=report?(report.generated||null):await generateReport({scope:'sector',id:String(sector._id),type,day});
 res.set('Cache-Control','no-store').json({report,generated,period:{type,start,end},sector:{_id:sector._id,name:sector.name}});
});
r.get('/preview',async(req,res)=>{
 const {scope='company',id,type='daily',day=belgradeDay()}=req.query;
 await authorizeReport(req.user,scope,id);
 res.json({report:await generateReport({scope,id,type,day})});
});
r.get('/',async(req,res)=>{
 const filter={};
 if(req.user.role==='employee')fail(403,'Sektorski izveštaji nisu dostupni zaposlenima.');
 if(req.user.role==='manager'){if(!req.user.sector)fail(403,'Nalog nema dodeljen sektor.');filter.sector=req.user.sector;}
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
 const existing=await Report.findOne({sector:d.sectorId,type:d.type,periodStart:start});
 if(req.get('If-None-Match')==='*'&&existing)fail(409,'Izveštaj za ovaj period već postoji. Otvorite sačuvanu verziju.');
 if(existing?.status==='published')fail(409,'Objavljen izveštaj se ne može menjati.');
 const version=checkVersion(req,existing);
 const generated=await generateReport({scope:'sector',id:d.sectorId,type:d.type,day:d.day});
 const fields={generated,results:d.results||'',problems:d.problems||'',nextSteps:d.nextSteps||''};
 let report;
 if(existing){
  report=await Report.findOneAndUpdate({_id:existing._id,status:'draft',...version},{$set:fields},{new:true,runValidators:true});
  if(!report)fail(409,'Izveštaj je promenjen ili objavljen. Vaš unos je ostao u obrascu.');
 }else{
  report=new Report({sector:d.sectorId,type:d.type,periodStart:start,periodEnd:end,createdBy:req.user._id,...fields});
  await report.save();
 }
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
 const version=checkVersion(req,report),d=schemas.reportPatch.parse(req.body);
 const saved=await Report.findOneAndUpdate({_id:report._id,status:'draft',...version},{$set:d},{new:true,runValidators:true});
 if(!saved)fail(409,'Izveštaj je promenjen ili objavljen. Vaš unos je ostao u obrascu.');
 await audit(req,'report.edited','Report',report._id,{fields:Object.keys(d)});res.json({report:saved});
});
r.post('/:id/publish',allow('manager','admin'),async(req,res)=>{
 const report=await Report.findById(requireId(req.params.id));if(!report)fail(404,'Izveštaj ne postoji.');
 if(!managing(req.user,report.sector))fail(403,'Samo rukovodilac sektora objavljuje njegov izveštaj.');
 if(report.status!=='draft')fail(409,'Izveštaj je već objavljen.');
 const version=checkVersion(req,report);
 const generated=await generateReport({scope:'sector',id:String(report.sector),type:report.type,day:report.periodStart});
 const published=await Report.findOneAndUpdate({_id:report._id,status:'draft',...version},{$set:{generated,status:'published',publishedAt:new Date()}},{new:true,runValidators:true});
 if(!published)fail(409,'Izveštaj je promenjen ili već objavljen. Proverite sačuvanu verziju.');
 await audit(req,'report.published','Report',report._id);
 const presidents=await User.find({role:'president',approval:'approved'}).select('_id');
 await notify(presidents.map(x=>x._id),{type:'report_published',title:'Objavljen izveštaj sektora',body:`${report.type==='daily'?'Dnevni':'Nedeljni'} izveštaj za ${report.periodStart}`,link:`/reports/${report._id}`},req.user._id);
 res.json({report:published});
});
export default r;
