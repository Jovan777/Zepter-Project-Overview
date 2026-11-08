import React, {useEffect, useRef, useState} from 'react';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import useEmployeeResource from './useEmployeeResource.js';
import {Badge, EmptyState, IconDisc, Pagination, ResourceState} from './EmployeeComponents.jsx';

const time = value => new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(value));
export default function EmployeeThread({type, id, user, heading = 'Komentari', sectionId = 'detail-comments', variant, initialReply, allowInstructions = false, onDraftChange}) {
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [parent, setParent] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [kind, setKind] = useState('comment');
  const editor = useRef(null), lock = useRef(false);
  const base = `/comments?targetType=${type}&targetId=${id}`;
  useEffect(()=>{onDraftChange?.(!!message.trim()||sending);},[message,sending,onDraftChange]);
  const {data, busy, error: loadError, reload} = useEmployeeResource(`${base}&page=${page}&limit=20`, {keepPreviousData: true});
  useEffect(() => {setPage(1); setMessage(''); setParent(null); setKind('comment'); setError(''); setNotice('');}, [type, id]);
  useEffect(() => {if (initialReply) {setParent(initialReply); editor.current?.focus();}}, [initialReply]);
  const send = async event => {
    event.preventDefault();
    if (lock.current || !message.trim()) return;
    lock.current = true; setSending(true); setError(''); setNotice('');
    try {
      await api('/comments', {method: 'POST', body: {targetType: type, targetId: id, body: message.trim(), kind: allowInstructions && user.role === 'manager' ? kind : 'comment', ...(parent ? {parentId: parent._id} : {})}});
      setMessage(''); setParent(null); setKind('comment'); setNotice('Komentar je poslat.');
      try {
        const last = await api(`${base}&limit=1`);
        setPage(Math.max(1, Math.ceil(last.total / 20)));
      } catch {setNotice('Komentar je poslat. Osvežite razgovor da biste ga videli.');}
      reload();
    } catch (e) {setError(e.message);}
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
    <h2 id={`${sectionId}-heading`}>{heading}{variant === 'idea' && data ? ` (${data.total})` : ''}</h2>
    <ResourceState busy={busy && !data} error={loadError} onRetry={reload} noun="razgovor"/>
    {data && !data.items.length && <EmptyState icon="message" title="Započnite razgovor">Postavite pitanje ili podelite novost o {type === 'project' ? 'projektu' : type === 'idea' ? 'ideji' : type === 'sector' ? 'sektoru' : 'aktivnosti'}.</EmptyState>}
    {data?.items.map(comment => {
      const own = comment.author?._id === user._id;
      const fullName = `${comment.author?.firstName || 'Korisnik'} ${comment.author?.lastName || ''}`.trim();
      const name = variant === 'idea' ? fullName : comment.author?.role === 'president' ? 'Predsednik' : comment.author?.role === 'manager' ? 'Rukovodilac' : fullName;
      return <article className={`employee-discussion-card ${own ? 'is-own' : ''} ${['president', 'manager'].includes(comment.author?.role) ? 'is-leader' : ''}`} key={comment._id}>
        {variant === 'idea' ? <span className="employee-comment-initials" aria-hidden="true">{[comment.author?.firstName, comment.author?.lastName].filter(Boolean).map(x => x[0]).join('') || '?'}</span> : <IconDisc name={comment.author?.role === 'manager' ? 'users' : 'user'}/>}<div className="employee-discussion-body">
          <div className="employee-discussion-heading"><h3>{name}{own && <small> (vi)</small>}</h3><time dateTime={comment.createdAt}>{time(comment.createdAt)}</time></div>
          {variant === 'idea' && <span className="employee-comment-role">{comment.author?.role === 'president' ? 'Predsednik' : comment.author?.role === 'manager' ? 'Rukovodilac sektora' : own ? 'Autor ideje' : 'Zaposleni'}</span>}
          {comment.parent && <span className="employee-reply-caption">Odgovor na komentar</span>}
          <p>{comment.body}</p>
          <div className="employee-discussion-actions">{comment.kind === 'instruction' && <Badge>{({open: 'Čeka odgovor', answered: 'Odgovoreno', resolved: 'Rešeno'})[comment.responseStatus]}</Badge>}<button type="button" className="employee-text-button" disabled={sending} onClick={() => {setParent(comment); setNotice(''); editor.current?.focus();}}>Odgovori <Icon name="arrow" size={14}/></button>{allowInstructions && own && comment.kind === 'instruction' && comment.responseStatus !== 'resolved' && <button type="button" className="employee-text-button" disabled={sending} onClick={() => resolve(comment)}>Označi kao rešeno</button>}</div>
        </div>
      </article>;
    })}
    {data && <Pagination {...data} label="Stranice komentara" onPage={setPage}/>}
    {parent && <div className="employee-reply-preview"><span><strong>Odgovor na:</strong> {parent.body.slice(0, 130)}</span><button className="employee-icon-button" onClick={() => setParent(null)} aria-label="Otkaži odgovor"><Icon name="close" size={17}/></button></div>}
    <form className="employee-comment-composer" onSubmit={send} aria-label="Novi komentar">
      {allowInstructions && user.role === 'manager' && <label className="manager-comment-kind">Tip poruke<select value={kind} disabled={sending} onChange={event => setKind(event.target.value)}><option value="comment">Komentar / odgovor</option><option value="instruction">Instrukcija timu</option></select></label>}
      <label className="employee-sr-only" htmlFor={`${sectionId}-message`}>{parent ? 'Odgovor na komentar' : 'Novi komentar'}</label>
      <textarea id={`${sectionId}-message`} ref={editor} rows={2} required maxLength={4000} value={message} disabled={sending} onChange={event => {setMessage(event.target.value); setNotice('');}} placeholder={parent ? 'Napišite odgovor…' : type === 'project' ? 'Napišite komentar na projekat…' : 'Napišite komentar ili odgovor…'}/>
      <button className="employee-send-button" disabled={sending || !message.trim()} aria-label={sending ? 'Slanje komentara' : 'Pošalji komentar'} title="Pošalji komentar"><Icon name="send" size={23}/></button>
    </form>
    {error && <p className="employee-form-error" role="alert">{error}</p>}
    {notice && <p className="employee-form-success" role="status">{notice}</p>}
  </section>;
}
