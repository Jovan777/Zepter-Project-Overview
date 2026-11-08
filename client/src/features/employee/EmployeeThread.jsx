import React, {useEffect, useRef, useState} from 'react';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import useEmployeeResource from './useEmployeeResource.js';
import {Badge, EmptyState, IconDisc, Pagination, ResourceState} from './EmployeeComponents.jsx';
import {uncertainWrite} from '../workspace/mutations.js';
import useCommentFiles from '../workspace/useCommentFiles.js';
import CommentAttachmentLinks from '../workspace/CommentAttachmentLinks.jsx';
import {formatFileSize} from './activityForm.js';

const time = value => new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(value));
function ThreadHistory({collapsed,total,children,historyRef}){return collapsed?<details ref={historyRef} className="president-thread-history"><summary>Razgovor sa rukovodiocem ({total??'—'})</summary>{children}</details>:children;}
export default function EmployeeThread({type, id, user, heading = 'Komentari', sectionId = 'detail-comments', variant, initialReply, allowInstructions = false, allowAttachments = false, onDraftChange, onBusyChange, onCountChange, collapseHistory = false}) {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [parent, setParent] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [kind, setKind] = useState('comment');
  const [uncertain,setUncertain]=useState(false);
  const editor = useRef(null), lock = useRef(false), history = useRef(null),picker=useRef(null);
  const files=useCommentFiles(allowAttachments,type,id);
  const base = `/comments?targetType=${type}&targetId=${id}&includeAttachments=1`;
  useEffect(()=>{onDraftChange?.(!!message.trim()||sending||uncertain||files.items.length>0||files.busy);},[message,sending,uncertain,files.items.length,files.busy,onDraftChange]);
  useEffect(()=>{onBusyChange?.(sending||files.busy);},[sending,files.busy,onBusyChange]);
  const {data, busy, error: loadError, reload} = useEmployeeResource(`${base}&page=${page}&limit=20`, {keepPreviousData: true});
  useEffect(()=>{if(data)onCountChange?.(data.total);},[data?.total,onCountChange]);
  useEffect(() => {setPage(1); setMessage(''); setParent(null); setKind('comment'); setError(''); setNotice('');setUncertain(false);}, [type, id]);
  useEffect(() => {if (initialReply) {setParent(initialReply); editor.current?.focus();}}, [initialReply]);
  const send = async event => {
    event.preventDefault();
    if (lock.current || uncertain || files.bound || files.busy || !message.trim()) return;
    lock.current = true; setSending(true); setError(''); setNotice('');
    try {
      const result=await api('/comments', {method: 'POST', body: {targetType: type, targetId: id, body: message.trim(), kind: allowInstructions && ['manager','president'].includes(user.role) ? kind : 'comment', ...(parent ? {parentId: parent._id} : {})}});
      setMessage(''); setParent(null); setKind('comment');
      const uploaded=await files.upload(result.comment._id);
      setNotice(uploaded?'Komentar je poslat.':'Komentar je poslat. Nastavite slanje preostalih priloga.');
      window.dispatchEvent(new Event('zepter:data-changed'));
      try {
        const last = await api(`${base}&limit=1`);
        setPage(Math.max(1, Math.ceil(last.total / 20)));
      } catch {setNotice('Komentar je poslat. Osvežite razgovor da biste ga videli.');}
      reload();
    } catch (e) {setError(e.message);setUncertain(uncertainWrite(e));}
    finally {lock.current = false; setSending(false);}
  };
  const resolve = async comment => {
    if (lock.current) return;
    lock.current = true; setSending(true); setError(''); setNotice('');
    try {await api('/comments/' + comment._id + '/resolve', {method: 'PATCH'}); setNotice('Instrukcija je označena kao rešena.'); reload();}
    catch (e) {setError(e.message);}
    finally {lock.current = false; setSending(false);}
  };
  return <section className="employee-section employee-discussion" id={sectionId} aria-labelledby={`${sectionId}-heading`}>
    <h2 id={`${sectionId}-heading`}>{heading}{['idea','president'].includes(variant) && data ? ` (${data.total})` : ''}</h2>
    <ThreadHistory collapsed={collapseHistory} total={data?.total} historyRef={history}><ResourceState busy={busy && !data} error={loadError} onRetry={reload} noun="razgovor"/>
    {data && !data.items.length && <EmptyState icon="message" title="Započnite razgovor">Postavite pitanje ili podelite novost o {type === 'project' ? 'projektu' : type === 'idea' ? 'ideji' : type === 'sector' ? 'sektoru' : 'aktivnosti'}.</EmptyState>}
    {data?.items.map(comment => {
      const own = comment.author?._id === user._id;
      const fullName = `${comment.author?.firstName || 'Korisnik'} ${comment.author?.lastName || ''}`.trim();
      const name = ['idea','president'].includes(variant) ? (variant==='president'&&comment.author?.role==='president'?'Predsednik':fullName) : comment.author?.role === 'president' ? 'Predsednik' : comment.author?.role === 'manager' ? 'Rukovodilac' : fullName;
      return <article className={`employee-discussion-card ${own ? 'is-own' : ''} ${comment.author?.role==='president'?'is-president':''} ${['president', 'manager'].includes(comment.author?.role) ? 'is-leader' : ''}`} key={comment._id}>
        {['idea','president'].includes(variant) ? <span className="employee-comment-initials" aria-hidden="true">{variant==='president'&&comment.author?.role==='president'?<Icon name="crown" size={20}/>: [comment.author?.firstName, comment.author?.lastName].filter(Boolean).map(x => x[0]).join('') || '?'}</span> : <IconDisc name={comment.author?.role === 'manager' ? 'users' : 'user'}/>}<div className="employee-discussion-body">
          <div className="employee-discussion-heading"><h3>{name}{own && <small> (vi)</small>}</h3><time dateTime={comment.createdAt}>{time(comment.createdAt)}</time></div>
          {['idea','president'].includes(variant) && <span className="employee-comment-role">{comment.author?.role === 'president' ? 'Predsednik' : comment.author?.role === 'manager' ? 'Rukovodilac sektora' : 'Zaposleni'}</span>}
          {comment.parent && <span className="employee-reply-caption">Odgovor na komentar</span>}
          <p>{comment.body}</p>
          <CommentAttachmentLinks items={comment.attachments}/>
          {uncertain&&own&&files.items.length>0&&comment.body===message.trim()&&<button type="button" className="employee-text-button" disabled={files.busy} onClick={async()=>{setUncertain(false);setMessage('');setParent(null);setError('');await files.upload(comment._id);reload();}}>Dodaj izabrane priloge uz ovaj komentar</button>}
          <div className="employee-discussion-actions">{comment.kind === 'instruction' && <Badge>{({open: 'Čeka odgovor', answered: 'Odgovoreno', resolved: 'Rešeno'})[comment.responseStatus]}</Badge>}<button type="button" className="employee-text-button" disabled={sending} onClick={() => {setParent(comment); setNotice(''); editor.current?.focus();}}>Odgovori <Icon name="arrow" size={14}/></button>{allowInstructions && own && comment.kind === 'instruction' && comment.responseStatus !== 'resolved' && <button type="button" className="employee-text-button" disabled={sending} onClick={() => resolve(comment)}>Označi kao rešeno</button>}</div>
        </div>
      </article>;
    })}
    {data && <Pagination {...data} label="Stranice komentara" onPage={setPage}/>}</ThreadHistory>
    {parent && <div className="employee-reply-preview"><span><strong>Odgovor na:</strong> {parent.body.slice(0, 130)}</span><button className="employee-icon-button" onClick={() => setParent(null)} aria-label="Otkaži odgovor"><Icon name="close" size={17}/></button></div>}
    {files.items.length>0&&<div className="comment-selected-files" aria-label="Izabrani prilozi">{files.items.map(entry=><div className="comment-selected-file" key={entry.key}><Icon name="file" size={18}/><span>{entry.file.name}<small>{formatFileSize(entry.file.size)}</small></span><button type="button" className="employee-icon-button" disabled={sending||files.busy} aria-label={'Ukloni iz slanja '+entry.file.name} onClick={()=>files.remove(entry.key)}><Icon name="close" size={17}/></button></div>)}</div>}
    {files.bound&&<div className="comment-file-status" role="status"><p>Komentar je sačuvan. Preostali prilozi biće dodati uz istu poruku.</p><button type="button" className="employee-text-button" disabled={files.busy||sending} onClick={async()=>{const done=await files.upload(files.bound);if(done)setNotice('Preostali prilozi su poslati.');reload();}}>{files.busy?'Slanje priloga…':'Pošalji preostale priloge'}</button></div>}
    <form className="employee-comment-composer" onSubmit={send} aria-label="Novi komentar">
      {allowInstructions && ['manager','president'].includes(user.role) && <label className="manager-comment-kind">Tip poruke<select value={kind} disabled={sending} onChange={event => setKind(event.target.value)}><option value="comment">Komentar / odgovor</option><option value="instruction">{type==='sector'?'Instrukcija rukovodiocu':type==='idea'&&user.role==='president'?'Smernica autoru':type==='activity'&&user.role==='president'?'Instrukcija odgovornima':'Instrukcija timu'}</option></select></label>}
      <label className="employee-sr-only" htmlFor={`${sectionId}-message`}>{parent ? 'Odgovor na komentar' : 'Novi komentar'}</label>
      <textarea id={`${sectionId}-message`} ref={editor} rows={2} required maxLength={4000} value={message} disabled={sending||!!files.bound||files.busy} onChange={event => {setMessage(event.target.value); setNotice('');}} placeholder={parent ? 'Napišite odgovor…' : type === 'project' ? 'Napišite komentar na projekat…' : allowInstructions?'Napišite komentar ili smernicu…':'Napišite komentar ili odgovor…'}/>
      {allowAttachments&&<><input ref={picker} className="comment-file-picker" type="file" multiple aria-label="Prilozi uz komentar" accept={files.config.data?.extensions.join(',')} onChange={event=>{files.choose(Array.from(event.target.files||[]));event.target.value='';}}/><button className="comment-attach-button" type="button" aria-label="Dodaj prilog uz komentar" title="Dodaj prilog uz komentar" disabled={sending||files.busy||!!files.bound||uncertain||!files.config.data||files.items.length>=3} onClick={()=>picker.current?.click()}><Icon name="clip" size={20}/></button></>}
      <button className="employee-send-button" disabled={sending || uncertain || !!files.bound || files.busy || !message.trim()} aria-label={sending ? 'Slanje komentara' : 'Pošalji komentar'} title="Pošalji komentar"><Icon name="send" size={23}/>{collapseHistory&&<span>Pošalji {kind==='instruction'?'instrukciju':'komentar'}</span>}</button>
    </form>
    {allowAttachments&&<p className="employee-small-note">{files.config.data?'Do 3 priloga uz poruku, do '+formatFileSize(files.config.data.maxBytes)+' po fajlu. PDF, slike i Office dokumenti.':files.config.error?'Dodavanje priloga trenutno nije dostupno. ':'Učitavanje dozvoljenih priloga…'}{files.config.error&&<button className="employee-text-button" onClick={files.config.reload}>Pokušaj ponovo</button>}</p>}
    {files.error&&<p className="employee-form-error" role="alert">{files.error}</p>}
    {error && <p className="employee-form-error" role="alert">{error}</p>}
    {uncertain&&<div className="employee-conflict" role="alert"><p>Poruka je možda već poslata. Tekst je sačuvan; proverite razgovor pre nove poruke.</p><button className="employee-text-button" onClick={async()=>{if(history.current)history.current.open=true;try{const last=await api(base+'&limit=1');setPage(Math.max(1,Math.ceil(last.total/20)));reload();}catch(e){setError(e.message);}}}>Proveri razgovor</button><button className="employee-text-button" onClick={()=>{setMessage('');setParent(null);setUncertain(false);setError('');files.clear();}}>Odbaci tekst i započni novu poruku</button></div>}
    {notice && <p className="employee-form-success" role="status">{notice}</p>}
  </section>;
}
