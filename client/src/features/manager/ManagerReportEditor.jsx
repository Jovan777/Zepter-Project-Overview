import React, {useRef, useState} from 'react';
import {Link, useParams, useSearchParams} from 'react-router-dom';
import {api} from '../../api.js';
import Icon from '../../components/Icon.jsx';
import {Badge, EmptyState, IconDisc, ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {DetailProgress} from '../employee/EmployeeProjectDetail.jsx';
import {ProjectExitDialog, useProjectGuard} from './ProjectFormParts.jsx';
import {personId} from './projectForm.js';
import {reportFilters, reportPeriod, validReportDay} from './reportPresentation.js';
import {reportDirty, reportDraft, reportFields, reportHeaders, reportSaveBody} from './reportEditor.js';
import {managerProjectStatus} from './presentation.js';
import ManagerReportPreview from './ManagerReportPreview.jsx';
import './manager-activity-reports.css';
import './manager-report-ideas.css';

function ReportEditor({initial,generated,sectorName,sectorId,type,day,search,setSearch,newRoute}) {
  const [report,setReport]=useState(initial),[snapshot,setSnapshot]=useState(generated);
  const [draft,setDraft]=useState(()=>reportDraft(initial)),[baseline,setBaseline]=useState(()=>reportDraft(initial));
  const [busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[checking,setChecking]=useState(false),[latest,setLatest]=useState(null),[conflict,setConflict]=useState(false);
  const lock=useRef(false),complete=useRef(false),dirty=reportDirty(draft,baseline),published=report?.status==='published';
  const guard=useProjectGuard(dirty||!!busy,complete);
  const ideas=useEmployeeResource('/ideas/sector?limit=1');
  const stats=snapshot?.stats||{},period={type,periodStart:report?.periodStart||snapshot?.periodStart,periodEnd:report?.periodEnd||snapshot?.periodEnd};
  const adopt=fresh=>{setReport(fresh);setSnapshot(fresh.generated);const value=reportDraft(fresh);setDraft(value);setBaseline(value);setLatest(null);setConflict(false);};
  const persist=async()=>{
    if(report&&!dirty)return report;
    const result=await api('/reports',{method:'POST',body:reportSaveBody({sectorId,type,day,draft}),headers:reportHeaders(report)});
    adopt(result.report);return result.report;
  };
  const save=async publish=>{
    if(lock.current||published)return;lock.current=true;setBusy(publish?'publish':'save');setError('');setNotice('');setConflict(false);let saved;
    try{
      saved=await persist();
      if(publish){const result=await api('/reports/'+saved._id+'/publish',{method:'POST',headers:reportHeaders(saved)});adopt(result.report);setNotice('Izveštaj je objavljen i dostupan predsedniku.');}
      else setNotice('Nacrt je sačuvan. Predsedniku će biti dostupan tek nakon objave.');
      window.dispatchEvent(new Event('zepter:data-changed'));
    }catch(e){setError((publish&&saved?'Nacrt je sačuvan. Objava nije potvrđena. ':'')+e.message);setConflict(e.status===409||e.status===403);}
    finally{lock.current=false;setBusy('');}
  };
  const checkSaved=async()=>{
    setChecking(true);setError('');try{
      const result=await api(report?'/reports/'+report._id:'/reports/prepare?'+new URLSearchParams({type,day}));
      if(result.report)setLatest(result.report);else setNotice('Za ovaj period još nema sačuvanog izveštaja. Vaš unos ostaje u obrascu.');
    }catch(e){setError(e.message);}finally{setChecking(false);}
  };
  const changePeriod=patch=>{const next=new URLSearchParams(search);for(const [key,value]of Object.entries(patch))next.set(key,value);setSearch(next);};
  return <div className="manager-report-editor">
    <div className="manager-wave-heading"><IconDisc name="file"/><div><h1>{published?'Objavljen izveštaj':report?'Uređivanje izveštaja':'Kreiranje izveštaja'}</h1><p>{sectorName}</p></div>{report&&<Badge tone={published?'success':'neutral'}>{published?'Objavljen':'Nacrt'}</Badge>}</div>
    {newRoute?<div className="manager-report-period"><div className="manager-report-tabs" role="group" aria-label="Tip novog izveštaja">{[['daily','Dnevni izveštaj'],['weekly','Nedeljni izveštaj']].map(([key,title])=><button key={key} disabled={!!busy} className={type===key?'is-active':''} aria-pressed={type===key} onClick={()=>changePeriod({type:key})}>{title}</button>)}</div><label htmlFor="new-report-day">{type==='weekly'?'Datum u izabranoj nedelji':'Datum izveštaja'}</label><input id="new-report-day" type="date" required disabled={!!busy} value={day} onChange={event=>{if(validReportDay(event.target.value))changePeriod({day:event.target.value});}}/></div>:<p className="manager-report-period-label"><Icon name="calendar" size={16}/>{type==='weekly'?'Nedeljni':'Dnevni'} izveštaj · {reportPeriod(period)}</p>}
    <div className="manager-report-explainer"><Icon name={published?'check':'info'} size={21}/><p>{published?'Sačuvani izveštaj je dostupan predsedniku. Objavljeni sadržaj se više ne uređuje.':report?'Nastavljate sačuvani nacrt za ovaj period. Dopunite sažetak i objavite kada bude spreman.':'Podaci su automatski pripremljeni iz projekata i dnevnih unosa zaposlenih. Dopuna sažetka je opciona.'}</p></div>
    <div className="manager-report-editor-grid"><section className="manager-report-source" aria-labelledby="report-source-heading"><div className="manager-form-section-heading"><h2 id="report-source-heading">Automatski pripremljeni podaci</h2><time>{reportPeriod(period)}</time></div>
      {snapshot?<><div className="manager-report-progress"><div><IconDisc name="flag"/><span><strong>Napredak projekata</strong><small>{stats.projects??0} projekata u sektoru</small></span><b>{stats.avgProgress??0}%</b></div><DetailProgress value={stats.avgProgress??0} label="Prosečan napredak projekata"/></div><div className="manager-report-facts">{[['folder',stats.projects,'Projekata'],['check',stats.completedActivities,'Završenih aktivnosti'],['warning',stats.lateActivities,'Aktivnosti u kašnjenju']].map(([icon,value,title])=><div key={title}><IconDisc name={icon}/><strong>{value??0}</strong><small>{title}</small></div>)}<Link to="/ideas?tab=review"><IconDisc name="bulb"/><strong>{ideas.data?.stats.review??'—'}</strong><small>Ideja na pregledu sada</small></Link></div><p className="employee-small-note">{published?'Statistika projekata sačuvana je prilikom objave.':'Statistika projekata prikazuje stanje u trenutku pripreme i osvežava se pri čuvanju/objavi.'} Urađeni poslovi i prepreke potiču iz dnevnih unosa za izabrani period.</p><details className="manager-report-raw"><summary>Dnevni unosi za period ({stats.workEntries??0})</summary><ManagerReportPreview report={snapshot} saved={!!report}/></details></>:<EmptyState icon="file" title="Ovaj stariji izveštaj nema sačuvane automatske podatke">Sažetak je dostupan ispod.</EmptyState>}
    </section><section className="manager-report-summary" aria-labelledby="report-summary-heading"><h2 id="report-summary-heading">Sažetak rukovodioca</h2><p className="employee-small-note">Ne morate ponovo unositi dnevne evidencije. Ovde dodajte zaključke, prioritete ili objašnjenja.</p><form onSubmit={event=>{event.preventDefault();save(false);}} aria-busy={!!busy}><fieldset disabled={!!busy||published}>{reportFields.map(([key,title])=><div className="manager-report-field" key={key}>{published?<h3>{title}</h3>:<label htmlFor={'summary-'+key}>{title}<small> · opciono</small></label>}{published?<p className="manager-report-readonly">{draft[key]||'Nema dodatnog komentara.'}</p>:<><textarea id={'summary-'+key} rows={key==='results'?4:3} maxLength={8000} value={draft[key]} onChange={event=>{setDraft(previous=>({...previous,[key]:event.target.value}));setNotice('');}} placeholder={key==='results'?'Ključni rezultati i zaključci…':key==='problems'?'Prepreke, rizici ili potrebna podrška…':'Prioriteti i naredni koraci…'}/><small className="manager-report-character-count">{draft[key].length} / 8000</small></>}</div>)}</fieldset>
      {!published&&<div className="manager-report-submit"><button type="submit" className="manager-secondary-button" disabled={!!busy||checking||!!report&&!dirty}><Icon name="file" size={17}/>{busy==='save'?'Čuvanje…':'Sačuvaj nacrt'}</button><button type="button" className="employee-save-button" disabled={!!busy||checking} onClick={()=>save(true)}><Icon name="check" size={18}/>{busy==='publish'?'Objavljivanje…':'Objavi izveštaj'}</button></div>}
    </form><p className="employee-draft-status" role="status">{dirty?'Imate nesačuvane izmene':published?'Objavljeni izveštaj je zaključan':report?'Sve izmene su sačuvane':'Pregled još nije sačuvan kao nacrt'}</p>
    {notice&&<p className="employee-form-success" role="status">{notice}</p>}{error&&<p className="employee-form-error" role="alert">{error}</p>}{!published&&<button className="employee-text-button manager-report-check" disabled={!!busy||checking} onClick={checkSaved}>{checking?'Provera…':'Proveri sačuvan izveštaj'}</button>}{(conflict||latest)&&<div className="manager-form-notice"><p>Vaš unos ostaje u formi. Uporedite sačuvanu verziju pre nastavka.</p>{latest&&<><strong>{latest.status==='published'?'Objavljen izveštaj':'Sačuvani nacrt'} · {reportPeriod(latest)}</strong>{reportFields.map(([key,title])=><p className="manager-report-readonly" key={key}><b>{title}:</b> {latest[key]||'Bez dopune'}</p>)}<button className="employee-text-button" disabled={!!busy} onClick={()=>{adopt(latest);setError('');setNotice('Preuzeta je sačuvana verzija.');}}>Odbaci moj unos i preuzmi sačuvanu verziju</button></>}</div>}
    <Link className="employee-text-button manager-report-back" to={'/reports?type='+type}><Icon name="back" size={17}/>Svi izveštaji sektora</Link>
    </section><section className="manager-report-projects" aria-labelledby="report-projects-heading"><h2 id="report-projects-heading">Uključeni projekti ({snapshot?.projects?.length??0})</h2>{snapshot?.projects?.map(project=>{const status=managerProjectStatus(project);return <Link to={'/projects/'+project.id} key={project.id}><Icon name="folder" size={17}/><strong>{project.title}</strong><Badge tone={status.tone}>{project.progress}%</Badge><span>{status.label}</span><Icon name="chevron" size={15}/></Link>;})}{!snapshot?.projects?.length&&<p className="employee-small-note">Nema sačuvane liste projekata u ovom pregledu.</p>}</section></div><ProjectExitDialog guard={guard} saving={!!busy} entity="izveštaja"/>
  </div>;
}
export default function ManagerReportEditor({user}) {
  const {id}=useParams(),[search,setSearch]=useSearchParams(),defaults=reportFilters(search),sectorId=personId(user.sector);
  const resource=useEmployeeResource(id?'/reports/'+id:'/reports/prepare?'+new URLSearchParams({type:defaults.type,day:defaults.day}),{live:false});
  const sectors=useEmployeeResource('/sectors');
  const source=resource.data,report=source?.report;
  const sectorName=source?.sector?.name||sectors.data?.items.find(sector=>sector._id===sectorId)?.name||'Moj sektor';
  return <><ResourceState busy={resource.busy} error={resource.error} onRetry={resource.reload} noun="izveštaj"/>{source&&<ReportEditor key={id||defaults.type+defaults.day} initial={report} generated={source.generated||report?.generated} sectorName={sectorName} sectorId={sectorId} type={report?.type||defaults.type} day={report?.periodStart||defaults.day} search={search} setSearch={setSearch} newRoute={!id}/>}</>;
}
