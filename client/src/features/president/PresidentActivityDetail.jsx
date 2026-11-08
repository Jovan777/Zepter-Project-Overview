import React,{useRef,useState} from 'react';
import {useParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState} from '../employee/EmployeeComponents.jsx';
import {ActivityBadge,DetailProgress} from '../employee/EmployeeProjectDetail.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import {useProjectGuard,ProjectExitDialog} from '../manager/ProjectFormParts.jsx';
import {usePresidentBackLink} from './navigation.jsx';
import {fullName,personId,presidentDate,priorities} from './presentation.js';
import {PersonAvatar,PresidentDocuments} from './PresidentDetailParts.jsx';
import './president-records.css';

export default function PresidentActivityDetail({user}){
 const {id}=useParams();return <Activity key={id} id={id} user={user}/>;
}
function Activity({id,user}){
 const source=useEmployeeResource('/activities/'+id,{keepPreviousData:true}),sectors=useEmployeeResource('/sectors');
 const [dirty,setDirty]=useState(false),[threadBusy,setThreadBusy]=useState(false),complete=useRef(false),guard=useProjectGuard(dirty,complete);
 const activity=source.data?.activity,project=source.data?.project;
 usePresidentBackLink(project?'/projects/'+project._id:'/projects','Nazad na projekat');
 if(!source.data)return <ResourceState {...source} onRetry={source.reload} noun="pregled aktivnosti"/>;
 const sectorId=personId(project.sector),sector=sectors.data?.items.find(item=>item._id===sectorId);
 return <div className="president-record president-activity-record">
  <nav className="president-record-breadcrumb" aria-label="Putanja"><Link to={'/sectors/'+sectorId}>{sector?.name||'Sektor'}</Link><Icon name="chevron" size={13}/><Link to={'/projects/'+project._id}>{project.title}</Link><Icon name="chevron" size={13}/><span>Aktivnost</span></nav>
  <div className="president-record-title"><h1>{activity.title}</h1><ActivityBadge status={activity.status}/></div>
  <p className="president-record-description">{activity.description||'Opis aktivnosti još nije dodat.'}</p>
  <ResourceState error={source.error} onRetry={source.reload}/>
  <div className="president-record-columns"><div className="president-record-information">
   <section className="president-record-progress" aria-label="Napredak aktivnosti"><div><h2>Ukupni napredak</h2><strong>{Math.min(100,Math.max(0,Number(activity.progress)||0))}%</strong></div><DetailProgress value={activity.progress} label="Napredak aktivnosti"/></section>
   <section className="president-record-facts" aria-label="Podaci aktivnosti"><dl>
    <div><dt><Icon name="user" size={17}/>{activity.assignees?.length>1?'Odgovorni':'Odgovoran'}</dt><dd>{activity.assignees?.length?activity.assignees.map(person=><span className="president-record-person" key={personId(person)}><PersonAvatar person={person}/><span>{fullName(person)}{person.jobTitle&&<small>{person.jobTitle}</small>}</span></span>):'Odgovorna osoba nije dodeljena'}</dd></div>
    <div><dt><Icon name="calendar" size={17}/>Rok</dt><dd>{presidentDate(activity.dueDate)}</dd></div>
    <div><dt><Icon name="flag" size={17}/>Prioritet</dt><dd><span className={'president-record-priority priority-'+activity.priority}>{priorities[activity.priority]||'Nije postavljen'}</span></dd></div>
    <div><dt><Icon name="folder" size={17}/>Projekat</dt><dd><Link to={'/projects/'+project._id}>{project.title}<Icon name="chevron" size={16}/></Link></dd></div>
   </dl></section>
   <section className="president-record-work"><h2>Šta je urađeno</h2><div className="president-record-work-text"><Icon name="check" size={21}/><p>{activity.actualWork||'Urađeni posao još nije evidentiran.'}</p></div>{activity.nextStep&&<><h3>Sledeći korak</h3><p>{activity.nextStep}</p></>}{activity.blockers&&<div className="president-record-blocker"><h3><Icon name="warning" size={19}/>Prepreke</h3><p>{activity.blockers}</p></div>}</section>
   <PresidentDocuments type="activity" id={id}/>
   {activity.updatedAt&&<p className="president-record-updated">Poslednje ažuriranje: <time dateTime={activity.updatedAt}>{presidentDate(activity.updatedAt)}</time></p>}
  </div><aside className="president-record-conversation"><EmployeeThread type="activity" id={id} user={user} variant="president" heading="Komentari i instrukcije" sectionId="president-activity-comments" allowInstructions allowAttachments onDraftChange={setDirty} onBusyChange={setThreadBusy}/></aside></div>
  <ProjectExitDialog guard={guard} saving={threadBusy} entity="komentara i priloga"/>
 </div>;
}
