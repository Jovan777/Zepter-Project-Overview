import React, {useEffect, useRef, useState} from 'react';
import {useBlocker} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {personId, personName, priorities} from './projectForm.js';

export function useProjectGuard(dirty, complete) {
  const dialog = useRef(null);
  const blocker = useBlocker(({currentLocation, nextLocation}) => dirty && !complete.current && nextLocation.pathname !== '/login' && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);
  useEffect(() => {if (blocker.state === 'blocked') dialog.current?.showModal(); else dialog.current?.close();}, [blocker.state]);
  useEffect(() => {
    const prevent = event => {if (dirty && !complete.current) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty, complete]);
  return {dialog, blocker};
}
export function ProjectExitDialog({guard, saving, partial, entity = 'projekta'}) {
  return <dialog className="employee-unsaved-dialog" ref={guard.dialog} aria-label={'Nesačuvane izmene '+entity} onCancel={event => {event.preventDefault(); if (!saving) guard.blocker.reset?.();}}><h2>Napustiti obrazac?</h2><p>{partial ? 'Projekat je sačuvan. Preostale aktivnosti još nisu dodate; njihovi unosi neće ostati u obrascu posle izlaska.' : 'Izmene još nisu sačuvane. Ostanite u obrascu da ih sačuvate.'}</p><button className="employee-save-button" disabled={saving} onClick={() => guard.blocker.reset?.()}>Ostani ovde</button><button className="employee-text-button" disabled={saving} onClick={() => guard.blocker.proceed?.()}>Napusti obrazac</button></dialog>;
}
export function TeamPicker({people, selected, onChange, lockedIds = [], unavailableIds = [], disabled = false, maxSelected = 80, id = 'project-team-picker'}) {
  const [query, setQuery] = useState('');
  const options = people.filter(person => personName(person).toLocaleLowerCase('sr-Latn-RS').includes(query.toLocaleLowerCase('sr-Latn-RS')));
  return <div className="manager-team-picker"><label className="employee-sr-only" htmlFor={id}>Pretraži članove tima</label><input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {if (event.key === 'Enter') event.preventDefault();}} placeholder="Pretražite članove…" disabled={disabled}/><div className="manager-team-options">{options.map(person => {
    const key = personId(person), locked = lockedIds.includes(key), active = selected.includes(key);
    return <label className="manager-person-option" key={key}><input type="checkbox" checked={active} disabled={disabled || locked || (!active && (selected.length >= maxSelected || unavailableIds.includes(key)))} onChange={() => onChange(active ? selected.filter(value => value !== key) : [...selected, key])}/><span className="manager-initials" aria-hidden="true">{[person.firstName, person.lastName].filter(Boolean).map(value => value[0]).join('')}</span><span><strong>{personName(person)}</strong><small>{locked ? 'Odgovorna osoba ili postojeća zaduženja' : unavailableIds.includes(key) ? 'Nalog nije aktivan' : person.jobTitle || (person.role === 'manager' ? 'Rukovodilac sektora' : 'Zaposleni')}</small></span></label>;
  })}{!options.length && <p className="employee-small-note">Nema članova za ovu pretragu.</p>}</div></div>;
}
export function ActivityFields({row, onChange, people, disabled = false, prefix}) {
  const field = (key, value) => onChange({...row, [key]: value});
  return <div className="manager-activity-fields"><label htmlFor={prefix + '-title'}>Naziv aktivnosti <span aria-hidden="true">*</span></label><input id={prefix + '-title'} required maxLength={220} value={row.title} onChange={event => field('title', event.target.value)} disabled={disabled}/><label htmlFor={prefix + '-description'}>Opis <small>· opciono</small></label><textarea id={prefix + '-description'} rows={2} maxLength={5000} value={row.description || ''} onChange={event => field('description', event.target.value)} disabled={disabled}/><div className="manager-form-pair"><div><label htmlFor={prefix + '-due'}>Rok <small>· opciono</small></label><input id={prefix + '-due'} type="date" value={row.dueDate} onChange={event => field('dueDate', event.target.value)} disabled={disabled}/></div><div><label htmlFor={prefix + '-priority'}>Prioritet</label><select id={prefix + '-priority'} value={row.priority} onChange={event => field('priority', event.target.value)} disabled={disabled}>{Object.entries(priorities).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div></div><fieldset className="manager-assignee-picker" disabled={disabled}><legend>Odgovorni članovi projekta</legend>{people.map(person => <label key={personId(person)}><input type="checkbox" checked={row.assigneeIds.includes(personId(person))} onChange={event => field('assigneeIds', event.target.checked ? [...row.assigneeIds, personId(person)] : row.assigneeIds.filter(id => id !== personId(person)))}/>{personName(person)}</label>)}{!people.length && <p className="employee-small-note">Prvo izaberite članove projektnog tima.</p>}</fieldset></div>;
}
export function InitialActivityRow({row, onChange, onRemove, people, disabled, state}) {
  const [open, setOpen] = useState(true);
  return <div className="manager-initial-activity"><div className="manager-initial-activity-heading"><button type="button" aria-expanded={open} aria-controls={'initial-' + row.id} onClick={() => {if (row.title.trim()) setOpen(value => !value);}}><Icon name={state?.status === 'done' ? 'check' : 'activity'} size={18}/><span>{row.title || 'Nova aktivnost'}</span><Icon name="chevron" size={16}/></button>{!disabled && <button type="button" className="employee-icon-button" onClick={onRemove} aria-label={'Ukloni početnu aktivnost ' + (row.title || '')}><Icon name="close" size={17}/></button>}</div><div id={'initial-' + row.id} hidden={!open}><ActivityFields row={row} onChange={onChange} people={people} disabled={disabled} prefix={'initial-' + row.id}/></div>{state?.status === 'done' && <p className="employee-form-success">Aktivnost je dodata.</p>}{state?.error && <p role="alert" className="employee-form-error">{state.error}</p>}</div>;
}
