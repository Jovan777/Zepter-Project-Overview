/** Brza end-to-end API provera na pokrenutom lokalnom serveru (bez izmene baze). */
import 'dotenv/config';
import {belgradeDay,periodRange} from '../lib/utils.js';
import {companySectors} from '../data/company-catalog.js';
const base=`http://127.0.0.1:${process.env.PORT||4000}`;
const pass=process.env.LOCAL_TEST_PASSWORD||process.env.DEMO_SEED_PASSWORD;
if(!pass){console.error('Nedostaje lokalna testna lozinka u .env');process.exit(1);}
let passed=0,failed=0;
const sessions=new Set();
async function call(route,token,method='GET',body){
 const response=await fetch(base+route,{method,signal:AbortSignal.timeout(10000),headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(route==='/api/auth/login'&&response.ok){const cookie=response.headers.getSetCookie()[0]?.split(';')[0];if(cookie)sessions.add(cookie);}
 const type=response.headers.get('content-type')||'';
 const data=type.includes('json')?await response.json():null;
 return {status:response.status,data};
}
function verify(name,condition,detail=''){
 if(condition){passed++;console.log('OK  ',name);}else{failed++;console.error('FAIL',name,detail);}
}
async function login(tag){
 const email=`${tag}@zepter.test`;
 const result=await call('/api/auth/login',null,'POST',{email,password:pass});
 verify('Prijava '+tag,result.status===200,result.data?.error);
 return result.data?.accessToken;
}
async function run(){
 const health=await call('/health');verify('MongoDB konekcija',health.data?.ok===true);
 const publicSectors=await call('/api/public/sectors');verify('Sektori kompanije',publicSectors.status===200&&companySectors.every(sector=>publicSectors.data?.items?.some(item=>item.code===sector.code&&item.name===sector.name)));
 const admin=await login('admin');const president=await login('predsednik');const manager=await login('rukovodilac.mkt');const employee=await login('zaposleni1.mkt');
 if(!admin||!president||!manager||!employee)throw Error('Neki lokalni nalog nije uspeo da se prijavi.');
 const d=await call('/api/admin/registrations',admin);verify('Admin vidi prijave koje stvarno cekaju odobrenje',d.status===200&&Array.isArray(d.data.items)&&d.data.items.every(x=>x.approval==='pending'));
 const p=await call('/api/projects',president);verify('Predsednik vidi projekte svih sektora',p.status===200&&p.data.total>=15);
 const e=await call('/api/projects',employee);verify('Zaposleni vidi samo svoje projekte',e.status===200&&e.data.total===3);
 const m=await call('/api/projects',manager);verify('Rukovodilac vidi svoj sektor',m.status===200&&m.data.total===3);
 // A new calendar day need not contain work. Prefer the latest saved period;
 // validate its scope, calendar bounds and data structure, including a valid zero.
 const reports=await call('/api/reports?limit=100',president);
 const day=type=>reports.data?.items?.find(row=>row.type===type)?.periodEnd||belgradeDay();
 const validReport=(result,scope,type,targetId)=>{
  const report=result.data?.report,{start,end}=periodRange(type,day(type));
  return result.status===200&&report?.scope===scope&&report.type===type&&report.periodStart===start&&report.periodEnd===end&&(!targetId||String(report.targetId)===targetId)&&Number.isInteger(report.stats?.workEntries)&&report.stats.workEntries>=0&&Array.isArray(report.projects);
 };
 const reportCompany=await call(`/api/reports/preview?scope=company&type=daily&day=${day('daily')}`,president);
 verify('Dnevni izvestaj kompanije',validReport(reportCompany,'company','daily'));
 const weeklyCompany=await call(`/api/reports/preview?scope=company&type=weekly&day=${day('weekly')}`,president);
 verify('Nedeljni izvestaj kompanije',validReport(weeklyCompany,'company','weekly'));
 const sectorId=publicSectors.data.items.find(x=>x.code==='MKT')?._id;
 const repSector=await call(`/api/reports/preview?scope=sector&id=${sectorId}&type=daily&day=${day('daily')}`,manager);
 verify('Dnevni izvestaj sektora',!!sectorId&&validReport(repSector,'sector','daily',sectorId));
 verify('Objavljeni izvestaji dostupni predsedniku',reports.status===200&&reports.data.total>=20&&reports.data.items.every(row=>row.status==='published'));
 const ideasPresident=await call('/api/ideas',president);verify('Predsednik vidi prosledjene ideje i njihove odluke',ideasPresident.status===200&&ideasPresident.data.items.length>=5&&ideasPresident.data.items.every(i=>['forwarded','approved','rejected'].includes(i.status)));
 const ideasManager=await call('/api/ideas',manager);verify('Rukovodilac vidi sve ideje sektora',ideasManager.status===200&&ideasManager.data.total===4);
 const notice=await call('/api/notifications',president);verify('Predsednik prima obavestenja',notice.status===200&&notice.data.unread>0);
 const denied=await call(`/api/reports/preview?scope=company&type=daily&day=${belgradeDay()}`,employee);
 verify('Zaposlenom zabranjen izvestaj kompanije',denied.status===403);
 const accounts=await call('/api/admin/users?limit=100',admin),candidate=accounts.data?.items?.find(row=>row.email==='registracija.na.cekanju@zepter.test');
 const pending=await call('/api/auth/login',null,'POST',{email:'registracija.na.cekanju@zepter.test',password:pass});
 verify('Prijava postuje aktuelno odobrenje naloga',accounts.status===200&&!!candidate&&pending.status===(candidate.approval==='approved'?200:403));
 console.log(`\nRezultat: ${passed} OK, ${failed} gresaka.`);
 if(failed)process.exitCode=1;
}
async function logoutSessions(){
 const outcomes=await Promise.allSettled([...sessions].map(async cookie=>{
  const response=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Logout failed');
 }));
 const failed=outcomes.filter(result=>result.status==='rejected').length;
 if(failed){console.error('FAIL Odjava testnih sesija nije potvrđena: '+failed);process.exitCode=1;}
 console.log('Odjavljeno testnih sesija: '+(outcomes.length-failed));
}
run().catch(error=>{console.error('Smoke test prekinut:',error.message);process.exitCode=1;}).finally(logoutSessions);
