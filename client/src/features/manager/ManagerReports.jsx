import React, {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import {Badge, EmptyState, IconDisc, Pagination, ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {personId} from './projectForm.js';
import {reportFilters, reportPeriod, reportSummary} from './reportPresentation.js';
import ManagerReportPreview from './ManagerReportPreview.jsx';
import './manager-activity-reports.css';

function AutomaticPreview({sectorId, search, setSearch, type, day}) {
  const scope=search.get('scope')==='project'?'project':'sector';
  const target=scope==='sector'?sectorId:search.get('id')||'';
  const [ready,setReady]=useState(false),[projectPage,setProjectPage]=useState(1),[more,setMore]=useState([]),[loadingMore,setLoadingMore]=useState(false),[moreError,setMoreError]=useState('');
  const projects=useEmployeeResource(ready&&scope==='project'?'/projects/sector?limit=50':null);
  const selected=useEmployeeResource(scope==='project'&&target?'/projects/'+target:null);
  const [previewUrl,setPreviewUrl]=useState(null);
  const preview=useEmployeeResource(previewUrl,{live:false});
  const showPreview=event=>{
    event.preventDefault();if(!target)return;
    const url='/reports/preview?'+new URLSearchParams({scope,id:target,type,day});
    if(url===previewUrl)preview.reload();else setPreviewUrl(url);
  };
  const update=patch=>{const next=new URLSearchParams(search);for(const [key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);setPreviewUrl(null);};
  const loadMore=async()=>{setLoadingMore(true);setMoreError('');try{const next=await api('/projects/sector?limit=50&page='+(projectPage+1));setMore(previous=>[...previous,...next.items]);setProjectPage(projectPage+1);}catch(e){setMoreError(e.message);}finally{setLoadingMore(false);}};
  const choices=[...new Map([...(selected.data?[selected.data.project]:[]),...(projects.data?.items||[]),...more].map(project=>[project._id,project])).values()];
  const hasContext=search.has('scope')||search.has('id');
  return <section className="manager-report-auto"><details open={hasContext||undefined} onToggle={event=>{if(event.currentTarget.open)setReady(true);}}><summary><Icon name="chart" size={18}/>Automatski pregled za period</summary><p className="employee-small-note">Pregled nastaje iz postojećih dnevnih unosa, bez ponovnog kucanja sadržaja.</p><form onSubmit={showPreview}><div className="manager-form-pair"><div><label htmlFor="report-scope">Nivo pregleda</label><select id="report-scope" value={scope} onChange={event=>update({scope:event.target.value,id:null})}><option value="sector">Moj sektor</option><option value="project">Projekat sektora</option></select></div><div><label htmlFor="report-day">Datum {type==='weekly'&&'u izabranoj nedelji'}</label><input id="report-day" type="date" required value={day} onChange={event=>update({day:event.target.value})}/></div></div>{scope==='project'&&<><label htmlFor="report-project">Projekat</label><select id="report-project" required value={target} onChange={event=>update({id:event.target.value})}><option value="">Izaberite projekat</option>{choices.map(project=><option value={project._id} key={project._id}>{project.title}</option>)}</select><ResourceState busy={projects.busy&&!projects.data} error={projects.error||selected.error} onRetry={()=>{projects.reload();selected.reload();}} noun="projekte"/>{projects.data&&projectPage*50<projects.data.total&&<button className="employee-text-button" type="button" disabled={loadingMore} onClick={loadMore}>Učitaj još projekata</button>}{moreError&&<p className="employee-form-error" role="alert">{moreError}</p>}</>}<button type="submit" className="manager-secondary-button" disabled={!target||preview.busy}>Prikaži pregled</button></form></details><ResourceState busy={preview.busy} error={preview.error} onRetry={preview.reload} noun="pregled izveštaja"/>{preview.data&&<ManagerReportPreview report={preview.data.report}/>}</section>;
}
export default function ManagerReports({user}) {
  const [search,setSearch]=useSearchParams(),{type,page,day}=reportFilters(search),sectorId=personId(user.sector);
  const sectors=useEmployeeResource('/sectors');
  const list=useEmployeeResource(`/reports?type=${type}&page=${page}&limit=10`);
  const sectorName=sectors.data?.items.find(sector=>sector._id===sectorId)?.name||'Moj sektor';
  const setType=value=>{const next=new URLSearchParams(search);next.set('type',value);next.delete('page');setSearch(next);};
  if(!sectorId)return <p className="employee-form-error" role="alert">Nalog nema dodeljen sektor. Obratite se administratoru.</p>;
  return <div className="manager-reports"><div className="manager-reports-heading"><IconDisc name="chart"/><div><h1>Izveštaji sektora</h1><p>{sectorName}</p></div></div><div className="manager-report-tabs" role="group" aria-label="Tip izveštaja">{[['daily','Dnevni izveštaji'],['weekly','Nedeljni izveštaji']].map(([key,title])=><button key={key} className={type===key?'is-active':''} aria-pressed={type===key} onClick={()=>setType(key)}>{title}</button>)}</div>
    <div className="manager-report-create-links">{[['daily','Novi dnevni izveštaj','chart','Kreiraj izveštaj za dan'],['weekly','Novi nedeljni izveštaj','calendar','Kreiraj izveštaj za nedelju']].map(([key,title,icon,description])=><Link key={key} to={'/reports/new?'+new URLSearchParams({type:key,day})}><IconDisc name={icon}/><div><strong>{title}</strong><small>{description}</small></div><Icon name="chevron" size={14}/></Link>)}</div>
    <div className="manager-reports-content"><section className="manager-report-list" aria-labelledby="sector-reports-heading"><div className="manager-form-section-heading"><h2 id="sector-reports-heading">{type==='daily'?'Dnevni izveštaji':'Nedeljni izveštaji'}</h2>{list.data&&<span className="employee-small-note">Ukupno: {list.data.total}</span>}</div><ResourceState busy={list.busy} error={list.error} onRetry={list.reload} noun="izveštaje"/>{list.data?.items.map(report=><Link className="manager-report-card" key={report._id} to={'/reports/'+report._id}><IconDisc name="calendar"/><div><div className="manager-report-card-title"><strong>{report.type==='weekly'?'Nedeljni izveštaj':'Dnevni izveštaj'}</strong><Badge tone={report.status==='published'?'success':'neutral'}>{report.status==='published'?<><Icon name="check" size={12}/>Objavljen</>:'Nacrt'}</Badge></div><time>{reportPeriod(report)}</time><p>{reportSummary(report)}</p></div><Icon name="chevron" size={17}/></Link>)}{list.data&&!list.data.items.length&&<EmptyState icon="file" title="Još nema izveštaja ovog tipa">Kreirajte nacrt iz dnevnih unosa zaposlenih, pa ga pregledajte pre objave.</EmptyState>}{list.data&&<Pagination {...list.data} label="Stranice izveštaja sektora" onPage={value=>{const next=new URLSearchParams(search);next.set('page',value);setSearch(next);}}/>}</section>
    <AutomaticPreview key={type} sectorId={sectorId} search={search} setSearch={setSearch} type={type} day={day}/></div>
  </div>;
}
