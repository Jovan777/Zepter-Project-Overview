import React,{useState,useEffect,useRef,createContext,useContext,lazy,Suspense} from 'react';
import {Routes, Route, useParams, useSearchParams, Navigate, useLocation} from 'react-router-dom';
import {Link, useNavigate} from './features/workspace/MotionNavigation.jsx';
import {api,bootstrap,setToken,connectSocket,disconnectSocket,logoutSession} from './api.js';
const EmployeeShell=lazy(()=>import('./features/employee/EmployeeShell.jsx'));
const EmployeeHome=lazy(()=>import('./features/employee/EmployeeHome.jsx'));
const EmployeeProjects=lazy(()=>import('./features/employee/EmployeeProjects.jsx'));
const EmployeeProjectDetail=lazy(()=>import('./features/employee/EmployeeProjectDetail.jsx'));
const EmployeeActivityDetail=lazy(()=>import('./features/employee/EmployeeActivityDetail.jsx'));
const EmployeeDailyEntry=lazy(()=>import('./features/employee/EmployeeDailyEntry.jsx'));
const EmployeeIdeas=lazy(()=>import('./features/employee/EmployeeIdeas.jsx'));
const EmployeeIdeaCreate=lazy(()=>import('./features/employee/EmployeeIdeaCreate.jsx'));
const EmployeeIdeaDetail=lazy(()=>import('./features/employee/EmployeeIdeaDetail.jsx'));
const EmployeeNotifications=lazy(()=>import('./features/employee/EmployeeNotifications.jsx'));
const ManagerShell=lazy(()=>import('./features/manager/ManagerShell.jsx'));
const ManagerHome=lazy(()=>import('./features/manager/ManagerHome.jsx'));
const ManagerProjects=lazy(()=>import('./features/manager/ManagerProjects.jsx'));
const ManagerProjectDetail=lazy(()=>import('./features/manager/ManagerProjectDetail.jsx'));
const ManagerProjectForm=lazy(()=>import('./features/manager/ManagerProjectForm.jsx'));
const ManagerActivityCreate=lazy(()=>import('./features/manager/ManagerActivityCreate.jsx'));
const ManagerActivityDetail=lazy(()=>import('./features/manager/ManagerActivityDetail.jsx'));
const ManagerReports=lazy(()=>import('./features/manager/ManagerReports.jsx'));
const ManagerReportEditor=lazy(()=>import('./features/manager/ManagerReportEditor.jsx'));
const ManagerIdeaDetail=lazy(()=>import('./features/manager/ManagerIdeaDetail.jsx'));
const ManagerNotifications=lazy(()=>import('./features/manager/ManagerNotifications.jsx'));
const ManagerIdeas=lazy(()=>import('./features/manager/ManagerIdeas.jsx'));
const PresidentShell=lazy(()=>import('./features/president/PresidentShell.jsx'));
import PresidentEntry from './features/president/PresidentEntry.jsx';
import {isPresidentEntryPath,presidentKeyFromPath} from './features/president/presidentEntry.js';
const AdminShell=lazy(()=>import('./features/admin/AdminShell.jsx'));
const AdminPanel=lazy(()=>import('./features/admin/AdminPanel.jsx'));
const PresidentHome=lazy(()=>import('./features/president/PresidentHome.jsx'));
const PresidentSector=lazy(()=>import('./features/president/PresidentSector.jsx'));
const PresidentAttention=lazy(()=>import('./features/president/PresidentAttention.jsx'));
const PresidentReports=lazy(()=>import('./features/president/PresidentReports.jsx'));
const PresidentComments=lazy(()=>import('./features/president/PresidentComments.jsx'));
const PresidentProjectDetail=lazy(()=>import('./features/president/PresidentProjectDetail.jsx'));
const PresidentIdeas=lazy(()=>import('./features/president/PresidentIdeas.jsx'));
const PresidentIdeaReview=lazy(()=>import('./features/president/PresidentIdeaReview.jsx'));
const PresidentActivityDetail=lazy(()=>import('./features/president/PresidentActivityDetail.jsx'));
import {Auth} from './features/workspace/AuthContext.js';
const LegacyLayout=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyLayout})));
const LegacyHome=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyHome})));
const SectorList=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.SectorList})));
const LegacySector=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacySector})));
const ProjectCard=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.ProjectCard})));
const RecentProjects=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.RecentProjects})));
const LegacyProjects=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyProjects})));
const ThreadPreview=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.ThreadPreview})));
const Thread=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.Thread})));
const LegacyProjectDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyProjectDetail})));
const LegacyProjectForm=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyProjectForm})));
const LegacyNewActivity=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyNewActivity})));
const Attachments=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.Attachments})));
const LegacyActivityDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyActivityDetail})));
const LegacyIdeas=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyIdeas})));
const LegacyIdeaCreate=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyIdeaCreate})));
const LegacyIdeaDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyIdeaDetail})));
const LegacyDaily=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyDaily})));
const LegacyReports=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyReports})));
const ReportPreview=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.ReportPreview})));
const LegacyReportCreate=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyReportCreate})));
const LegacyReportDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyReportDetail})));
const LegacyNotifications=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyNotifications})));
const LegacyAttention=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyAttention})));
const LegacyMyComments=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.LegacyMyComments})));
const Assignments=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.Assignments})));
const AssignmentDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.AssignmentDetail})));
const AssignmentNew=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.AssignmentNew})));
const RequestNew=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.RequestNew})));
const RequestDetail=lazy(()=>import('./features/legacy/LegacyPages.jsx').then(module=>({default:module.RequestDetail})));

