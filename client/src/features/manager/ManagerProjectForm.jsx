import React, {useRef, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState} from '../employee/EmployeeComponents.jsx';
import {projectStatuses} from '../employee/presentation.js';
import {useManagerProjectHeader} from './ManagerShell.jsx';
import {InitialActivityRow, ProjectExitDialog, TeamPicker, useProjectGuard} from './ProjectFormParts.jsx';
import {personId, personName, priorities, projectDraft, projectPayload, saveProjectWithActivities} from './projectForm.js';

function ProjectEditor({project, user, people, activities}) {
  const navigate = useNavigate(), edit = !!project;
  const [baseline, setBaseline] = useState(() => projectDraft(project, user));
  const [draft, setDraft] = useState(baseline), [rows, setRows] = useState([]), [rowStates, setRowStates] = useState({});
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [savedId, setSavedId] = useState(null);
  const [conflict, setConflict] = useState(false), [latest, setLatest] = useState(null), [checking, setChecking] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const session = useRef({projectId: project?._id, version: project?.updatedAt, projectSaved: false, activities: new Map()});
  const lock = useRef(false), complete = useRef(false), form = useRef(null);
  const dirty = (edit ? Object.keys(projectPayload(draft, baseline)).length > 0 : JSON.stringify(draft) !== JSON.stringify(baseline)) || rows.length > 0 || uncertain;
  const guard = useProjectGuard(dirty || saving, complete), locked = saving || !!savedId || uncertain;
  const assigned = [...new Set(activities.flatMap(activity => activity.assignees.map(personId)))];
  const options = [...new Map([...(project?.members || []), ...(project?.owner ? [project.owner] : []), ...people].map(person => [personId(person), person])).values()];
  const eligibleIds = new Set(people.map(personId));
  const team = options.filter(person => draft.memberIds.includes(personId(person)));
  const change = (key, value) => {setDraft(previous => ({...previous, [key]: value})); setError('');};
  const changeTeam = ids => {
    const members = [...new Set([...ids, draft.ownerId, ...assigned].filter(Boolean))];
    change('memberIds', members);
    setRows(previous => previous.map(row => ({...row, assigneeIds: row.assigneeIds.filter(id => members.includes(id))})));
  };
  const save = async event => {
    event.preventDefault(); if (lock.current || uncertain || !form.current.reportValidity()) return;
    if (!savedId && (!draft.title.trim() || !draft.ownerId)) {setError('Unesite naziv i odgovornu osobu.'); return;}
    if (rows.length && ['completed', 'cancelled'].includes(draft.status)) {setError('Za dodavanje aktivnosti projekat treba da bude planiran ili aktivan.'); return;}
    if (rows.some(row => row.assigneeIds.some(id => !draft.memberIds.includes(id)))) {setError('Odgovorni za aktivnosti moraju biti članovi projektnog tima.'); return;}
    lock.current = true; setSaving(true); setError(''); setConflict(false);
    try {
      const result = await saveProjectWithActivities(session.current, {request: api, draft, baseline: edit ? baseline : null, activities: rows,
        onProject: setSavedId, onActivity: (id, state) => setRowStates(previous => ({...previous, [id]: state}))});
      if (!result.failures.length) {complete.current = true; window.dispatchEvent(new Event('zepter:data-changed')); navigate('/projects/' + result.projectId, {replace: true});}
      else setError('Projekat je sačuvan. Proverite označenu aktivnost; već dodate aktivnosti neće biti ponovo kreirane.');
    } catch (e) {
      setError(e.message);
      if (e.status === 409 && edit) {
        try {const fresh = (await api('/projects/' + project._id)).project; if (fresh.updatedAt !== session.current.version) {setLatest(fresh); setConflict(true);}} catch {}
      }
    }
    finally {setUncertain(!!session.current.uncertain); lock.current = false; setSaving(false);}
  };
  const checkLatest = async () => {
    setChecking(true); try {setLatest((await api('/projects/' + project._id)).project);} catch (e) {setError(e.message);} finally {setChecking(false);}
  };
  const adopt = () => {
    const next = projectDraft(latest, user); setBaseline(next); setDraft(next); setRows([]); setRowStates({});
    session.current = {projectId: latest._id, version: latest.updatedAt, projectSaved: false, activities: new Map()};
    setLatest(null); setConflict(false); setUncertain(false); setSavedId(null); setError('');
  };
  return <div className="manager-project-editor"><h1 className="employee-sr-only">{edit ? 'Uredi projekat' : 'Kreiraj projekat'}</h1><p className="manager-form-sector">{edit ? 'Izmenite podatke i sastav tima.' : 'Osnovni podaci, tim i opcione početne aktivnosti.'}</p>
    <form ref={form} onSubmit={save} aria-busy={saving}>
      <fieldset className="manager-project-fields" disabled={locked}><legend className="employee-sr-only">Podaci projekta</legend>
        <label htmlFor="project-title">Naziv projekta <span aria-hidden="true">*</span></label><input id="project-title" required maxLength={220} value={draft.title} onChange={event => change('title', event.target.value)} autoComplete="off"/>
        <label htmlFor="project-description">Opis projekta <span aria-hidden="true">*</span></label><textarea id="project-description" required rows={4} maxLength={5000} value={draft.description} onChange={event => change('description', event.target.value)}/><small className="manager-character-count">{draft.description.length} / 5000</small>
        <div className="manager-form-pair"><div><label htmlFor="project-due">Rok realizacije{!edit && <span aria-hidden="true"> *</span>}</label><input id="project-due" type="date" required={!edit} value={draft.dueDate} onChange={event => change('dueDate', event.target.value)}/></div><div><label htmlFor="project-priority">Prioritet</label><select id="project-priority" value={draft.priority} onChange={event => change('priority', event.target.value)}>{Object.entries(priorities).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></div></div>
        <label htmlFor="project-status">Status</label><select id="project-status" value={draft.status} onChange={event => change('status', event.target.value)}>{Object.entries(projectStatuses).map(([value, status]) => <option key={value} value={value}>{status.label}</option>)}</select>
        <details className="manager-start-date"><summary>Datum početka <small>· opciono</small></summary><label className="employee-sr-only" htmlFor="project-start">Datum početka projekta</label><input id="project-start" type="date" value={draft.startDate} onChange={event => change('startDate', event.target.value)}/></details>
      </fieldset>
      <fieldset className="manager-project-team-fields" disabled={locked}><legend className="employee-sr-only">Odgovorna osoba i tim</legend><label htmlFor="project-owner">Odgovorna osoba <span aria-hidden="true">*</span></label><select id="project-owner" required value={draft.ownerId} onChange={event => {change('ownerId', event.target.value); change('memberIds', [...new Set([...draft.memberIds, event.target.value])]);}}><option value="">Izaberite osobu</option>{options.map(person => <option key={personId(person)} value={personId(person)} disabled={!eligibleIds.has(personId(person))}>{personName(person)}{!eligibleIds.has(personId(person)) ? ' · nije aktivan' : ''}</option>)}</select>
        <div className="manager-form-section-heading"><h2>Tim projekta <small>({team.length})</small></h2><span className="manager-team-avatars" aria-hidden="true">{team.slice(0, 4).map(person => <span className="manager-initials" key={personId(person)}>{[person.firstName, person.lastName].filter(Boolean).map(value => value[0]).join('')}</span>)}{team.length > 4 && <span className="manager-initials">+{team.length - 4}</span>}</span></div>
        <details className="manager-team-disclosure"><summary><Icon name="users" size={18}/>Izaberite članove tima</summary><TeamPicker people={options} unavailableIds={options.filter(person => !eligibleIds.has(personId(person))).map(personId)} selected={draft.memberIds} lockedIds={[draft.ownerId, ...assigned]} disabled={locked} onChange={changeTeam}/></details>
        <p className="employee-small-note">Odgovorna osoba je član tima. Članovi sa postojećim zaduženjima ostaju u timu do preraspodele aktivnosti.</p>
      </fieldset>
      <section className="manager-initial-activities" aria-labelledby="initial-heading"><div className="manager-form-section-heading"><h2 id="initial-heading">{edit ? 'Nove aktivnosti' : 'Početne aktivnosti'} <small>· opciono</small></h2><button className="employee-text-button" type="button" disabled={saving || uncertain || ['completed', 'cancelled'].includes(draft.status)} onClick={() => setRows(previous => [...previous, {id: crypto.randomUUID(), title: '', description: '', dueDate: '', priority: 'medium', assigneeIds: []}])}><Icon name="plusSquare" size={17}/>Dodaj aktivnost</button></div>
        {!rows.length && <p className="employee-small-note">Aktivnosti možete dodati sada ili kasnije sa pregleda projekta.</p>}
        {rows.map(row => <InitialActivityRow key={row.id} row={row} people={team} state={rowStates[row.id]} disabled={saving || uncertain || rowStates[row.id]?.status === 'done'} onChange={next => setRows(previous => previous.map(item => item.id === row.id ? next : item))} onRemove={() => setRows(previous => previous.filter(item => item.id !== row.id))}/>)}
        {edit && <Link className="employee-text-button" to={'/projects/' + project._id}>Pregled postojećih aktivnosti <Icon name="arrow" size={16}/></Link>}
      </section>
      <div className="manager-project-form-feedback">
        {error && <p className="employee-form-error" role="alert">{error}</p>}
        {conflict && edit && <div className="manager-form-notice"><p>Vaš unos je ostao u obrascu. Pregledajte noviju verziju pre nastavka.</p><button type="button" className="employee-text-button" disabled={checking} onClick={checkLatest}>Pregledaj aktuelni projekat</button>{latest && <div><strong>{latest.title}</strong><p>{latest.description}</p><p>Rok: {latest.dueDate ? latest.dueDate.slice(0, 10) : 'Nije postavljen'}</p><p>Početak: {latest.startDate ? latest.startDate.slice(0, 10) : 'Nije postavljen'}</p><p>Status: {projectStatuses[latest.status]?.label} · Prioritet: {priorities[latest.priority]}</p><p>Odgovoran: {personName(latest.owner)}</p><p>Tim: {latest.members.map(personName).join(', ')}</p><button type="button" className="employee-text-button" onClick={adopt}>Odbaci ceo nacrt i preuzmi projekat</button></div>}</div>}
        {uncertain && <div className="manager-form-notice" role="alert"><strong>Potrebna je provera sačuvanih podataka</strong><p>Odgovor servera nije potvrđen. Proverite projekat i aktivnosti pre novog slanja da ne biste napravili duplikate.</p><Link to={session.current.projectId ? '/projects/' + session.current.projectId : '/projects'}>Otvori sačuvane projekte</Link></div>}
        {savedId && !uncertain && <p role="status" className="employee-form-success">Projekat je sačuvan. Preostalo je dodavanje aktivnosti.</p>}
      </div>
      <div className="manager-project-form-actions"><Link className="manager-secondary-button" to={edit ? '/projects/' + project._id : '/projects'}>Otkaži</Link><button className="employee-save-button" disabled={saving || uncertain || (edit && !dirty)} type="submit"><Icon name="check" size={19}/>{saving ? 'Čuvanje…' : savedId ? 'Dodaj preostale aktivnosti' : 'Sačuvaj projekat'}</button></div>
    </form><ProjectExitDialog guard={guard} saving={saving} partial={!!savedId}/>
  </div>;
}
export default function ManagerProjectForm({user}) {
  const {id} = useParams(), sectorId = personId(user.sector);
  useManagerProjectHeader(id ? 'Uređivanje projekta' : 'Kreiranje projekta', id ? '/projects/' + id : '/projects');
  const project = useEmployeeResource(id ? '/projects/' + id : null, {live: false});
  const people = useEmployeeResource(sectorId ? '/sectors/' + sectorId + '/people' : null, {live: false});
  const activities = useEmployeeResource(id ? '/activities/project/' + id : null, {live: false});
  if (!sectorId) return <p role="alert">Nalog nema dodeljen sektor. Obratite se administratoru.</p>;
  const busy = people.busy || (id && (project.busy || activities.busy));
  const error = people.error || project.error || activities.error;
  if (busy || error) return <ResourceState busy={busy} error={error} onRetry={() => {people.reload(); project.reload(); activities.reload();}} noun="obrazac projekta"/>;
  return <ProjectEditor key={id || 'new'} project={project.data?.project} user={user} people={(people.data?.items || []).filter(person => ['employee', 'manager'].includes(person.role))} activities={activities.data?.items || []}/>;
}
