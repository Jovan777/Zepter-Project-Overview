import React,{useEffect,useRef,useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {countLabel} from '../employee/presentation.js';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState,EmptyState,Pagination} from '../employee/EmployeeComponents.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import {ProjectExitDialog,useProjectGuard} from '../manager/ProjectFormParts.jsx';
import {ReportShortcuts,PresidentProjectCard} from './PresidentComponents.jsx';

export default function PresidentSector({user}){const {id}=useParams();return <SectorView key={id} id={id} user={user}/>;}
function SectorView({id,user}){
 const [search,setSearch]=useSearchParams(),q=search.get('q')||'',[draft,setDraft]=useState(q),[threadDirty,setThreadDirty]=useState(false),complete=useRef(false);
 const guard=useProjectGuard(threadDirty,complete,{ignoreSearch:true});
 useEffect(()=>setDraft(q),[q]);
 const overview=useEmployeeResource('/sectors/'+id+'/president',{keepPreviousData:true});
 const projects=useEmployeeResource('/sectors/'+id+'/president/projects?'+new URLSearchParams({page:search.get('page')||'1',tab:search.get('tab')==='all'?'all':'current',...(q?{q}:{})}),{keepPreviousData:true});
 const update=patch=>{const next=new URLSearchParams(search);next.delete('page');for(const[key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);};
 if(!overview.data)return <ResourceState {...overview} onRetry={overview.reload} noun="sektor"/>;
 const {sector,stats}=overview.data,manager=sector.manager?[sector.manager.firstName,sector.manager.lastName].filter(Boolean).join(' '):'';
 return <div className="president-sector"><div className="president-greeting"><h1>{sector.name}</h1><p>Pregled tekućih projekata{!sector.active?' · Neaktivan sektor':''}</p></div><ResourceState error={overview.error} onRetry={overview.reload}/><ReportShortcuts sectorId={id}/>
  <div className="president-sector-body"><section className="president-sector-conversation"><p className="president-conversation-caption">{manager?'Poruka za rukovodioca: '+manager:'Komentar ostaje vezan za ovaj sektor.'}</p><EmployeeThread type="sector" id={id} user={user} heading="Komentar na nivou sektora" sectionId="president-sector-thread" allowInstructions collapseHistory onDraftChange={setThreadDirty}/></section>
  <div className="president-sector-stats"><a href="#sector-projects"><strong>{stats.activeProjects}</strong><span>{countLabel(stats.activeProjects,'Aktivan projekat','Aktivna projekta','Aktivnih projekata')}</span></a><Link to={'/attention?sectorId='+id}><strong>{stats.attention}</strong><span>Zahteva pažnju</span></Link><div><strong>{stats.avgProgress===null?'—':stats.avgProgress+'%'}</strong><span>Prosečan napredak <Icon name="info" size={14}/></span><small>Tekući projekti, uključujući planirane</small></div></div>
  <section className="president-sector-projects" id="sector-projects" aria-labelledby="sector-projects-heading"><div className="president-section-heading"><h2 id="sector-projects-heading">{search.get('tab')==='all'?'Projekti sektora':'Tekući projekti'}</h2><span>{projects.data?.total??'—'} {countLabel(projects.data?.total||0,'projekat','projekta','projekata')}</span></div><div className="president-project-filters" role="group" aria-label="Prikaz projekata"><button aria-pressed={search.get('tab')!=='all'} onClick={()=>update({tab:null})}>Tekući</button><button aria-pressed={search.get('tab')==='all'} onClick={()=>update({tab:'all'})}>Svi</button><button aria-expanded={search.has('search')} onClick={()=>update({search:search.has('search')?null:'1'})}><Icon name="search" size={16}/>Pretraga</button></div>
   {search.has('search')&&<form className="president-search" onSubmit={event=>{event.preventDefault();update({q:draft.trim()});}}><label htmlFor="president-project-search">Pretraži projekte sektora</label><div><input id="president-project-search" type="search" maxLength={160} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Naziv projekta…"/><button className="employee-icon-button" aria-label="Pokreni pretragu"><Icon name="arrow" size={19}/></button></div>{q&&<button type="button" className="employee-text-button" onClick={()=>update({q:null})}>Obriši pretragu</button>}</form>}
   <ResourceState {...projects} onRetry={projects.reload} noun="projekte"/>{projects.data?.items.map(project=><PresidentProjectCard key={project._id} project={project}/>)}{projects.data&&!projects.data.items.length&&<EmptyState title={q?'Nema rezultata pretrage':'Nema projekata u ovom prikazu'}>Proverite drugi filter ili naziv projekta.</EmptyState>}{projects.data&&<Pagination {...projects.data} label="Stranice projekata sektora" onPage={page=>{const next=new URLSearchParams(search);next.set('page',page);setSearch(next);}}/>}
  </section></div><ProjectExitDialog guard={guard} saving={false} entity="komentara sektoru"/>
 </div>;
}
