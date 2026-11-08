import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import {api} from '../../api.js';
import useEmployeeResource from './useEmployeeResource.js';
import {belgradeDate} from './presentation.js';
import {Pagination,ResourceState} from './EmployeeComponents.jsx';
import {ProjectExitDialog,useProjectGuard} from '../manager/ProjectFormParts.jsx';
import {uncertainWrite} from '../workspace/mutations.js';

export default function EmployeeDailyEntry({user}) {
  const {state} = useLocation();
  const activityId = typeof state?.activityId === 'string' && /^[a-f\d]{24}$/i.test(state.activityId) ? state.activityId : null;
  const source = useEmployeeResource(activityId ? '/activities/' + activityId : null, {live: false});
  const [page,setPage]=useState(1);
  const previous = useEmployeeResource('/worklogs/mine?limit=15&page='+page, {keepPreviousData: true});
  const applied = useRef(null), lock = useRef(false);
  const [form, setForm] = useState({day: belgradeDate(), done: '', nextSteps: '', blockers: '', minutes: 0});
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [saving, setSaving] = useState(false);
  const [uncertain,setUncertain]=useState(false),complete=useRef(false);
  const guard=useProjectGuard(!!form.done.trim()||!!form.nextSteps.trim()||!!form.blockers.trim()||Number(form.minutes)>0||saving||uncertain,complete);
  const allowed = !activityId || source.data?.activity.assignees.some(p => (p._id || p) === user._id);
  useEffect(() => {
    const activity = source.data?.activity;
    if (activity && allowed && applied.current !== activity._id) {
      applied.current = activity._id;
      setForm(current => ({...current, done: activity.actualWork || '', nextSteps: activity.nextStep || '', blockers: activity.blockers || ''}));
    }
  }, [source.data, allowed]);
  const submit = async event => {
    event.preventDefault();
    if (lock.current || uncertain || !allowed || source.busy) return;
    lock.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      await api('/worklogs', {method: 'POST', body: {...form, minutes: Number(form.minutes), ...(activityId ? {activityId} : {})}});
      setForm(current => ({...current, done: '', nextSteps: '', blockers: '', minutes: 0}));
      setSuccess('Dnevni unos je sačuvan i dostupan u izveštajima.');setPage(1);previous.reload();
    } catch (e) {setError(e.message);if(uncertainWrite(e)){setUncertain(true);setPage(1);previous.reload();}}
    finally {lock.current = false; setSaving(false);}
  };
  return <><h1>Moj dnevni unos</h1><p className="muted">{activityId ? 'Podaci su preuzeti iz sačuvane aktivnosti. Pregledajte ih i potvrdite dnevni unos.' : 'Evidentirajte urađeni posao, naredne korake i eventualne prepreke.'}</p>
    {activityId && <ResourceState busy={source.busy} error={source.error} onRetry={source.reload} noun="aktivnost"/>}
    {source.data && <Link className="employee-daily-source" to={'/activities/' + source.data.activity._id}>{source.data.activity.title}</Link>}
    {source.data && !allowed && <p className="employee-form-error" role="alert">Dnevni unos možete povezati samo sa svojom aktivnošću.</p>}
    <form onSubmit={submit} className="employee-daily-form"><fieldset disabled={saving || source.busy || !allowed || !!source.error}>
      {[
        ['day', 'Datum', 'date'], ['done', 'Šta je urađeno', 'textarea'], ['nextSteps', 'Sledeći koraci', 'textarea'], ['blockers', 'Prepreke', 'textarea'], ['minutes', 'Broj minuta', 'number']
      ].map(([key, label, type]) => <label className="field" key={key}><span>{label}</span>{type === 'textarea' ? <textarea required={key === 'done'} maxLength={key === 'done' ? 5000 : 4000} rows={key === 'done' ? 3 : 2} value={form[key]} onChange={event => setForm(current => ({...current, [key]: event.target.value}))}/> : <input type={type} required value={form[key]} min={type === 'number' ? 0 : undefined} max={type === 'number' ? 1440 : undefined} onChange={event => setForm(current => ({...current, [key]: event.target.value}))}/>}</label>)}
      <button className="employee-save-button" disabled={saving || uncertain || !form.done.trim()}>{saving ? 'Čuvanje…' : 'Sačuvaj dnevni unos'}</button>
    </fieldset></form>
    {error && <p className="employee-form-error" role="alert">{error}</p>}{success && <p className="employee-form-success" role="status">{success}</p>}
    {uncertain&&<div className="employee-conflict" role="alert"><p>Unos je možda već sačuvan. Tekst je ostao u formi. Proverite prethodne unose da ga ne biste poslali dvaput.</p><button className="employee-text-button" onClick={()=>{setPage(1);previous.reload();}}>Proveri prethodne unose</button><button className="employee-text-button" onClick={()=>{setForm(current=>({...current,done:'',nextSteps:'',blockers:'',minutes:0}));setUncertain(false);setError('');}}>Odbaci tekst i započni novi unos</button></div>}
    <section className="employee-section"><h2>Moji prethodni unosi</h2><ResourceState busy={previous.busy && !previous.data} error={previous.error} onRetry={previous.reload}/>{previous.data?.items.map(item => <article className="employee-readonly-work" key={item._id}><strong>{item.day}</strong>{item.activity?.title && <p className="employee-small-note">{item.activity.title}</p>}<p>{item.done}</p></article>)}{previous.data&&<Pagination {...previous.data} label="Stranice dnevnih unosa" onPage={setPage}/>}</section><ProjectExitDialog guard={guard} saving={saving} entity="dnevnog unosa"/>
  </>;
}
