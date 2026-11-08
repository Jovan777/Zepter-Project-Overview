import React, {useEffect, useRef, useState} from 'react';
import {useBlocker, useParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import {Badge, IconDisc, ResourceState} from './EmployeeComponents.jsx';
import {useEmployeeBackLink} from './EmployeeShell.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import EmployeeAttachments from './EmployeeAttachments.jsx';
import EmployeeThread from './EmployeeThread.jsx';
import {formatDeadline} from './presentation.js';

const draftOf = idea => ({title: idea.title, description: idea.description, benefit: idea.benefit || ''});
const sameDraft = (a, b) => ['title', 'description', 'benefit'].every(key => a[key] === b[key]);
const statuses = {submitted: ['Na razmatranju', 'gold'], in_review: ['Na razmatranju', 'gold'], revision_requested: ['Vraćena na doradu', 'warning'], forwarded: ['Prosleđeno predsedniku', 'success']};
export function IdeaView({initial, user}) {
  const [idea, setIdea] = useState(initial), [draft, setDraft] = useState(() => draftOf(initial));
  const [editing, setEditing] = useState(false), [working, setWorking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false), [latest, setLatest] = useState(null), [uncertain, setUncertain] = useState(false);
  const [threadDirty,setThreadDirty]=useState(false);
  const lock = useRef(false), dialog = useRef(null), editor = useRef(null);
  const own = String(idea.author?._id || idea.author) === user._id;
  const canEdit = own && idea.status === 'revision_requested';
  const dirty = canEdit && !sameDraft(draft, draftOf(idea));
  const guarded=dirty||threadDirty||working;
  const blocker = useBlocker(({currentLocation, nextLocation}) => guarded && nextLocation.pathname !== '/login' && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);
  useEffect(() => {
    if (blocker.state === 'blocked' && !dialog.current?.open) dialog.current?.showModal();
    else if (blocker.state !== 'blocked') dialog.current?.close();
  }, [blocker.state]);
  useEffect(() => {
    const unload = event => {if (guarded) {event.preventDefault(); event.returnValue = '';}};
    window.addEventListener('beforeunload', unload); return () => window.removeEventListener('beforeunload', unload);
  }, [guarded]);
  useEffect(() => {if (editing) editor.current?.focus();}, [editing]);
  const adopt = fresh => {setIdea(fresh); setDraft(draftOf(fresh)); setEditing(false); setConflict(false); setLatest(null); setUncertain(false); setError('');};
  const refresh = async () => {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try {
      const {idea: fresh} = await api('/ideas/' + idea._id);
      if (dirty) setLatest(fresh); else {adopt(fresh); setNotice('Prikazan je aktuelni predlog.');}
    } catch (e) {setError(e.message);}
    finally {lock.current = false; setWorking(false);}
  };
  const persist = async resubmit => {
    if (lock.current || !canEdit || uncertain) return false;
    if (!draft.title.trim() || !draft.description.trim()) {setError('Unesite naslov i opis ideje.'); editor.current?.focus(); return false;}
    lock.current = true; setWorking(true); setError(''); setNotice('');
    let current = idea, saved = false;
    const preservePeople = value => ({...value, author: idea.author, sector: idea.sector});
    try {
      if (dirty) {
        const result = await api('/ideas/' + idea._id, {method: 'PATCH', body: {title: draft.title.trim(), description: draft.description.trim(), benefit: draft.benefit.trim()}, headers: {'If-Match': `"${current.updatedAt}"`}});
        current = preservePeople(result.idea); setIdea(current); setDraft(draftOf(current)); saved = true;
      }
      if (resubmit) {
        const result = await api('/ideas/' + idea._id + '/resubmit', {method: 'POST', headers: {'If-Match': `"${current.updatedAt}"`}});
        current = preservePeople(result.idea); setIdea(current); setDraft(draftOf(current));
      }
      setEditing(false); setConflict(false); setLatest(null);
      setNotice(resubmit ? (user.role==='manager'?'Dopunjena ideja je ponovo poslata u pregled sektora.':'Dopunjena ideja je ponovo poslata rukovodiocu.') : 'Dopuna je sačuvana. Kada završite, ponovo pošaljite ideju.');
      return true;
    } catch (e) {
      setError((saved ? 'Dopuna je sačuvana, ali ponovno slanje nije potvrđeno. ' : '') + e.message);
      setConflict(e.status === 409);
      if (!e.status || e.status >= 500) setUncertain(true);
      return false;
    } finally {lock.current = false; setWorking(false);}
  };
  const [status, tone] = statuses[idea.status] || [idea.status, 'neutral'];
  const authorName = `${idea.author?.firstName || ''} ${idea.author?.lastName || ''}`.trim() || 'Autor ideje';
  return <div className="employee-idea-detail">
    <div className="workspace-detail-grid"><div className="workspace-detail-primary"><section className="employee-idea-summary" aria-labelledby="idea-heading">
      <div className="employee-idea-summary-top"><IconDisc name="bulb"/><Badge tone={tone}>{status}</Badge></div>
      <h1 id="idea-heading">{idea.title}</h1><p className="employee-idea-full-description">{idea.description}</p>
      {idea.benefit && <div className="employee-idea-benefit"><h2>Korist za kompaniju</h2><p>{idea.benefit}</p></div>}
      <div className="employee-idea-author"><IconDisc name="user"/><div><strong>{authorName}{own ? ' (vi)' : ''}</strong><span>{idea.author?.jobTitle || 'Autor ideje'}</span></div><div className="employee-idea-dates"><span><Icon name="calendar" size={15}/><time dateTime={idea.createdAt}>{formatDeadline(idea.createdAt)}</time></span><span><Icon name="folder" size={15}/>{idea.sector?.name || 'Sektor ideje'}</span></div></div>
    </section>
    {idea.status === 'revision_requested' && <div className="employee-idea-review-note"><Icon name="info" size={21}/><div><strong>Zahtev za doradu</strong><p>{idea.reviewNote || 'Dopunite predlog prema smernicama rukovodioca.'}</p></div></div>}
    <EmployeeAttachments type="idea" id={idea._id} user={user} editable={own} showCount/>
    {canEdit && editing && <form className="employee-idea-revision-form" aria-label="Dopuna ideje" onSubmit={async event => {event.preventDefault(); await persist(false);}}>
      <h2>Dopunite ideju</h2><p>Izmenite predlog i sačuvajte dopunu ili je odmah ponovo pošaljite.</p>
      <label htmlFor="revision-title">Naslov ideje</label><input ref={editor} id="revision-title" required maxLength={220} value={draft.title} disabled={working} onChange={event => setDraft({...draft, title: event.target.value})}/>
      <label htmlFor="revision-description">Opis ideje</label><textarea id="revision-description" required rows={6} maxLength={7000} value={draft.description} disabled={working} onChange={event => setDraft({...draft, description: event.target.value})}/>
      <label htmlFor="revision-benefit">Korist za kompaniju <small>· opciono</small></label><textarea id="revision-benefit" rows={3} maxLength={4000} value={draft.benefit} disabled={working} onChange={event => setDraft({...draft, benefit: event.target.value})}/>
      <div className="employee-idea-edit-actions"><button className="employee-text-button" disabled={working || uncertain || !dirty} type="submit">Sačuvaj dopunu</button><button className="employee-text-button" disabled={working} type="button" onClick={() => {setDraft(draftOf(idea)); setEditing(false);}}>Otkaži izmene</button></div>
    </form>}
    </div><div className="workspace-detail-aside"><EmployeeThread type="idea" id={idea._id} user={user} sectionId="idea-comments" variant="idea" allowInstructions={user.role==='manager'} onDraftChange={setThreadDirty}/></div><div className="workspace-detail-footer">
    {error && <p className="employee-form-error" role="alert">{error}</p>}
    {(conflict || uncertain) && <div className="employee-idea-review-note" role="alert"><Icon name="info" size={20}/><div><strong>{uncertain ? 'Proverite da li je zahtev sačuvan' : 'Predlog je promenjen u drugom prozoru'}</strong><p>Vaš unos ostaje u formi. Pregledajte aktuelni predlog pre daljeg čuvanja ili slanja.</p><button className="employee-text-button" disabled={working} onClick={refresh}>Proveri aktuelni predlog</button>{latest && <div className="employee-idea-latest"><strong>{latest.title}</strong><p>{statuses[latest.status]?.[0] || latest.status}</p><p>{latest.description}</p><button className="employee-text-button" disabled={working} onClick={() => adopt(latest)}>Odbaci moj unos i preuzmi ovu verziju</button></div>}</div></div>}
    {notice && <p className="employee-form-success" role="status">{notice}</p>}
    {canEdit && <div className="employee-idea-bottom-actions"><button className="employee-idea-edit-button" disabled={working || editing} onClick={() => {setEditing(true); setNotice('');}}><Icon name="edit" size={20}/>Dopuni ideju</button><button className="employee-save-button" disabled={working || uncertain} onClick={() => persist(true)}><Icon name="send" size={19}/>{working ? 'Sačekajte…' : 'Ponovo pošalji'}</button></div>}
    {!dirty && <button className="employee-text-button employee-refresh-idea" disabled={working} onClick={refresh}><Icon name="clock" size={16}/>Osveži status ideje</button>}
    </div></div><dialog className="employee-unsaved-dialog" ref={dialog} aria-label="Nesačuvana dopuna" onCancel={event => {event.preventDefault(); blocker.reset?.();}}><h2>Nesačuvana dopuna ideje</h2><p>Dopunu možete sačuvati pre izlaska. To neće ponovo poslati ideju rukovodiocu.</p><button className="employee-text-button" onClick={() => blocker.reset?.()}>Ostani ovde</button><button className="employee-text-button" disabled={working || uncertain || threadDirty || !canEdit} onClick={async () => {if (await persist(false)) blocker.proceed?.();}}>Sačuvaj i nastavi</button><button className="employee-text-button" disabled={working} onClick={() => blocker.proceed?.()}>Napusti bez čuvanja</button>{error && <p role="alert" className="employee-form-error">{error}</p>}</dialog>
  </div>;
}
export default function EmployeeIdeaDetail({user}) {
  const {id} = useParams();
  useEmployeeBackLink('/ideas', 'Nazad na moje ideje');
  const resource = useEmployeeResource('/ideas/' + id, {live: false});
  if (!resource.data) return <ResourceState {...resource} onRetry={resource.reload} noun="predlog"/>;
  return <IdeaView key={id} initial={resource.data.idea} user={user}/>;
}
