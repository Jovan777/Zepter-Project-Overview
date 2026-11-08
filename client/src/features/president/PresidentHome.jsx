import React,{useEffect,useState} from 'react';
import {countLabel} from '../employee/presentation.js';
import {useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState,EmptyState,Pagination,IconDisc} from '../employee/EmployeeComponents.jsx';
import {ReportShortcuts,AttentionCard} from './PresidentComponents.jsx';

export default function PresidentHome({sectorsOnly=false}){
 const [search,setSearch]=useSearchParams(),q=search.get('q')||'',[draft,setDraft]=useState(q);
 useEffect(()=>setDraft(q),[q]);
 const resource=useEmployeeResource('/dashboard/president?'+new URLSearchParams({sectorPage:search.get('sectorPage')||'1',attentionPage:search.get('attentionPage')||'1',...(q?{q}:{} )}),{keepPreviousData:true}),data=resource.data;
 const update=patch=>{const next=new URLSearchParams(search);for(const[key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);};
 return <div className="president-home"><div className="president-greeting"><h1>{sectorsOnly?'Sektori kompanije':'Dobar dan, predsedniče'}</h1><p>{sectorsOnly?'Otvorite sektor za projekte i razgovor sa rukovodiocem':'Pregled aktivnosti kompanije'}</p></div>
  <ResourceState {...resource} onRetry={resource.reload} noun="pregled kompanije"/>
  {!sectorsOnly&&<><div className="president-metrics"><Link to="/projects?activeOnly=1"><IconDisc name="folder"/><span><strong>{data?.stats.activeProjects??'—'}</strong><small>{countLabel(data?.stats.activeProjects||0,'Aktivan projekat','Aktivna projekta','Aktivnih projekata')}</small></span><Icon name="chevron" size={17}/></Link><Link to="/attention"><IconDisc name="clock"/><span><strong>{data?.stats.attention??'—'}</strong><small>Čekaju vašu reakciju</small></span><Icon name="chevron" size={17}/></Link></div><ReportShortcuts/>
  <section className="president-attention" aria-labelledby="president-attention-heading"><div className="president-section-heading"><h2 id="president-attention-heading">Potrebna vaša pažnja</h2>{data?.attention.total>4&&<Link to="/attention">Prikaži sve ({data.attention.total})</Link>}</div>{data?.attention.items.map(item=><AttentionCard key={item.key} item={item}/>)}{data&&!data.attention.total&&<EmptyState icon="check" title="Nema pitanja koja čekaju reakciju">Novi zahtevi i ugroženi rokovi pojaviće se ovde.</EmptyState>}{data&&<Pagination {...data.attention} label="Stranice važnih pitanja" onPage={page=>update({attentionPage:page})}/>}</section></>}
  <section className="president-sectors" id="sectors" aria-labelledby="president-sectors-heading"><div className="president-section-heading"><h2 id="president-sectors-heading">{sectorsOnly?'Lista sektora':'Sektori'}</h2>{!sectorsOnly&&<Link to="/sectors" aria-label="Otvori sve sektore"><Icon name="grid" size={18}/></Link>}</div>
   {(sectorsOnly||search.has('search'))&&<form className="president-search" onSubmit={event=>{event.preventDefault();update({q:draft.trim(),sectorPage:null});}}><label htmlFor="president-sector-search">Pretraži sektore</label><div><input id="president-sector-search" type="search" maxLength={160} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Naziv sektora…"/><button className="employee-icon-button" aria-label="Pokreni pretragu"><Icon name="search" size={19}/></button></div>{q&&<button type="button" className="employee-text-button" onClick={()=>update({q:null,sectorPage:null})}>Obriši pretragu</button>}</form>}
   {data?.sectors.items.map(sector=><Link className="president-sector-row" to={'/sectors/'+sector._id} key={sector._id}><Icon name="folder" size={21}/><span>{sector.name}{!sector.active&&<small>Neaktivan sektor</small>}</span>{sector.attentionCount>0&&<small>{sector.attentionCount} za pažnju</small>}<Icon name="chevron" size={19}/></Link>)}{data&&!data.sectors.items.length&&<EmptyState title={q?'Nema rezultata pretrage':'Još nema sektora'}>{q?'Pokušajte sa drugim nazivom.':'Sektori će se pojaviti kada ih administrator doda.'}</EmptyState>}{data&&<Pagination {...data.sectors} label="Stranice sektora" onPage={page=>update({sectorPage:page})}/>}</section>
 </div>;
}