const getErr=e=>e?.message||'Greška';

function Alert({text}){return text?<div className="alert">{text}</div>:null;}
function Panel({children,title,action}){return <section className="panel">{title&&<div className="row between"><h3>{title}</h3>{action}</div>}{children}</section>;}

function Field({label:caption,children}){return <label className="field"><span>{caption}</span>{children}</label>};
function Submit({children,disabled=false}){return <button className="primary" type="submit" disabled={disabled}>{children}</button>};

function Layout({children}){
 const auth=useContext(Auth);
 return auth.user.role==='president'?<PresidentShell {...auth}><Suspense fallback={<p role="status">Učitavanje pregleda kompanije…</p>}>{children}</Suspense></PresidentShell>:auth.user.role==='employee'?<EmployeeShell {...auth}><Suspense fallback={<p role="status">Učitavanje pregleda…</p>}>{children}</Suspense></EmployeeShell>:auth.user.role==='manager'?<ManagerShell {...auth}><Suspense fallback={<p role="status">Učitavanje pregleda sektora…</p>}>{children}</Suspense></ManagerShell>:auth.user.role==='admin'?<AdminShell {...auth}><Suspense fallback={<p role="status">Učitavanje administracije…</p>}>{children}</Suspense></AdminShell>:<LegacyLayout>{children}</LegacyLayout>;
}

