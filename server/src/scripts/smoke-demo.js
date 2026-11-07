/** Brza end-to-end API provera na pokrenutom lokalnom serveru (bez izmene baze). */
import 'dotenv/config';
import {belgradeDay} from '../lib/utils.js';
const base=`http://127.0.0.1:${process.env.PORT||4000}`;
const pass=process.env.DEMO_SEED_PASSWORD;
if(!pass){console.error('Nedostaje DEMO_SEED_PASSWORD u .env');process.exit(1);}
let passed=0,failed=0;
async function call(route,token,method='GET',body){
 const response=await fetch(base+route,{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const type=response.headers.get('content-type')||'';
 const data=type.includes('json')?await response.json():null;
 return {status:response.status,data};
}
function verify(name,condition,detail=''){
 if(condition){passed++;console.log('OK  ',name);}else{failed++;console.error('FAIL',name,detail);}
}
async function login(tag){
 const email=`${tag}@demo.zepter.test`;
 const result=await call('/api/auth/login',null,'POST',{email,password:pass});
 verify('Prijava '+tag,result.status===200,result.data?.error);
 return result.data?.accessToken;
}
async function run(){
 const health=await call('/health');verify('MongoDB konekcija',health.data?.ok===true);
 const publicSectors=await call('/api/public/sectors');verify('Pet sektora',publicSectors.data?.items?.filter(x=>x.code.startsWith('DEMO_')).length===5);
 const admin=await login('admin');const president=await login('predsednik');const manager=await login('rukovodilac.mkt');const employee=await login('zaposleni1.mkt');
 if(!admin||!president||!manager||!employee)throw Error('Neki demo nalog nije uspeo da se prijavi.');
 const d=await call('/api/admin/registrations',admin);verify('Admin vidi prijavu na cekanju',d.status===200&&d.data.items.some(x=>x.email==='registracija.na.cekanju@demo.zepter.test'));
 const p=await call('/api/projects',president);verify('Predsednik vidi projekte svih sektora',p.status===200&&p.data.total>=15);
 const e=await call('/api/projects',employee);verify('Zaposleni vidi samo svoje projekte',e.status===200&&e.data.total===3);
 const m=await call('/api/projects',manager);verify('Rukovodilac vidi svoj sektor',m.status===200&&m.data.total===3);
 const reportCompany=await call(`/api/reports/preview?scope=company&type=daily&day=${belgradeDay()}`,president);
 verify('Dnevni izvestaj kompanije',reportCompany.status===200&&reportCompany.data.report?.stats?.workEntries>0);
 const weeklyCompany=await call(`/api/reports/preview?scope=company&type=weekly&day=${belgradeDay()}`,president);
 verify('Nedeljni izvestaj kompanije',weeklyCompany.status===200&&weeklyCompany.data.report?.stats?.workEntries>0);
 const sectorId=publicSectors.data.items.find(x=>x.code==='DEMO_MKT')?._id;
 const repSector=await call(`/api/reports/preview?scope=sector&id=${sectorId}&type=daily&day=${belgradeDay()}`,manager);
 verify('Dnevni izvestaj sektora',repSector.status===200&&repSector.data.report?.stats?.workEntries>0);
 const reports=await call('/api/reports',president);verify('Objavljeni izvestaji dostupni predsedniku',reports.status===200&&reports.data.total>=20);
 const ideasPresident=await call('/api/ideas',president);verify('Predsednik vidi prosledjene ideje',ideasPresident.status===200&&ideasPresident.data.items.length>=5&&ideasPresident.data.items.every(i=>i.status==='forwarded'));
 const ideasManager=await call('/api/ideas',manager);verify('Rukovodilac vidi sve ideje sektora',ideasManager.status===200&&ideasManager.data.total===4);
 const notice=await call('/api/notifications',president);verify('Predsednik prima obavestenja',notice.status===200&&notice.data.unread>0);
 const denied=await call(`/api/reports/preview?scope=company&type=daily&day=${belgradeDay()}`,employee);
 verify('Zaposlenom zabranjen izvestaj kompanije',denied.status===403);
 const pending=await call('/api/auth/login',null,'POST',{email:'registracija.na.cekanju@demo.zepter.test',password:pass});
 verify('Registracija na cekanju ne moze da se prijavi',pending.status===403);
 console.log(`\nRezultat: ${passed} OK, ${failed} gresaka.`);
 if(failed)process.exitCode=1;
}
run().catch(error=>{console.error('Smoke test prekinut:',error.message);process.exitCode=1;});
