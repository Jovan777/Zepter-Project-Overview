import React, {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {Badge, EmptyState, IconDisc, Pagination, ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {formatProjectDate, personId, personName} from './projectForm.js';
import {sectorIdeaFilters, sectorIdeaStatuses, sectorIdeaTabs} from './ideaPresentation.js';
import './manager-report-ideas.css';

export default function ManagerIdeas({user}) {
  const [search,setSearch]=useSearchParams(),{tab,page}=sectorIdeaFilters(search);
  const resource=useEmployeeResource(`/ideas/sector?tab=${tab}&page=${page}&limit=10`);
  const sectors=useEmployeeResource('/sectors');
  const sectorName=sectors.data?.items.find(sector=>sector._id===personId(user.sector))?.name||'Moj sektor';
  const change=(nextTab,nextPage=1)=>{const next=new URLSearchParams();if(nextTab!=='all')next.set('tab',nextTab);if(nextPage>1)next.set('page',nextPage);setSearch(next);};
  useEffect(()=>{if(resource.data&&page>1&&!resource.data.items.length){const next=new URLSearchParams(search);next.delete('page');setSearch(next,{replace:true});}},[resource.data,page,search,setSearch]);
  return <div className="manager-sector-ideas">
    <div className="manager-wave-heading"><IconDisc name="bulb"/><div><h1>Ideje zaposlenih</h1><p>{sectorName}</p></div></div>
    <div className="manager-idea-metrics">{[['all','bulb','Ukupno ideja','total'],['review','clock','Na razmatranju','review'],['revision','edit','Vraćene na doradu','revision']].map(([key,icon,title,stat])=><button key={key} onClick={()=>change(key)} aria-label={title+(resource.data?`: ${resource.data.stats[stat]}`:'')}><IconDisc name={icon}/><span><strong>{resource.data?.stats[stat]??'—'}</strong><small>{title}</small></span></button>)}</div>
    <div className="manager-idea-tabs" role="group" aria-label="Filter ideja sektora">{sectorIdeaTabs.map(([key,title])=><button type="button" key={key} aria-pressed={tab===key} className={tab===key?'is-active':''} onClick={()=>change(key)}>{title}{resource.data&&` (${resource.data.stats[key==='all'?'total':key]})`}</button>)}</div>
    <ResourceState busy={resource.busy} error={resource.error} onRetry={resource.reload} noun="pregled ideja sektora"/>
    <section className="manager-idea-list" aria-label="Predlozi zaposlenih" aria-busy={resource.busy}>{resource.data?.items.map(idea=>{
      const [label,tone,icon]=sectorIdeaStatuses[idea.status]||['Nepoznat status','neutral','info'];
      const name=personName(idea.author);
      return <Link className="manager-idea-card" to={'/ideas/'+idea._id} state={{ideaList:'/ideas'+(search.size?'?'+search:'')}} key={idea._id}><div className="manager-idea-card-title"><h2>{idea.title}</h2><Badge tone={tone}><Icon name={icon} size={12}/>{label}</Badge></div><div className="manager-idea-author"><span className="manager-person-initials" aria-hidden="true">{[idea.author?.firstName,idea.author?.lastName].filter(Boolean).map(value=>value[0]).join('')||'?'}</span><strong>{name}</strong><span aria-hidden="true">·</span><time dateTime={idea.createdAt}><Icon name="calendar" size={13}/>{formatProjectDate(idea.createdAt)}</time></div><div className="manager-idea-card-bottom"><p>{idea.description}</p><span>Otvori ideju <Icon name="chevron" size={14}/></span></div></Link>;
    })}{resource.data&&!resource.data.items.length&&<EmptyState icon="bulb" title={tab==='all'?'Još nema ideja u sektoru':'Nema ideja za izabrani filter'}>{tab==='all'?'Ovde će se pojaviti predlozi koje zaposleni pošalju.':'Izaberite „Sve“ za ostale predloge sektora.'}</EmptyState>}</section>
    {resource.data&&<Pagination {...resource.data} label="Stranice ideja sektora" onPage={value=>change(tab,value)}/>}
    <div className="manager-idea-extra"><Link className="employee-text-button" to="/ideas/new"><Icon name="plusSquare" size={17}/>Predloži svoju ideju</Link></div>
  </div>;
}
