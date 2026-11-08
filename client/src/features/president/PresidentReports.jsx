import React,{useEffect,useRef,useState} from 'react';
import {useLocation, useParams, useSearchParams} from 'react-router-dom';
import {Link, useNavigate} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState,Pagination} from '../employee/EmployeeComponents.jsx';
import {reportPeriod,shiftReportDay,validReportDay} from '../manager/reportPresentation.js';
import {usePresidentBackLink} from './navigation.jsx';
import {presidentDate} from './presentation.js';
import {presidentReportFilters,reportSearch,reportScopes,evidenceLink,reportMatches} from './reportPresentation.js';
import './president-reports-attention.css';

function TargetPicker({scope,id,name,onPick}){
 const [query,setQuery]=useState(''),[draft,setDraft]=useState(''),[page,setPage]=useState(1);
 useEffect(()=>{setQuery('');setDraft('');setPage(1);},[scope]);
 const resource=useEmployeeResource('/reports/president/options?'+new URLSearchParams({scope,page,q:query})),data=resource.data;
 const label=scope==='sector'?'Sektor':scope==='project'?'Projekat':'Zaposleni';
 return <div className="president-report-target"><label htmlFor="president-report-target">{label}</label><select id="president-report-target" value={id} onChange={event=>onPick(event.target.value)}><option value="">Izaberite {label.toLocaleLowerCase('sr-Latn-RS')}</option>{id&&!data?.items.some(row=>row._id===id)&&<option value={id}>{name||'Izabrani '+label.toLocaleLowerCase('sr-Latn-RS')}</option>}{data?.items.map(row=><option key={row._id} value={row._id}>{row.name}</option>)}</select><details><summary>Pretraži {scope==='sector'?'sektore':scope==='project'?'projekte':'zaposlene'}</summary><div className="president-report-target-search"><label className="employee-sr-only" htmlFor="report-target-search">Pretraga po nazivu ili imenu</label><input id="report-target-search" type="search" maxLength={160} placeholder="Naziv ili ime…" value={draft} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();setQuery(draft.trim());setPage(1);}}}/><button type="button" className="employee-text-button" onClick={()=>{setQuery(draft.trim());setPage(1);}}>Pretraži</button></div>{data&&!data.items.length&&<p>Nema rezultata za ovu pretragu.</p>}{data&&<Pagination {...data} label="Stranice izbora za izveštaj" onPage={setPage}/>}</details><ResourceState busy={resource.busy&&!data} error={resource.error} onRetry={resource.reload} noun="izbor"/></div>;
}
function ReportSection({id,title,icon,children,caption}){return <section className="president-report-section" id={id}><h2><Icon name={icon} size={21}/>{title}</h2>{caption&&<p className="president-report-caption">{caption}</p>}{children}</section>;}
function Evidence({items=[],empty,activities=false}){
 const [expanded,setExpanded]=useState(false),shown=expanded?items:items.slice(0,4);
 if(!items.length)return empty?<p className="president-report-empty">{empty}</p>:null;
 return <><ul className="president-report-evidence">{shown.map((item,index)=>{
  const link=activities&&item.id?'/activities/'+item.id:evidenceLink(item),text=activities?item.title:item.text;
  const details=[item.day?presidentDate(item.day+'T12:00:00Z'):null,item.employee,item.activity||item.project].filter(Boolean).join(' · ');
  return <li key={item.id||index}><Icon name={activities?'check':'arrow'} size={15}/><div>{link?<Link to={link}>{text}<Icon name="chevron" size={14}/></Link>:<p>{text}</p>}{details&&<small>{details}</small>}{activities&&item.dueDate&&<small>Rok: {presidentDate(item.dueDate)}</small>}</div></li>;
 })}</ul>{items.length>4&&<button className="employee-text-button" onClick={()=>setExpanded(value=>!value)}>{expanded?'Prikaži manje':'Prikaži sve ('+items.length+')'}<Icon name="chevron" size={15}/></button>}</>;
}
function Summaries({items,field}){return items.filter(item=>item[field]?.trim()).map(item=><div className="president-report-summary" key={item.id}><h3>{item.sectorName} · sažetak rukovodioca</h3><p>{item[field]}</p></div>);}
function ReportContent({data,currentUrl}){
 const {context,metrics,mode,summaries}=data,hasSummary=field=>summaries.some(item=>item[field]?.trim());
 const stateCaption=mode==='published'?'Stanje aktivnosti zabeleženo pri objavi':'Trenutno stanje aktivnosti';
 return <><div className="president-report-context"><h2>{context.name}</h2><p><Icon name="calendar" size={17}/>Period: {reportPeriod(context)}</p><span className={'president-report-source '+(mode==='published'?'is-published':'')}>{mode==='published'?'Objavljen izveštaj':'Automatski pregled evidencije'}</span></div>
  <div className="president-report-metrics"><a href="#report-completed"><strong>{metrics.completedActivities??'—'}</strong><span>Završene aktivnosti</span></a><a href="#report-problems"><strong>{metrics.problemReports}</strong><span>Prijave problema</span></a><a href="#report-late"><strong>{metrics.lateActivities??'—'}</strong><span>Aktivnosti u kašnjenju</span></a></div>
  <p className="president-report-data-note"><Icon name="info" size={16}/><span>{stateCaption}{data.asOf?' · '+presidentDate(data.asOf):''} — rezultati rada i prijavljeni problemi odnose se na izabrani period.</span></p>
  <div className="president-report-grid">
   <ReportSection id="report-results" title="Ostvareni rezultati" icon="chart"><Summaries items={summaries} field="results"/>{hasSummary('results')&&data.results.length>0&&<h3>Evidencija rada u periodu</h3>}<Evidence items={data.results} empty={hasSummary('results')?null:'Za ovaj period nema evidentiranih rezultata.'}/></ReportSection>
   <ReportSection id="report-completed" title="Završene aktivnosti" icon="check" caption={stateCaption}>{data.completedActivities===null?<p className="president-report-empty">Pojedinačne aktivnosti nisu navedene u ovom sačuvanom izveštaju.</p>:<Evidence items={data.completedActivities} activities empty="Nema završenih aktivnosti u ovom prikazu."/>}</ReportSection>
   <ReportSection id="report-problems" title="Problemi i kašnjenja" icon="warning"><Summaries items={summaries} field="problems"/><Evidence items={data.blockers} empty={hasSummary('problems')?null:'Nema prijavljenih problema u ovom periodu.'}/><h3 id="report-late">{mode==='published'?'Kašnjenja zabeležena pri objavi':'Trenutna kašnjenja'}</h3>{data.lateActivities===null?<p className="president-report-empty">Spisak aktivnosti u kašnjenju nije naveden u ovom sačuvanom izveštaju.</p>:<Evidence items={data.lateActivities} activities empty="Nema aktivnosti u kašnjenju."/>}</ReportSection>
   <ReportSection id="report-next" title="Naredni koraci" icon="flag"><Summaries items={summaries} field="nextSteps"/><Evidence items={data.nextSteps} empty={hasSummary('nextSteps')?null:'Naredni koraci još nisu navedeni.'}/></ReportSection>
  </div>
  {context.scope==='company'&&<section className="president-report-publications"><h2>Objavljeni izveštaji sektora ({summaries.length})</h2>{summaries.length?summaries.map(item=><Link key={item.id} to={item.link} state={{reportBack:currentUrl}}><Icon name="file" size={18}/><span>{item.sectorName}<small>{reportPeriod(context)}</small></span><Icon name="chevron" size={18}/></Link>):<p>Za ovaj period još nema objavljenih sektorskih izveštaja. Prikazana je evidencija rada.</p>}</section>}
  {context.scope==='sector'&&mode==='live'&&<p className="president-report-empty">Rukovodilac još nije objavio izveštaj za ovaj period. Prikazana je evidencija rada sektora.</p>}
 </>;
}
export default function PresidentReports({saved=false}){
 const {id:savedId}=useParams(),[search,setSearch]=useSearchParams(),navigate=useNavigate(),location=useLocation(),filters=presidentReportFilters(search);
 const endpoint=saved?'/reports/president?'+new URLSearchParams({reportId:savedId}):filters.scope==='company'||filters.id?'/reports/president?'+reportSearch(filters):null;
 const resource=useEmployeeResource(endpoint,{keepPreviousData:true}),data=resource.data&&(saved?resource.data.reportId===savedId:reportMatches(resource.data,filters))?resource.data:null;
 const context=saved&&data?{scope:data.context.scope,type:data.context.type,day:data.context.periodStart,id:data.context.targetId}:filters;
 const [dateDraft,setDateDraft]=useState(context.day),remembered=useRef({});
 useEffect(()=>setDateDraft(context.day),[context.day]);
 useEffect(()=>{if(context.id)remembered.current[context.scope]=context.id;if(data?.context.sectorId)remembered.current.sector=data.context.sectorId;},[context.id,context.scope,data?.context.sectorId]);
 const back=saved?(location.state?.reportBack||(data?'/reports?'+reportSearch({scope:'company',type:context.type,day:context.day}):'/reports')):context.scope==='project'&&context.id?'/projects/'+context.id:context.scope==='sector'&&context.id?'/sectors/'+context.id:'/';
 usePresidentBackLink(back,'Nazad na '+(saved?'pregled':context.scope==='project'?'projekat':context.scope==='sector'?'sektor':'početnu'));
 const apply=patch=>{const value={...context,...patch};const params=reportSearch(value);if(saved)navigate('/reports?'+params);else setSearch(params);};
 const pickScope=scope=>apply({scope,id:scope==='company'?'':remembered.current[scope]||''});
 return <div className="president-report-page"><div className="president-greeting"><h1>Pregled izveštaja</h1><p>Ostvareni rezultati i ključne aktivnosti</p></div>
  {(!saved||data)&&<div className="president-report-controls"><div className="president-segmented" role="group" aria-label="Nivo izveštaja">{[...reportScopes,...(context.scope==='employee'?[['employee','Zaposleni','user']]:[])].map(([scope,label,icon])=><button key={scope} aria-pressed={context.scope===scope} onClick={()=>pickScope(scope)}><Icon name={icon} size={18}/>{label}</button>)}</div>
   <div className="president-segmented" role="group" aria-label="Tip izveštaja">{[['daily','Dnevni'],['weekly','Nedeljni']].map(([type,label])=><button key={type} aria-pressed={context.type===type} onClick={()=>apply({type})}><Icon name="calendar" size={17}/>{label}</button>)}</div>
   {context.scope!=='company'&&<TargetPicker scope={context.scope} id={context.id} name={data?.context.name} onPick={id=>apply({id})}/>}
   <form className="president-report-period" onSubmit={event=>{event.preventDefault();const day=new FormData(event.currentTarget).get('day');if(validReportDay(day)){setDateDraft(day);apply({day});}}}><button type="button" className="employee-icon-button" aria-label="Prethodni period" disabled={!validReportDay(context.day)} onClick={()=>apply({day:shiftReportDay(context.type,context.day,-1)})}><Icon name="back" size={19}/></button><label htmlFor="president-report-day">{context.type==='weekly'?'Nedelja koja uključuje datum':'Datum'}<input id="president-report-day" name="day" type="date" required value={dateDraft} onInput={event=>setDateDraft(event.currentTarget.value)} onChange={event=>setDateDraft(event.target.value)}/></label><button type="submit" className="employee-text-button">Prikaži</button><button type="button" className="employee-icon-button" aria-label="Naredni period" disabled={!validReportDay(context.day)} onClick={()=>apply({day:shiftReportDay(context.type,context.day,1)})}><Icon name="arrow" size={19}/></button></form>
   {context.scope!=='employee'&&<details className="president-report-extra"><summary>Pregled po zaposlenom</summary><button className="employee-text-button" onClick={()=>pickScope('employee')}>Izaberi zaposlenog <Icon name="arrow" size={16}/></button></details>}
  </div>}
  <ResourceState busy={resource.busy&&!data} error={resource.error} onRetry={resource.reload} noun="izveštaj"/>
  {!endpoint&&<p className="president-report-empty">Izaberite {context.scope==='sector'?'sektor':context.scope==='project'?'projekat':'zaposlenog'} za pregled izveštaja.</p>}
  {data&&<ReportContent key={endpoint} data={data} currentUrl={location.pathname+location.search}/>}
 </div>;
}
