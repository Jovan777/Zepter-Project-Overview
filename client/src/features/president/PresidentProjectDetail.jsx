import React,{useRef,useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {Badge,EmptyState,Pagination,ResourceState} from '../employee/EmployeeComponents.jsx';
import {ActivityBadge,DetailProgress} from '../employee/EmployeeProjectDetail.jsx';
import {countLabel,projectStatus} from '../employee/presentation.js';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import EmployeeAttachments from '../employee/EmployeeAttachments.jsx';
import {ProjectExitDialog,useProjectGuard} from '../manager/ProjectFormParts.jsx';
import {usePresidentBackLink} from './navigation.jsx';
import {fullName,personId,presidentDate,priorities,projectActivities,projectTeam} from './presentation.js';
import './president-project-ideas.css';

export default function PresidentProjectDetail({user}){
 const {id}=useParams();return <ProjectView key={id} id={id} user={user}/>;
}
function ProjectView({id,user}){
 const [search,setSearch]=useSearchParams(),[teamOpen,setTeamOpen]=useState(false),[threadDirty,setThreadDirty]=useState(false),complete=useRef(false);
 const guard=useProjectGuard(threadDirty,complete,{ignoreSearch:true});
 const project=useEmployeeResource('/projects/'+id,{keepPreviousData:true}),tasks=useEmployeeResource('/activities/project/'+id,{keepPreviousData:true});
 const sectors=useEmployeeResource('/sectors'),attachments=useEmployeeResource('/attachments/target/project/'+id,{keepPreviousData:true}),p=project.data?.project;
 const sectorId=p?.sector?personId(p.sector):null;
 usePresidentBackLink(sectorId?'/sectors/'+sectorId:'/projects',sectorId?'Nazad na sektor':'Nazad na projekte');
 if(!p)return <ResourceState {...project} onRetry={project.reload} noun="projekat"/>;
 const sector=sectors.data?.items.find(s=>s._id===sectorId),team=projectTeam(p),status=projectStatus(p),all=tasks.data?.items||[];
 const filter=['open','completed'].includes(search.get('activities'))?search.get('activities'):'all',filtered=projectActivities(all,filter);
 const pages=Math.max(1,Math.ceil(filtered.length/12)),page=Math.min(pages,Math.max(1,Math.trunc(Number(search.get('page')))||1));
 const change=patch=>{const next=new URLSearchParams(search);next.delete('page');for(const[key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);};
 return <div className="president-project">
  <nav className="president-project-breadcrumb" aria-label="Putanja"><Link to={sectorId?'/sectors/'+sectorId:'/sectors'}>{sector?.name||'Sektor'}</Link><Icon name="chevron" size={13}/><span>Projekat</span></nav>
  <div className="president-project-title"><h1>{p.title}</h1><Badge tone={status.tone}>{status.label}</Badge></div>
  <p className="president-project-description">{p.description||'Opis projekta još nije dodat.'}</p>
  <ResourceState error={project.error} onRetry={project.reload}/>
  <section className="president-project-summary" aria-label="Pregled projekta"><div className="president-project-progress-heading"><h2>Ukupni napredak</h2><strong>{Math.min(100,Math.max(0,Number(p.progress)||0))}%</strong></div><DetailProgress value={p.progress} label="Ukupni napredak projekta"/>
   <dl><div><dt><Icon name="calendar" size={16}/>Rok</dt><dd>{presidentDate(p.dueDate)}</dd></div><div><dt><Icon name="users" size={16}/>Odgovoran</dt><dd>{p.owner?fullName(p.owner):'Nije dodeljen'}</dd></div><div><dt><Icon name="flag" size={16}/>Prioritet</dt><dd>{priorities[p.priority]||'Nije postavljen'}</dd></div></dl>
  </section>
  <nav className="president-project-shortcuts" aria-label="Sadržaj projekta">
   <a href="#president-project-comments"><Icon name="message" size={23}/><strong>Komentari na projekat</strong></a>
   <Link to={'/reports?'+new URLSearchParams({scope:'project',id,type:'daily'})}><Icon name="calendar" size={23}/><strong>Dnevni izveštaj</strong></Link>
   <Link to={'/reports?'+new URLSearchParams({scope:'project',id,type:'weekly'})}><Icon name="chart" size={23}/><strong>Nedeljni izveštaj</strong></Link>
   <a href="#president-project-team" onClick={()=>setTeamOpen(true)}><Icon name="users" size={23}/><strong>Tim</strong><small>{team.length} {countLabel(team.length,'član','člana','članova')}</small></a>
  </nav>
  <div className="president-project-body"><div className="president-project-primary">
   <section aria-labelledby="president-project-activities"><div className="president-section-heading"><h2 id="president-project-activities">Aktivnosti projekta</h2><span>{tasks.data?filtered.length:'—'} {tasks.data&&filter!=='all'?'od '+all.length:countLabel(all.length,'aktivnost','aktivnosti','aktivnosti')}</span><button className="employee-icon-button" aria-label="Filtriraj aktivnosti" aria-expanded={search.has('filter')} onClick={()=>change({filter:search.has('filter')?null:'1'})}><Icon name="activity" size={19}/></button></div>
    {(search.has('filter')||filter!=='all')&&<label className="president-activity-filter">Prikaz aktivnosti<select value={filter} onChange={event=>change({activities:event.target.value==='all'?null:event.target.value})}><option value="all">Sve aktivnosti</option><option value="open">Nezavršene</option><option value="completed">Završene</option></select></label>}
    <ResourceState busy={tasks.busy&&!tasks.data} error={tasks.error} onRetry={tasks.reload} noun="pregled aktivnosti"/>
    <div className="president-project-activities">{filtered.slice((page-1)*12,page*12).map((activity,index)=><Link className="president-project-task" key={activity._id} to={'/activities/'+activity._id}><span className="president-task-number">{(page-1)*12+index+1}</span><div><div className="president-task-heading"><h3>{activity.title}</h3><ActivityBadge status={activity.status}/></div><p className="president-task-assignees"><Icon name="user" size={13}/>{activity.assignees?.length?activity.assignees.map(fullName).join(', '):'Odgovorna osoba nije dodeljena'}</p><div className="president-task-progress"><DetailProgress value={activity.progress} label={'Napredak aktivnosti '+activity.title}/><span><Icon name="calendar" size={12}/>{presidentDate(activity.dueDate)}</span></div></div><Icon name="chevron" size={17}/></Link>)}</div>
    {tasks.data&&!filtered.length&&<EmptyState icon="activity" title={all.length?'Nema aktivnosti u ovom prikazu':'Još nema aktivnosti'}>{all.length?'Izaberite drugi prikaz aktivnosti.':'Aktivnosti će se pojaviti kada ih rukovodilac doda.'}</EmptyState>}
    <Pagination page={page} total={filtered.length} limit={12} label="Stranice aktivnosti projekta" onPage={page=>change({page})}/>
   </section>
   <details className="employee-detail-disclosure president-project-team" id="president-project-team" open={teamOpen} onToggle={event=>setTeamOpen(event.currentTarget.open)}><summary><Icon name="users" size={20}/><span>Tim projekta</span><small>{team.length}</small><Icon name="chevron" size={17}/></summary><div className="employee-team-list">{team.map(person=><div key={personId(person)}><span className="president-person-initials" aria-hidden="true">{[person.firstName,person.lastName].filter(Boolean).map(x=>x[0]).join('')||'?'}</span><div><strong>{fullName(person)}</strong><span>{personId(person)===personId(p.owner)?'Odgovorna osoba':person.jobTitle||'Član tima'}</span></div></div>)}{!team.length&&<p>Članovi tima još nisu dodeljeni.</p>}</div></details>
   <details className="employee-detail-disclosure"><summary><Icon name="clip" size={20}/><span>Dokumenti projekta</span><small>{attachments.data?.items.length??'—'}</small><Icon name="chevron" size={17}/></summary><EmployeeAttachments type="project" id={id} user={user} editable={false} resource={attachments}/></details>
  </div><div className="president-project-conversation"><EmployeeThread type="project" id={id} user={user} heading="Komentari na projekat" sectionId="president-project-comments" allowInstructions onDraftChange={setThreadDirty}/></div></div>
  <ProjectExitDialog guard={guard} saving={false} entity="komentara na projekat"/>
 </div>;
}
