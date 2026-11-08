import React, {useEffect, useRef, useState} from 'react';
import {Link, useBlocker, useNavigate} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import {IconDisc, ResourceState} from './EmployeeComponents.jsx';
import {useEmployeeBackLink} from './EmployeeShell.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {formatFileSize, validateAttachment} from './activityForm.js';
import {sendIdea} from './ideaSubmission.js';

export default function EmployeeIdeaCreate({user}) {
  const manager=user.role==='manager';
  useEmployeeBackLink('/ideas', 'Nazad na moje ideje');
  const navigate = useNavigate();
  const sectors = useEmployeeResource('/sectors', {live: false});
  const config = useEmployeeResource('/attachments/config', {live: false});
  const [draft, setDraft] = useState({title: '', description: '', benefit: ''});
  const [files, setFiles] = useState([]), [fileStates, setFileStates] = useState({});
  const [error, setError] = useState(''), [fileError, setFileError] = useState('');
  const [saving, setSaving] = useState(false), [createdId, setCreatedId] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const session = useRef({ideaId: null, uploaded: new Set()});
  const lock = useRef(false), complete = useRef(false), input = useRef(null), dialog = useRef(null);
  const dirty = Object.values(draft).some(value => value.trim()) || files.length > 0;
  const blocker = useBlocker(({currentLocation, nextLocation}) => !complete.current && dirty && nextLocation.pathname !== '/login' && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useEffect(() => {
    if (blocker.state === 'blocked') dialog.current?.showModal(); else dialog.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    const beforeUnload = event => {if (dirty && !complete.current) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  const ownSector = sectors.data?.items.find(item => String(item._id) === String(user.sector?._id || user.sector));
  const locked = saving || !!createdId;
  const selectFiles = event => {
    const chosen = [...event.target.files]; event.target.value = ''; setFileError('');
    const accepted = [], rejected = [];
    for (const file of chosen) {
      const message = validateAttachment(file, config.data);
      if (message) rejected.push(`${file.name}: ${message}`);
      else if (![...files, ...accepted].some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) accepted.push({id: crypto.randomUUID(), file});
    }
    setFiles(previous => [...previous, ...accepted]); setFileError(rejected.join(' '));
  };
  const submit = async event => {
    event.preventDefault();
    if (lock.current || uncertain) return;
    if (!session.current.ideaId && (!draft.title.trim() || !draft.description.trim())) {setError('Unesite naslov i kratak opis ideje.'); return;}
    if (!user.sector) {setError('Nalog nema dodeljen sektor. Obratite se administratoru.'); return;}
    lock.current = true; setSaving(true); setError('');
    try {
      const result = await sendIdea(session.current, {request: api, draft, files, onCreated: setCreatedId, onFile: (id, state) => setFileStates(previous => ({...previous, [id]: state}))});
      if(result.uncertain)setUncertain(true);
      if (!result.failures.length) {complete.current = true; navigate('/ideas/' + result.ideaId, {replace: true});}
    } catch (e) {
      setError(e.message);
      if (!session.current.ideaId && (!e.status || e.status >= 500)) setUncertain(true);
    }
    finally {lock.current = false; setSaving(false);}
  };
  const field = (name, title, icon, rows, maxLength, placeholder) => <div className={`employee-idea-field employee-idea-field--${name}`}><IconDisc name={icon}/><div><label htmlFor={'idea-' + name}>{title}{name === 'benefit' && <span className="employee-optional"> · opciono</span>}</label>{rows ? <textarea id={'idea-' + name} rows={rows} required={name === 'description'} maxLength={maxLength} value={draft[name]} disabled={locked} placeholder={placeholder} onChange={event => setDraft({...draft, [name]: event.target.value})}/> : <input id={'idea-' + name} required maxLength={maxLength} value={draft[name]} disabled={locked} placeholder={placeholder} onChange={event => setDraft({...draft, [name]: event.target.value})}/>}</div></div>;
  return <div className="employee-idea-create">
    <div className="employee-greeting"><h1>Nova ideja</h1><p>{manager?'Predložite ideju za svoj sektor':'Pošaljite predlog rukovodiocu sektora'}</p></div>
    <form onSubmit={submit} aria-busy={saving}>
      {field('title', 'Naslov ideje', 'bulb', 0, 220, 'Naziv vašeg predloga')}
      {field('description', 'Kratak opis', 'file', 4, 7000, 'Opišite ideju i kako bi mogla da se primeni…')}
      {field('benefit', 'Korist za kompaniju', 'chart', 3, 4000, 'Šta bi ova ideja unapredila?')}
      <div className="employee-idea-field employee-idea-field--sector"><IconDisc name="folder"/><div><label htmlFor="idea-sector">Sektor</label><input id="idea-sector" readOnly value={ownSector?.name || (sectors.busy ? 'Učitavanje…' : 'Sektor nije dostupan')}/><p className="employee-idea-hint">{manager?'Ideja ostaje u pregledu vašeg sektora.':'Ideja se šalje rukovodiocu vašeg sektora.'}</p><ResourceState error={sectors.error} onRetry={sectors.reload}/></div></div>
      <section className="employee-idea-field employee-idea-field--files" aria-labelledby="idea-files-heading"><IconDisc name="clip"/><div><h2 id="idea-files-heading">Prilozi <span className="employee-optional">· opciono</span></h2>
        <div className="employee-staged-files">{files.map(item => <div className="employee-staged-file" key={item.id}><Icon name="file" size={25}/><div><strong>{item.file.name}</strong><small>{formatFileSize(item.file.size)}{fileStates[item.id]?.status === 'done' ? ' · Dodato' : fileStates[item.id]?.status === 'uploading' ? ' · Slanje…' : ''}</small>{fileStates[item.id]?.error && <span className="employee-form-error">{fileStates[item.id].error}</span>}</div>{!locked && <button className="employee-icon-button" type="button" aria-label={'Ukloni ' + item.file.name} onClick={() => setFiles(previous => previous.filter(file => file.id !== item.id))}><Icon name="close" size={19}/></button>}</div>)}</div>
        {!createdId && <><input className="employee-file-input" ref={input} type="file" multiple accept={config.data?.extensions.join(',')} disabled={!config.data || locked} onChange={selectFiles} tabIndex={-1} aria-label="Izaberite priloge"/><button type="button" className="employee-add-file" disabled={!config.data || locked} onClick={() => input.current.click()}><span aria-hidden="true">＋</span>Dodaj prilog</button><p className="employee-idea-hint">{config.data ? `${config.data.extensions.map(x => x.slice(1).toUpperCase()).join(', ')} · do ${formatFileSize(config.data.maxBytes)} po fajlu` : 'Učitavanje dozvoljenih formata…'}</p></>}
        <ResourceState error={config.error} onRetry={config.reload}/>{fileError && <p className="employee-form-error" role="alert">{fileError}</p>}
      </div></section>
      <div className="employee-idea-info"><Icon name="info" size={27}/><p>{manager?'Predlog će biti dostupan u idejama vašeg sektora.':'Nakon slanja, ideja ide na razmatranje rukovodiocu sektora.'} Prosleđivanje predsedniku predstavlja dalju evaluaciju i ne znači odobrenje za realizaciju.</p></div>
      {createdId && !saving && <div className="employee-idea-sent" role="status"><strong>{manager?'Ideja je poslata u pregled sektora.':'Ideja je poslata rukovodiocu.'}</strong><p>{uncertain ? 'Dodavanje priloga nije potvrđeno. Proverite priloge poslate ideje.' : 'Neki prilozi nisu dodati. Pokušajte ponovo — ideja se neće ponovo kreirati.'}</p><Link className="employee-text-button" to={'/ideas/' + createdId}>Otvori poslatu ideju</Link></div>}
      {error && <p className="employee-form-error" role="alert">{error}</p>}
      {uncertain && <div className="employee-idea-sent" role="alert"><strong>Slanje nije potvrđeno.</strong><p>{createdId?'Prilog je možda već dodat. Proverite priloge poslate ideje pre daljeg dodavanja.':'Ideja je možda stigla do rukovodioca. Pre novog slanja proverite spisak svojih ideja.'}</p><Link className="employee-text-button" to={createdId?'/ideas/'+createdId:'/ideas'}>{createdId?'Proveri poslate priloge':'Proveri moje ideje'}</Link></div>}
      {!user.sector && <p className="employee-form-error" role="alert">Nalog nema dodeljen sektor. Obratite se administratoru.</p>}
      <button className="employee-save-button" type="submit" disabled={saving || uncertain || !user.sector}>{saving ? 'Slanje…' : createdId ? 'Pokušaj ponovo sa prilozima' : 'Pošalji ideju'}</button>
    </form>
    <dialog className="employee-unsaved-dialog" ref={dialog} aria-label="Nedovršena ideja" onCancel={event => {event.preventDefault(); blocker.reset?.();}}><h2>{createdId ? 'Napustiti dodavanje priloga?' : 'Napustiti novu ideju?'}</h2><p>{createdId ? 'Ideja je poslata. Prilozi koji nisu uspešno dodati neće biti sačuvani. Možete ih kasnije dodati kroz detalje ideje.' : 'Uneti tekst i izabrani prilozi još nisu poslati i neće biti sačuvani.'}</p><button type="button" className="employee-text-button" onClick={() => blocker.reset?.()}>Ostani ovde</button><button type="button" className="employee-text-button" disabled={saving} onClick={() => blocker.proceed?.()}>Napusti ekran</button>{saving && <p>Sačekajte da se slanje završi.</p>}</dialog>
  </div>;
}
