import React, {useEffect, useRef, useState} from 'react';
import {useBlocker, useParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import useEmployeeResource from './useEmployeeResource.js';
import {IconDisc, ResourceState} from './EmployeeComponents.jsx';
import {activityStatuses, formatDeadline} from './presentation.js';
import {activityDraft, changeActivityDraft, sameActivityDraft} from './activityForm.js';
import {ActivityBadge, DetailProgress} from './EmployeeProjectDetail.jsx';
import {useEmployeeBackLink} from './EmployeeShell.jsx';
import EmployeeAttachments from './EmployeeAttachments.jsx';
import EmployeeThread from './EmployeeThread.jsx';
import {usePresidentBackLink} from '../president/navigation.jsx';

function ActivityView({activity, project, user, reload}) {
  const editable = user.role!=='president' && activity.assignees.some(person => (person._id || person) === user._id);
  const [draft, setDraft] = useState(() => activityDraft(activity));
  const [baseline, setBaseline] = useState(() => activityDraft(activity));
  const [version, setVersion] = useState(activity.updatedAt);
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false), [latest, setLatest] = useState(null), [checking, setChecking] = useState(false);
  const [threadDirty,setThreadDirty]=useState(false);
  const dialog = useRef(null), saveLock = useRef(false);
  const dirty = editable && !sameActivityDraft(draft, baseline);
  const guarded=dirty||threadDirty||saving;
  const blocker = useBlocker(({currentLocation, nextLocation}) => guarded && !['/login','/predsednik','/president'].includes(nextLocation.pathname) && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);
  useEffect(() => {
    if (!guarded) return;
    const unload = event => {event.preventDefault(); event.returnValue = '';};
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [guarded]);
  useEffect(() => {
    if (blocker.state === 'blocked' && !dialog.current?.open) dialog.current?.showModal();
    return () => dialog.current?.close();
  }, [blocker.state]);
  const change = (field, value) => {setDraft(current => changeActivityDraft(current, field, value)); setNotice('');};
  const save = async () => {
    if (!editable || saveLock.current || !dirty) return !dirty;
    saveLock.current = true; setSaving(true); setError(''); setNotice('');
    try {
      const response = await api('/activities/' + activity._id, {method: 'PATCH', body: draft, headers: version ? {'If-Match': `"${version}"`} : {}});
      const saved = activityDraft(response.activity);
      setDraft(saved); setBaseline(saved); setVersion(response.activity.updatedAt); setConflict(false); setLatest(null);
      setNotice('Izmene su sačuvane. Napredak projekta je ažuriran.'); reload();
      return true;
    } catch (e) {setError(e.message); setConflict(e.status === 409); return false;}
    finally {saveLock.current = false; setSaving(false);}
  };
  const compareLatest = async () => {
    setChecking(true);
    try {const response = await api('/activities/' + activity._id); setLatest(response.activity);}
    catch (e) {setError(e.message);}
    finally {setChecking(false);}
  };
  return <div className="employee-activity-detail">
    <nav className="employee-breadcrumb" aria-label="Putanja"><Link to={'/projects/' + project._id}>{project.title}</Link><Icon name="arrow" size={15}/><span>Aktivnost</span></nav>
    <div className="employee-detail-title"><h1>{activity.title}</h1><ActivityBadge status={draft.status}/></div>
    <p className="employee-detail-description">{editable ? 'Moja aktivnost u okviru projekta.' : 'Pregled aktivnosti projektnog tima.'}</p>
    <section className="employee-activity-summary" aria-label="Pregled aktivnosti"><IconDisc name="monitor"/><div><DetailProgress value={draft.progress} label="Napredak aktivnosti" leading/><div className="employee-activity-facts"><span><Icon name="calendar" size={18}/>Rok: {formatDeadline(activity.dueDate)}</span><span><Icon name="user" size={18}/>{activity.assignees.length ? activity.assignees.map(person => `${person.firstName} ${person.lastName}`).join(', ') : 'Nema dodeljenih osoba'}</span></div></div></section>
    {activity.description && <details className="employee-detail-disclosure employee-activity-description"><summary><Icon name="info" size={19}/><span>Opis aktivnosti</span><Icon name="chevron" size={16}/></summary><p>{activity.description}</p></details>}
    <div className="workspace-detail-grid"><div className="workspace-detail-primary">{editable ? <form className="employee-activity-form" onSubmit={event => {event.preventDefault(); save();}} aria-label="Uređivanje aktivnosti">
      <fieldset disabled={saving}>
        <div className="employee-edit-row"><IconDisc name="clock"/><label htmlFor="activity-status">Status</label><select id="activity-status" value={draft.status} onChange={event => change('status', event.target.value)}>{Object.entries(activityStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="employee-edit-row employee-edit-progress"><IconDisc name="chart"/><label htmlFor="activity-progress">Napredak</label><output htmlFor="activity-progress">{draft.progress}%</output><input id="activity-progress" type="range" min="0" max="100" step="1" value={draft.progress} style={{'--range-progress': draft.progress + '%'}} onChange={event => change('progress', event.target.value)}/></div>
        {draft.progress === 100 && draft.status === 'review' && <p className="employee-small-note">Na 100% aktivnost ide na proveru. Izaberite „Završeno“ kada je posao konačno završen.</p>}
        <div className="employee-edit-field"><IconDisc name="file"/><div><label htmlFor="activity-work">Šta je urađeno</label><textarea id="activity-work" rows={3} maxLength={5000} value={draft.actualWork} onChange={event => change('actualWork', event.target.value)} placeholder="Ukratko opišite urađeni posao…"/></div></div>
        <div className="employee-edit-field"><IconDisc name="flag"/><div><label htmlFor="activity-next">Sledeći korak <small>opciono</small></label><textarea id="activity-next" rows={2} maxLength={4000} value={draft.nextStep} onChange={event => change('nextStep', event.target.value)} placeholder="Šta planirate sledeće?"/></div></div>
        {draft.status === 'blocked' || draft.blockers ? <div className="employee-edit-field"><IconDisc name="info"/><div><label htmlFor="activity-blockers">Prepreke</label><textarea id="activity-blockers" rows={2} maxLength={4000} value={draft.blockers} onChange={event => change('blockers', event.target.value)} placeholder="Šta vas sprečava da nastavite?"/></div></div> : <details className="employee-detail-disclosure"><summary><Icon name="info" size={19}/><span>Dodaj prepreku</span><Icon name="chevron" size={16}/></summary><label className="employee-sr-only" htmlFor="activity-blockers">Prepreke</label><textarea id="activity-blockers" rows={2} maxLength={4000} value={draft.blockers} onChange={event => change('blockers', event.target.value)} placeholder="Navedite problem ili pomoć koja vam je potrebna…"/></details>}
      </fieldset>
      <div className="employee-save-bar"><span className="employee-draft-status" role="status">{saving ? 'Čuvamo vaše izmene…' : dirty ? 'Imate nesačuvane izmene' : 'Sve izmene su sačuvane'}</span><button className="employee-save-button" type="submit" disabled={saving || !dirty}>{saving ? 'Čuvanje…' : 'Sačuvaj izmene'}<Icon name="check" size={20}/></button></div>
      {error && <p className="employee-form-error" role="alert">{error}</p>}
      {notice && <p className="employee-form-success" role="status">{notice}</p>}
      {conflict && <div className="employee-conflict"><p>Vaš unos je ostao u poljima. Proverite šta je izmenio drugi član tima pre nastavka.</p><button type="button" className="employee-text-button" disabled={checking || saving} onClick={compareLatest}>{checking ? 'Učitavanje…' : 'Pogledaj aktuelnu verziju'}</button>{latest && <div><strong>Aktuelno: {activityStatuses[latest.status]} · {latest.progress}%</strong><p>{latest.actualWork || 'Nema opisa urađenog posla.'}</p><button type="button" className="employee-text-button" onClick={() => {const fresh = activityDraft(latest); setDraft(fresh); setBaseline(fresh); setVersion(latest.updatedAt); setConflict(false); setLatest(null); setError(''); reload();}}>Odbaci moj unos i preuzmi ovu verziju</button></div>}</div>}
      {!dirty && baseline.actualWork.trim() && <Link className="employee-daily-link" to="/daily" state={{activityId: activity._id}}><Icon name="calendar" size={18}/>Dodaj urađeno u dnevni izveštaj<Icon name="arrow" size={17}/></Link>}
    </form> : <><div className="employee-readonly-note"><Icon name="info" size={20}/><p>Ovu aktivnost uređuju dodeljene osobe. Možete pregledati priloge i učestvovati u razgovoru.</p></div><section className="employee-readonly-work"><h2>Šta je urađeno</h2><p>{activity.actualWork || 'Još nema unosa.'}</p>{activity.nextStep && <><h3>Sledeći korak</h3><p>{activity.nextStep}</p></>}{activity.blockers && <><h3>Prepreke</h3><p>{activity.blockers}</p></>}</section></>}
    <EmployeeAttachments type="activity" id={activity._id} user={user} editable={editable}/>
    </div><div className="workspace-detail-aside"><EmployeeThread type="activity" id={activity._id} user={user} heading={user.role==='president'?'Komentari i instrukcije':'Komentari i odgovori'} allowInstructions={user.role==='president'} sectionId="activity-comments" onDraftChange={setThreadDirty}/></div></div>
    <dialog className="employee-unsaved-dialog" ref={dialog} aria-label="Nesačuvane izmene" onCancel={event => {event.preventDefault(); blocker.reset?.();}}><h2>Sačuvati izmene pre izlaska?</h2><p>{threadDirty?'Imate neposlat komentar. Ostanite na ekranu da biste završili razgovor.':'Uneli ste izmene u aktivnost koje još nisu sačuvane.'}</p><button className="employee-save-button" disabled={saving||threadDirty} onClick={async () => {if (await save()) blocker.proceed?.();}}>Sačuvaj i nastavi</button><button className="employee-text-button" disabled={saving} onClick={() => blocker.proceed?.()}>Odbaci izmene</button><button className="employee-text-button" disabled={saving} onClick={() => blocker.reset?.()}>Ostani ovde</button>{error && <p role="alert" className="employee-form-error">{error}</p>}</dialog>
  </div>;
}

export default function EmployeeActivityDetail({user}) {
  const {id} = useParams();
  const resource = useEmployeeResource('/activities/' + id, {live: false, keepPreviousData: true});
  const project = resource.data?.project;
  usePresidentBackLink(user.role==='president'?(project?'/projects/'+project._id:'/projects'):null,'Nazad na projekat');
  useEmployeeBackLink(project ? '/projects/' + project._id : '/projects', project ? 'Nazad na projekat' : 'Nazad na moje projekte');
  if (!resource.data) return <ResourceState {...resource} onRetry={resource.reload} noun="aktivnost"/>;
  return <><ResourceState error={resource.error} onRetry={resource.reload}/><ActivityView key={id} activity={resource.data.activity} project={project} user={user} reload={resource.reload}/></>;
}
