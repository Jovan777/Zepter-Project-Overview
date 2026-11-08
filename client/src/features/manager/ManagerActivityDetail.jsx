import React, {useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import {api} from '../../api.js';
import Icon from '../../components/Icon.jsx';
import {Badge, IconDisc, ResourceState} from '../employee/EmployeeComponents.jsx';
import {DetailProgress} from '../employee/EmployeeProjectDetail.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import EmployeeAttachments from '../employee/EmployeeAttachments.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {activityStatuses} from '../employee/presentation.js';
import {useManagerProjectHeader} from './ManagerShell.jsx';
import {ProjectExitDialog, TeamPicker, useProjectGuard} from './ProjectFormParts.jsx';
import {formatProjectDate, personId, personName, priorities} from './projectForm.js';
import {changeManagerActivity, managerActivityDraft, managerActivityPatch} from './activityManagement.js';
import ManagerActivityHistory from './ManagerActivityHistory.jsx';
import './manager-activity-reports.css';

function ActivityView({initial, projectContext, user}) {
  const [activity,setActivity]=useState(initial),[baseline,setBaseline]=useState(()=>managerActivityDraft(initial));
  const [draft,setDraft]=useState(baseline),[version,setVersion]=useState(initial.updatedAt);
  const [view,setView]=useState('details'),[editing,setEditing]=useState(false),[historyReady,setHistoryReady]=useState(false);
  const [threadDirty,setThreadDirty]=useState(false);
  const [saving,setSaving]=useState(false),[checking,setChecking]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[conflict,setConflict]=useState(false),[latest,setLatest]=useState(null);
  const complete=useRef(false),lock=useRef(false),editor=useRef(null),composer=useRef(null);
  const project=useEmployeeResource('/projects/'+projectContext._id,{keepPreviousData:true});
  const eligible=useEmployeeResource(editing?'/sectors/'+personId(user.sector)+'/people':null,{live:false});
  const attachments=useEmployeeResource('/attachments/target/activity/'+activity._id,{keepPreviousData:true});
  const comments=useEmployeeResource(`/comments?targetType=activity&targetId=${activity._id}&limit=1`,{keepPreviousData:true});
  const dirty=Object.keys(managerActivityPatch(draft,baseline)).length>0;
  const guard=useProjectGuard(dirty||saving||threadDirty,complete);
  const members=project.data?.project.members||[];
  const allPeople=[...new Map([...activity.assignees,...members].filter(person=>person?._id).map(person=>[personId(person),person])).values()];
  const nameOf=id=>allPeople.find(person=>personId(person)===personId(id))||id;
  const adopt=fresh=>{
    const next=managerActivityDraft(fresh);setActivity(fresh);setDraft(next);setBaseline(next);setVersion(fresh.updatedAt);
    setConflict(false);setLatest(null);setError('');
  };
  const change=(key,value)=>{setDraft(previous=>changeManagerActivity(previous,key,value));setNotice('');};
  const select=key=>{setView(key);if(key==='history')setHistoryReady(true);};
  const begin=focus=>{setEditing(true);setView('details');setNotice('');requestAnimationFrame(()=>{editor.current?.scrollIntoView({block:'start'});document.getElementById(focus)?.focus();});};
  const save=async event=>{
    event.preventDefault();if(lock.current||!dirty)return;
    if(!draft.title.trim()){setError('Unesite naziv aktivnosti.');return;}
    if(draft.assigneeIds.length>30){setError('Izaberite najviše 30 odgovornih osoba.');return;}
    lock.current=true;setSaving(true);setError('');setNotice('');
    try{
      const response=await api('/activities/'+activity._id,{method:'PATCH',body:managerActivityPatch(draft,baseline),headers:version?{'If-Match':`"${version}"`}:{}});
      adopt({...response.activity,assignees:response.activity.assignees.map(nameOf)});setEditing(false);
      setNotice('Aktivnost je sačuvana. Napredak projekta je ažuriran.');window.dispatchEvent(new Event('zepter:data-changed'));
    }catch(e){setError(e.message);setConflict(e.status===409);}
    finally{lock.current=false;setSaving(false);}
  };
  const refresh=async compare=>{
    setChecking(true);setError('');try{const fresh=(await api('/activities/'+activity._id)).activity;if(compare)setLatest(fresh);else adopt(fresh);}catch(e){setError(e.message);}finally{setChecking(false);}
  };
  const status=editing?draft.status:activity.status,progress=editing?draft.progress:activity.progress;
  const panel=key=>'manager-activity-panel manager-activity-panel--'+key+((view===key||view==='details'&&['files','comments'].includes(key))?' is-current':'');
  return <div className="manager-activity-detail" data-view={view}>
    <h1>Detalji aktivnosti — Upravljanje</h1><nav className="manager-activity-breadcrumb" aria-label="Putanja aktivnosti"><Link to={'/projects/'+projectContext._id}>{projectContext.title}</Link><Icon name="chevron" size={13}/><span>Aktivnost</span></nav>
    <section className="manager-activity-overview" aria-label="Pregled aktivnosti"><div className="manager-activity-overview-heading"><IconDisc name="calendar"/><div><h2>{activity.title}</h2><p>{activity.description||'Opis još nije dodat.'}</p></div><Badge tone={status==='completed'?'success':status==='blocked'?'warning':status==='planned'?'neutral':'gold'}>{activityStatuses[status]}</Badge></div><div className="manager-project-progress-heading"><strong>Napredak</strong><strong>{progress}%</strong></div><DetailProgress value={progress} label="Napredak aktivnosti"/><dl className="manager-activity-facts"><div><dt>Odgovorne osobe</dt><dd>{activity.assignees.length?activity.assignees.map(person=>personName(nameOf(person))).join(', '):'Nisu dodeljene'}</dd></div><div><dt><Icon name="calendar" size={16}/>Rok</dt><dd>{formatProjectDate(activity.dueDate)}</dd></div><div><dt><Icon name="flag" size={16}/>Prioritet</dt><dd className={['high','urgent'].includes(activity.priority)?'is-urgent':''}>{priorities[activity.priority]||'Nije zadat'}</dd></div></dl></section>
    <nav className="manager-project-tabs" aria-label="Prikaz aktivnosti">{[['details','Detalji'],['files','Prilozi',attachments.data?.items.length],['comments','Komentari',comments.data?.total],['history','Istorija']].map(([key,title,count])=><button type="button" key={key} aria-pressed={view===key} aria-controls={'manager-activity-'+key} className={view===key?'is-active':''} onClick={()=>select(key)}>{title}{count!==undefined&&` (${count})`}</button>)}</nav>
    <div className="manager-activity-content-grid"><div className="manager-activity-main">
      <section className={panel('details')} id="manager-activity-details" aria-labelledby="activity-details-heading"><div className="manager-form-section-heading"><h2 id="activity-details-heading">Detalji aktivnosti</h2>{!editing&&<button className="employee-text-button" onClick={()=>begin('managed-title')}><Icon name="edit" size={16}/>Uredi</button>}</div>
        {!editing?<div className="manager-activity-work"><article><IconDisc name="flag"/><div><h3>Opis i cilj</h3><p>{activity.description||'Još nije unet opis.'}</p></div></article><article><IconDisc name="check"/><div><h3>Šta je urađeno</h3><p>{activity.actualWork||'Zaposleni još nije uneo urađeni posao.'}</p></div></article>{activity.nextStep&&<article><IconDisc name="arrow"/><div><h3>Sledeći korak</h3><p>{activity.nextStep}</p></div></article>}{activity.blockers&&<article className="manager-activity-blockers"><IconDisc name="warning"/><div><h3>Prepreke</h3><p>{activity.blockers}</p></div></article>}</div>:<form ref={editor} className="manager-activity-editor" onSubmit={save} aria-label="Upravljanje aktivnošću" aria-busy={saving}><fieldset disabled={saving}>
          <label htmlFor="managed-title">Naziv aktivnosti</label><input id="managed-title" required maxLength={220} value={draft.title} onChange={e=>change('title',e.target.value)}/><label htmlFor="managed-description">Opis i cilj</label><textarea id="managed-description" rows={3} maxLength={5000} value={draft.description} onChange={e=>change('description',e.target.value)}/>
          <div className="manager-form-pair"><div><label htmlFor="managed-due">Rok</label><input id="managed-due" type="date" value={draft.dueDate} onChange={e=>change('dueDate',e.target.value)}/></div><div><label htmlFor="managed-priority">Prioritet</label><select id="managed-priority" value={draft.priority} onChange={e=>change('priority',e.target.value)}>{Object.entries(priorities).map(([key,title])=><option value={key} key={key}>{title}</option>)}</select></div></div>
          <label htmlFor="managed-status">Status</label><select id="managed-status" value={draft.status} onChange={e=>change('status',e.target.value)}>{Object.entries(activityStatuses).map(([key,title])=><option value={key} key={key}>{title}</option>)}</select><label htmlFor="managed-progress">Napredak <output htmlFor="managed-progress">{draft.progress}%</output></label><input id="managed-progress" type="range" min="0" max="100" step="1" value={draft.progress} onChange={e=>change('progress',e.target.value)}/>{draft.progress===100&&draft.status==='review'&&<p className="employee-small-note">Na 100% aktivnost ide na proveru. Za konačnu potvrdu izaberite „Završeno“.</p>}
          <div id="managed-assignees"><h3>Odgovorne osobe</h3><ResourceState busy={project.busy&&!project.data||eligible.busy} error={project.error||eligible.error} onRetry={()=>{project.reload();eligible.reload();}} noun="članove projekta"/>{project.data&&eligible.data&&<TeamPicker id="activity-assignee-search" people={members} selected={draft.assigneeIds} maxSelected={30} unavailableIds={members.filter(person=>!eligible.data.items.some(option=>personId(option)===personId(person))).map(personId)} onChange={ids=>change('assigneeIds',ids)}/>}<p className="employee-small-note">Birate članove projektnog tima. <Link to={'/projects/'+projectContext._id+'/edit'}>Izmenite tim projekta</Link> ako osoba nedostaje.</p></div>
          <details className="manager-work-edit"><summary>Uredi zapis o radu</summary><p className="employee-small-note">Ovo menja pregled aktivnosti. Prethodni dnevni unosi zaposlenih ostaju u istoriji i izveštajima.</p>{[['actualWork','Šta je urađeno',5000],['nextStep','Sledeći korak',4000],['blockers','Prepreke',4000]].map(([key,title,max])=><label key={key} htmlFor={'managed-'+key}>{title}<textarea id={'managed-'+key} rows={3} maxLength={max} value={draft[key]} onChange={e=>change(key,e.target.value)}/></label>)}</details>
        </fieldset><div className="manager-activity-edit-actions"><button type="button" className="manager-secondary-button" disabled={saving} onClick={()=>{setDraft(baseline);setEditing(false);setConflict(false);setError('');}}>Otkaži izmene</button><button type="submit" className="employee-save-button" disabled={saving||!dirty||!!project.error||eligible.busy}><Icon name="check" size={18}/>{saving?'Čuvanje…':'Sačuvaj izmene'}</button></div><p className="employee-draft-status" role="status">{dirty?'Imate nesačuvane izmene':'Sve izmene su sačuvane'}</p></form>}
      </section>
      {error&&<p className="employee-form-error" role="alert">{error}</p>}{notice&&<p className="employee-form-success" role="status">{notice}</p>}{conflict&&<div className="manager-form-notice"><p>Vaš unos ostaje sačuvan u formi. Proverite noviju verziju pre nastavka.</p><button className="employee-text-button" disabled={checking||saving} onClick={()=>refresh(true)}>Pogledaj aktuelnu aktivnost</button>{latest&&<div><strong>{latest.title} · {activityStatuses[latest.status]} · {latest.progress}%</strong><p>{latest.description}</p><p>Rok: {formatProjectDate(latest.dueDate)} · Prioritet: {priorities[latest.priority]||'Nije zadat'}</p><p>Odgovorni: {latest.assignees.map(personName).join(', ')||'Nisu dodeljeni'}</p><p>{latest.actualWork}</p><p>{latest.nextStep}</p><p>{latest.blockers}</p><button className="employee-text-button" onClick={()=>adopt(latest)}>Odbaci moj unos i preuzmi ovu verziju</button></div>}</div>}
      <div className={panel('files')} id="manager-activity-files"><EmployeeAttachments type="activity" id={activity._id} user={user} editable resource={attachments} showCount/></div>
      <div className={panel('history')} id="manager-activity-history">{historyReady&&<ManagerActivityHistory id={activity._id}/>}</div>
    </div><aside className={panel('comments')} id="manager-activity-comments" ref={composer}><EmployeeThread type="activity" id={activity._id} user={user} heading="Komentari i instrukcije" sectionId="managed-activity-thread" allowInstructions onDraftChange={setThreadDirty}/></aside></div>
    <div className="manager-project-actions manager-activity-actions"><button className="manager-secondary-button" onClick={()=>begin('managed-title')}><Icon name="edit" size={16}/>Uredi aktivnost</button><button className="manager-secondary-button" onClick={()=>{begin();requestAnimationFrame(()=>document.getElementById('managed-assignees')?.scrollIntoView({block:'start'}));}}><Icon name="user" size={16}/>Dodeli</button><button className="employee-save-button" onClick={()=>begin('managed-status')}><Icon name="check" size={16}/>Ažuriraj status</button></div>
    <div className="manager-activity-utilities"><button className="employee-text-button" disabled={dirty||saving||checking} onClick={()=>refresh(false)}>Osveži podatke</button><button className="employee-text-button" onClick={()=>{select('comments');requestAnimationFrame(()=>composer.current?.scrollIntoView({block:'start'}));}}><Icon name="message" size={16}/>Dodaj komentar</button></div><ProjectExitDialog guard={guard} saving={saving} entity="aktivnosti"/>
  </div>;
}
export default function ManagerActivityDetail({user}) {
  const {id}=useParams();const resource=useEmployeeResource('/activities/'+id,{live:false});
  useManagerProjectHeader('Detalji aktivnosti',resource.data?'/projects/'+resource.data.project._id:'/projects');
  return resource.data?<ActivityView key={id} initial={resource.data.activity} projectContext={resource.data.project} user={user}/>:<ResourceState busy={resource.busy} error={resource.error} onRetry={resource.reload} noun="aktivnost"/>;
}
