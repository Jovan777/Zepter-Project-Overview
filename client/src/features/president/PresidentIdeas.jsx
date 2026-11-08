import React,{useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {Badge,EmptyState,Pagination,ResourceState} from '../employee/EmployeeComponents.jsx';
import {fullName,presidentDate} from './presentation.js';
import './president-project-ideas.css';

export default function PresidentIdeas(){
 const [search,setSearch]=useSearchParams(),q=search.get('q')||'',tab=['new','review','approved','rejected'].includes(search.get('tab'))?search.get('tab'):'all',[draft,setDraft]=useState(q);
 useEffect(()=>setDraft(q),[q]);
 const resource=useEmployeeResource('/ideas/president?'+new URLSearchParams({tab,page:search.get('page')||'1',...(q?{q}:{})}),{keepPreviousData:true}),data=resource.data;
 const change=patch=>{const next=new URLSearchParams(search);next.delete('page');for(const[key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);};
 return <div className="president-ideas"><div className="president-greeting"><h1>Ideje zaposlenih</h1><p>Predlozi koje su rukovodioci prosledili na vaš pregled</p></div>
  <div className="president-idea-tabs" role="group" aria-label="Prikaz ideja">{[['all','Sve'],['new','Nove'],['review','U razmatranju'],['approved','Odobrene'],['rejected','Odbijene']].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>change({tab:value==='all'?null:value})}>{label}{value==='new'&&data?.stats.new>0&&<span aria-label={data.stats.new+' novih ideja'}>{data.stats.new}</span>}</button>)}</div>
  {(search.has('search')||q)&&<form className="president-search" onSubmit={event=>{event.preventDefault();change({q:draft.trim()});}}><label htmlFor="president-idea-search">Pretraži ideje</label><div><input id="president-idea-search" type="search" maxLength={160} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Naslov ili opis ideje…"/><button className="employee-icon-button" aria-label="Pokreni pretragu"><Icon name="search" size={19}/></button></div>{q&&<button className="employee-text-button" type="button" onClick={()=>change({q:null})}>Obriši pretragu</button>}</form>}
  <ResourceState {...resource} onRetry={resource.reload} noun="pregled ideja"/>
  <div className="president-idea-list">{data?.items.map(idea=><Link className={'president-idea-card'+(idea.isNew?' is-new':'')} to={'/ideas/'+idea._id} key={idea._id}><span className="president-idea-icon"><Icon name="bulb" size={27}/></span><div><div className="president-idea-card-heading"><h2>{idea.title}</h2><span className="president-idea-sector">{idea.sector?.name||'Sektor nije dostupan'}</span></div><p className="president-idea-description">{idea.description}</p><p className="president-idea-author">{fullName(idea.author)}</p><div className="president-idea-meta"><span aria-label={idea.commentCount+' komentara'}><Icon name="message" size={15}/>{idea.commentCount}</span><span><Icon name="clock" size={14}/><time dateTime={idea.forwardedAt||idea.createdAt}>{presidentDate(idea.forwardedAt||idea.createdAt)}</time></span><Badge tone={idea.status==='approved'?'success':idea.status==='rejected'?'warning':'gold'}>{idea.status==='approved'?'Odobrena':idea.status==='rejected'?'Odbijena':idea.isNew?'Nova':'U razmatranju'}</Badge></div></div><Icon className="president-idea-chevron" name="chevron" size={18}/></Link>)}</div>
  {data&&!data.items.length&&<EmptyState icon="bulb" title={q?'Nema rezultata pretrage':tab==='new'?'Nema novih ideja':tab==='review'?'Nema ideja u razmatranju':tab==='approved'?'Još nema odobrenih ideja':tab==='rejected'?'Još nema odbijenih ideja':'Još nema prosleđenih ideja'}>{q?'Pokušajte sa drugim naslovom ili opisom.':tab==='review'?'Otvorite nove predloge i pregledajte njihov sadržaj.':'Ideje se pojavljuju nakon što ih rukovodilac prosledi.'}</EmptyState>}
  {data&&<Pagination {...data} label="Stranice ideja" onPage={page=>change({page})}/>}
 </div>;
}