function Login(){
 const {login}=useContext(Auth),nav=useNavigate();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{await login(email,password);nav('/');}catch(e){setError(getErr(e))}finally{setBusy(false)}};
 return <div className="login"><h1 className="brand">ZEPTER</h1><h2>Management Overview</h2><p className="muted">Prijavite se za pristup poslovnom pregledu.</p><form onSubmit={submit}><Field label="Mejl"><input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Lozinka"><input required type="password" value={password} onChange={e=>setPassword(e.target.value)}/></Field><Alert text={error}/><Submit disabled={busy}>{busy?'Prijava…':'Prijavi se'}</Submit></form><p className="small">Novi korisnik? <Link to="/register">Registracija</Link></p></div>;
}
function Register(){
 const [values,setValues]=useState({firstName:'',lastName:'',email:'',password:'',jobTitle:'',sectorId:'',requestedManager:false}),[sectors,setSectors]=useState([]),[message,setMessage]=useState(''),[err,setErr]=useState('');
 useEffect(()=>{api('/public/sectors',{retry:false}).then(d=>setSectors(d.items)).catch(e=>setErr(e.message));},[]);
 const set=(key,value)=>setValues(v=>({...v,[key]:value}));
 const submit=async e=>{e.preventDefault();setErr('');try{const d=await api('/auth/register',{method:'POST',body:values,retry:false});setMessage(d.message);}catch(e){setErr(e.message);}};
 return <div className="login"><h1 className="brand">ZEPTER</h1><h2>Registracija zaposlenog</h2>{message?<Panel>{message} <Link to="/login">Nazad na prijavu</Link></Panel>:<form onSubmit={submit}><Field label="Ime"><input required onChange={e=>set('firstName',e.target.value)}/></Field><Field label="Prezime"><input required onChange={e=>set('lastName',e.target.value)}/></Field><Field label="Mejl"><input type="email" required onChange={e=>set('email',e.target.value)}/></Field><Field label="Lozinka (najmanje 12 znakova)"><input type="password" minLength={12} required onChange={e=>set('password',e.target.value)}/></Field><Field label="Radno mesto"><input required onChange={e=>set('jobTitle',e.target.value)}/></Field><Field label="Sektor"><select required value={values.sectorId} onChange={e=>set('sectorId',e.target.value)}><option value="">Izaberite</option>{sectors.map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select></Field><label className="check"><input type="checkbox" onChange={e=>set('requestedManager',e.target.checked)}/> Prijavljujem se kao rukovodilac sektora</label><Alert text={err}/><Submit>Pošalji zahtev</Submit></form>}<Link to="/login">Nazad na prijavu</Link></div>;
}
function Home(){
 const {user}=useContext(Auth);
 if(user.role==='admin')return <Navigate to="/admin" replace/>;
 return user.role==='president'?<PresidentHome/>:user.role==='employee'?<EmployeeHome user={user}/>:user.role==='manager'?<ManagerHome user={user}/>:<LegacyHome/>;
}

function Sectors(){const {user}=useContext(Auth);return user.role==='president'?<PresidentHome sectorsOnly/>:<><h1>Sektori kompanije</h1><SectorList/></>}
function Sector(){const {user}=useContext(Auth);return user.role==='president'?<PresidentSector user={user}/>:<LegacySector/>;}

function Projects(){const {user}=useContext(Auth);return user.role==='employee'?<EmployeeProjects/>:user.role==='manager'?<ManagerProjects/>:<LegacyProjects/>;}

function ProjectDetail(){
 const {user}=useContext(Auth);
 return user.role==='employee'?<EmployeeProjectDetail user={user}/>:user.role==='manager'?<ManagerProjectDetail user={user}/>:user.role==='president'?<PresidentProjectDetail user={user}/>:<LegacyProjectDetail/>;
}

function ProjectForm(){const {user}=useContext(Auth);return user.role==='manager'?<ManagerProjectForm user={user}/>:<LegacyProjectForm/>;}

function NewActivity(){const {user}=useContext(Auth);return user.role==='manager'?<ManagerActivityCreate/>:<LegacyNewActivity/>;}

function ActivityDetail(){const {user}=useContext(Auth);return user.role==='president'?<PresidentActivityDetail user={user}/>:user.role==='employee'?<EmployeeActivityDetail user={user}/>:user.role==='manager'?<ManagerActivityDetail user={user}/>:<LegacyActivityDetail/>;}

function Ideas(){const {user}=useContext(Auth);return user.role==='employee'?<EmployeeIdeas/>:user.role==='manager'?<ManagerIdeas user={user}/>:user.role==='president'?<PresidentIdeas/>:<LegacyIdeas/>;}

function IdeaCreate(){const {user}=useContext(Auth);return ['employee','manager'].includes(user.role)?<EmployeeIdeaCreate user={user}/>:<LegacyIdeaCreate/>;}

function IdeaDetail(){const {user}=useContext(Auth);return user.role==='employee'?<EmployeeIdeaDetail user={user}/>:user.role==='manager'?<ManagerIdeaDetail user={user}/>:user.role==='president'?<PresidentIdeaReview user={user}/>:<LegacyIdeaDetail/>;}

function Daily(){const {user}=useContext(Auth);return ['employee','manager'].includes(user.role)?<EmployeeDailyEntry user={user}/>:<LegacyDaily/>;}

function Reports(){const {user}=useContext(Auth);return user.role==='president'?<PresidentReports/>:user.role==='manager'?<ManagerReports user={user}/>:<LegacyReports/>;}

function ReportCreate(){const {user}=useContext(Auth);return user.role==='manager'?<ManagerReportEditor user={user}/>:<LegacyReportCreate/>;}

function ReportDetail(){const {user}=useContext(Auth);return user.role==='president'?<PresidentReports saved/>:user.role==='manager'?<ManagerReportEditor user={user}/>:<LegacyReportDetail/>;}

function Notifications(){const {user}=useContext(Auth);return user.role==='employee'?<EmployeeNotifications/>:user.role==='manager'?<ManagerNotifications/>:<LegacyNotifications/>;}

function Attention(){const {user}=useContext(Auth);return user.role==='president'?<PresidentAttention/>:<LegacyAttention/>;}

function MyComments(){const {user}=useContext(Auth);return user.role==='president'?<PresidentComments/>:<LegacyMyComments/>;}

function App({presidentEntry}){const [user,setUser]=useState(null),[ready,setReady]=useState(false),[newNotification,setNewNotification]=useState(false),[logoutError,setLogoutError]=useState(''),loc=useLocation(),nav=useNavigate();
 const [presidentCredential,setPresidentCredential]=useState(()=>presidentEntry?.takeKey?.()||null),[entryError,setEntryError]=useState(''),[entryBusy,setEntryBusy]=useState(false);
 const entryPath=!!presidentEntry?.basename||!!presidentEntry?.invalid||isPresidentEntryPath(loc.pathname),entryLock=useRef(false);
 const openPresident=async(key=presidentCredential)=>{if(entryLock.current||!key)return;entryLock.current=true;setPresidentCredential(key);setEntryBusy(true);setEntryError('');try{const d=await api('/auth/president-link',{method:'POST',body:{key},retry:false});if(d.user?.role!=='president')throw Error('Predsednički pristup nije potvrđen.');setToken(d.accessToken);setUser(d.user);setPresidentCredential(null);connectSocket(()=>setNewNotification(true));if(!presidentEntry?.basename)nav('/',{replace:true});}catch(e){setEntryError(e.message);}finally{entryLock.current=false;setEntryBusy(false);}};
 const [logoutBusy,setLogoutBusy]=useState(false),logoutLock=useRef(false);
 useEffect(()=>{const expired=()=>{setUser(null);setNewNotification(false);const key=presidentKeyFromPath(presidentEntry?.basename);if(key){void openPresident(key);return;}nav(user?.role==='president'||isPresidentEntryPath(loc.pathname)?'/predsednik':'/login',{replace:true});};window.addEventListener('zepter:session-expired',expired);return()=>window.removeEventListener('zepter:session-expired',expired);},[nav,user?.role,loc.pathname]);
 useEffect(()=>{let active=true;const start=async()=>{try{if(presidentEntry?.invalid){setEntryError('Lični link nije važeći. Otvorite originalni link.');return;}if(presidentCredential){await openPresident();return;}const d=await bootstrap();if(active&&d?.user){setUser(d.user);connectSocket(()=>setNewNotification(true));}}finally{if(active)setReady(true);}};start();return()=>{active=false;disconnectSocket();};},[]);
 const login=async(email,password)=>{const d=await api('/auth/login',{method:'POST',body:{email,password},retry:false});setToken(d.accessToken);setUser(d.user);setLogoutError('');setNewNotification(false);connectSocket(()=>setNewNotification(true));};
 const logout=async()=>{if(logoutLock.current)return;logoutLock.current=true;setLogoutBusy(true);setLogoutError('');setNewNotification(false);setUser(null);nav(user?.role==='president'?'/predsednik':'/login',{replace:true});try{await logoutSession();}catch{setLogoutError('Serverska odjava nije potvrđena. Proverite vezu i ponovite odjavu pre zatvaranja aplikacije.');}finally{logoutLock.current=false;setLogoutBusy(false);}};
 if(!ready)return entryPath?<PresidentEntry busy/>:<div className="login">Učitavanje Zepter aplikacije…</div>;
 if(logoutBusy)return <div className="login" role="status">Odjava je u toku…</div>;
 const publicPage=['/login','/register'].includes(loc.pathname);
 if(entryPath&&user?.role!=='president')return <><PresidentEntry busy={entryBusy} error={entryError} canRetry={!!presidentCredential} onRetry={()=>openPresident()}/>{logoutError&&<div className="employee-form-error" role="alert"><p>{logoutError}</p><button onClick={logout}>Ponovi odjavu</button></div>}</>;
 if(!user)return <Auth.Provider value={{login}}>{logoutError&&<div role="alert" className="employee-form-error"><p>{logoutError}</p><button onClick={logout}>Ponovi odjavu</button></div>}<Routes><Route path="/register" element={<Register/>}/><Route path="*" element={<Login/>}/></Routes></Auth.Provider>;
 if(publicPage)return <Navigate to="/" replace/>;
 return <Auth.Provider value={{user,logout,newNotification}}><Suspense fallback={<div className="login" role="status">Otvaramo vaš pregled…</div>}><Layout><Routes>
 <Route path="/" element={<Home/>}/><Route path="/predsednik" element={<Navigate to="/" replace/>}/><Route path="/president" element={<Navigate to="/" replace/>}/><Route path="/sectors" element={<Sectors/>}/><Route path="/sectors/:id" element={<Sector/>}/>
 <Route path="/projects" element={<Projects/>}/><Route path="/projects/new" element={<ProjectForm/>}/><Route path="/projects/:id/edit" element={<ProjectForm/>}/><Route path="/projects/:id/new-activity" element={<NewActivity/>}/><Route path="/projects/:id" element={<ProjectDetail/>}/><Route path="/activities/:id" element={<ActivityDetail/>}/>
 <Route path="/ideas" element={<Ideas/>}/><Route path="/ideas/new" element={<IdeaCreate/>}/><Route path="/ideas/:id" element={<IdeaDetail/>}/>
 <Route path="/reports" element={<Reports/>}/><Route path="/reports/new" element={<ReportCreate/>}/><Route path="/reports/:id" element={<ReportDetail/>}/><Route path="/daily" element={<Daily/>}/>
 <Route path="/notifications" element={<Notifications/>}/><Route path="/attention" element={<Attention/>}/><Route path="/my-comments" element={<MyComments/>}/>
 <Route path="/requests/new" element={<RequestNew/>}/><Route path="/requests/:id" element={<RequestDetail/>}/><Route path="/assignments/new" element={<AssignmentNew/>}/><Route path="/assignments" element={<Assignments/>}/><Route path="/assignments/:id" element={<AssignmentDetail/>}/><Route path="/admin/*" element={user.role==='admin'?<AdminPanel/>:<Navigate to="/" replace/>}/>
 <Route path="*" element={<Navigate to="/" replace/>}/></Routes></Layout></Suspense></Auth.Provider>;
}
export default App;
