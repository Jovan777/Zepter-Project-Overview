import React, {useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {Badge, EmptyState, IconDisc, Pagination, ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import {formatDeadline, projectStatuses, countLabel} from '../employee/presentation.js';
import {ManagerMetric, ManagerProjectCard} from './ManagerComponents.jsx';

const time = value => new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(new Date(value));
export default function ManagerHome({user}) {
  const [search, setSearch] = useSearchParams(), [reply, setReply] = useState(null), [conversation, setConversation] = useState(false), [conversationReady, setConversationReady] = useState(false);
  const resource = useEmployeeResource('/dashboard/manager', {keepPreviousData: true});
  const {data, busy, error, reload} = resource;
  const showLate = search.has('late'), showComments = search.has('comments');
  const activityPage = Math.max(1, Math.floor(Number(search.get('activityPage')) || 1)), commentPage = Math.max(1, Math.floor(Number(search.get('commentPage')) || 1));
  // Page changes load the expanded sections without unmounting the sector reply draft.
  const detail = useEmployeeResource(showLate || showComments ? '/dashboard/manager?' + new URLSearchParams({activityPage, commentPage}) : null, {keepPreviousData: true});
  const toggle = key => {const next = new URLSearchParams(search); if (next.has(key)) next.delete(key); else next.set(key, '1'); setSearch(next);};
  const page = (key, value) => {const next = new URLSearchParams(search); next.set(key, value); setSearch(next);};
  const sectorName = data?.sector.name || 'Vaš sektor', comment = data?.sectorComment;
  return <div className="manager-home">
    <div className="manager-heading"><h1>{sectorName}</h1><p>Pregled mog sektora</p></div>
    <ResourceState busy={busy && !data} error={error} onRetry={reload} noun="pregled sektora"/>
    <div className="manager-metrics">
      <ManagerMetric icon="folder" value={data?.stats.totalProjects} label="Ukupno projekata" to="/projects"/>
      <ManagerMetric icon="clock" value={data?.stats.delayedActivities} label="Aktivnosti u kašnjenju" onClick={() => toggle('late')} expanded={showLate} controls="manager-delayed"/>
      <ManagerMetric icon="bulb" value={data?.stats.newIdeas} label="Ideje zaposlenih na pregledu" to="/ideas"/>
      <ManagerMetric icon="message" value={data?.stats.unreadPresidentComments} label="Novih komentara predsednika" onClick={() => toggle('comments')} expanded={showComments} controls="manager-president-history"/>
    </div>
    {data && <details className="manager-status-summary"><summary>Statusi projekata</summary><div>{Object.entries(data.stats.byStatus).map(([status, value]) => <Badge key={status} tone={projectStatuses[status]?.tone}>{projectStatuses[status]?.label}: {value}</Badge>)}</div></details>}
    {showLate && <section className="manager-expansion" id="manager-delayed"><h2>Aktivnosti u kašnjenju</h2><ResourceState busy={detail.busy} error={detail.error} onRetry={detail.reload} noun="spisak aktivnosti"/>{detail.data?.delayed.items.map(activity => <Link className="manager-delayed-item" to={'/activities/' + activity._id} key={activity._id}><IconDisc name="clock"/><div><strong>{activity.title}</strong><span>{activity.project?.title || 'Projekat sektora'} · Rok: {formatDeadline(activity.dueDate)}</span></div><Icon name="chevron" size={17}/></Link>)}{detail.data && !detail.data.delayed.items.length && <EmptyState icon="clock" title="Nema aktivnosti u kašnjenju"/>}{detail.data && <Pagination {...detail.data.delayed} label="Stranice zakašnjelih aktivnosti" onPage={value => page('activityPage', value)}/>}</section>}
    {showComments && <section className="manager-expansion" id="manager-president-history"><h2>Komentari predsednika</h2><p className="manager-filter-note">Poslednji komentari na sektoru, projektima, aktivnostima i idejama. Nepročitana obaveštenja možete označiti u <Link to="/notifications">obaveštenjima</Link>.</p><ResourceState busy={detail.busy} error={detail.error} onRetry={detail.reload} noun="razgovor"/>{detail.data?.presidentComments.items.map(item => <Link className="manager-history-item" key={item._id} to={item.link}><span>{({sector: 'Sektor', project: 'Projekat', activity: 'Aktivnost', idea: 'Ideja'})[item.targetType]}</span><p>{item.body}</p><time dateTime={item.createdAt}>{time(item.createdAt)}</time><Icon name="chevron" size={16}/></Link>)}{detail.data && !detail.data.presidentComments.items.length && <EmptyState icon="message" title="Još nema komentara predsednika"/>}{detail.data && <Pagination {...detail.data.presidentComments} label="Stranice komentara predsednika" onPage={value => page('commentPage', value)}/>}</section>}
    <div className="manager-report-shortcuts">{[['daily', 'Dnevni izveštaj', 'chart', 'Pregled dana'], ['weekly', 'Nedeljni izveštaj', 'calendar', 'Pregled nedelje']].map(([type, title, icon, caption]) => <Link key={type} to={'/reports?' + new URLSearchParams({scope: 'sector', id: user.sector?._id || user.sector || '', type})}><IconDisc name={icon}/><span><strong>{title}</strong><small>{caption} · {sectorName}</small></span><Icon name="arrow" size={15}/></Link>)}</div>
    <section className="manager-section manager-sector-overview" aria-labelledby="manager-sector-comment"><h2 id="manager-sector-comment">Komentar predsednika</h2>
      {comment ? <article className="manager-president-card"><IconDisc name="crown"/><div><div className="manager-president-card-heading"><div><strong>Predsednik</strong><small>za {sectorName}</small></div><time dateTime={comment.createdAt}>{time(comment.createdAt)}</time></div><p>{comment.body}</p>{comment.kind === 'instruction' && comment.responseStatus !== 'open' && <Badge tone="neutral">{comment.responseStatus === 'answered' ? 'Odgovoreno' : 'Rešeno'}</Badge>}<button className="employee-text-button" onClick={() => {setConversationReady(true); setConversation(true); setReply({...comment});}}>Odgovori <Icon name="arrow" size={16}/></button></div></article> : data && <EmptyState icon="message" title="Još nema komentara na nivou sektora">Predsednikove poruke sektoru biće prikazane ovde.</EmptyState>}
      <button className="employee-text-button manager-open-conversation" aria-expanded={conversation} aria-controls="manager-sector-thread" onClick={() => {setConversationReady(true); setConversation(value => !value);}}>{conversation ? 'Zatvori razgovor sektora' : 'Otvori razgovor sektora'}</button>
      {data && conversationReady && <div id="manager-sector-thread" hidden={!conversation}><EmployeeThread type="sector" id={data.sector._id} user={user} heading="Razgovor sektora" sectionId="manager-sector-discussion" initialReply={reply}/></div>}
    </section>
    <section className="manager-section manager-attention-overview" aria-labelledby="manager-attention"><div className="manager-section-heading"><h2 id="manager-attention">Potrebna pažnja</h2>{data?.attentionTotal > 0 && <Link to="/projects?tab=attention">Prikaži sve ({data.attentionTotal}) <Icon name="arrow" size={14}/></Link>}</div>{data?.attentionProjects.map(project => <ManagerProjectCard key={project._id} project={project} sectorName={sectorName} attention/>)}{data && !data.attentionProjects.length && <EmptyState icon="check" title="Nema projekata koji zahtevaju pažnju"/>}</section>
    <section className="manager-section manager-ideas-overview" aria-labelledby="manager-review-ideas"><div className="manager-section-heading"><h2 id="manager-review-ideas">Ideje na pregledu</h2><Link to="/ideas">{data?.stats.newIdeas ?? '—'} {countLabel(data?.stats.newIdeas || 0, 'ideja', 'ideje', 'ideja')} <Icon name="arrow" size={14}/></Link></div>{data?.ideas.map(idea => <Link key={idea._id} className="manager-idea-row" to={'/ideas/' + idea._id}><IconDisc name="bulb"/><div><strong>{idea.title}</strong><small><Icon name="user" size={12}/>{[idea.author?.firstName, idea.author?.lastName].filter(Boolean).join(' ') || 'Autor ideje'}</small></div><Badge>Na razmatranju</Badge><Icon name="chevron" size={16}/></Link>)}{data && !data.ideas.length && <EmptyState icon="bulb" title="Sve ideje su pregledane">Novi predlozi zaposlenih pojaviće se ovde.</EmptyState>}</section>
    <div className="manager-secondary-links"><Link to="/assignments">Zaduženja predsednika <Icon name="arrow" size={15}/></Link><Link to="/requests/new">Pitanje predsedniku <Icon name="arrow" size={15}/></Link></div>
  </div>;
}
