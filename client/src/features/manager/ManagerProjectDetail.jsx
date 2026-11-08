import React, {useEffect, useRef, useState} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {Badge, EmptyState, IconDisc, ResourceState} from '../employee/EmployeeComponents.jsx';
import {activityStatuses, countLabel, formatDeadline, projectStatuses} from '../employee/presentation.js';
import {DetailProgress} from '../employee/EmployeeProjectDetail.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import EmployeeAttachments from '../employee/EmployeeAttachments.jsx';
import {useManagerProjectHeader} from './ManagerShell.jsx';
import {formatProjectDate, personId, personName, priorities} from './projectForm.js';
import {ProjectExitDialog,useProjectGuard} from './ProjectFormParts.jsx';

export default function ManagerProjectDetail({user}) {
  const {id} = useParams();
  return <ProjectView key={id} id={id} user={user}/>;
}
function ProjectView({id, user}) {
  const [threadDirty,setThreadDirty]=useState(false),complete=useRef(false);
  const guard=useProjectGuard(threadDirty,complete,{ignoreSearch:true});
  const [search, setSearch] = useSearchParams();
  const project = useEmployeeResource('/projects/' + id, {keepPreviousData: true});
  const tasks = useEmployeeResource('/activities/project/' + id, {keepPreviousData: true});
  const sectors = useEmployeeResource('/sectors');
  const commentUrl = `/comments?targetType=project&targetId=${id}&limit=1`;
  const comments = useEmployeeResource(commentUrl, {keepPreviousData: true});
  const last = useEmployeeResource(comments.data?.total > 1 ? commentUrl + '&page=' + comments.data.total : null, {keepPreviousData: true});
  const [reply, setReply] = useState(null);
  const p = project.data?.project, activities = tasks.data?.items || [];
  useManagerProjectHeader('Detalji projekta', '/projects', p ? '/projects/' + id + '/edit' : undefined);
  const current = ['activities', 'team', 'comments', 'details'].includes(search.get('view')) ? search.get('view') : 'activities';
  const previousView = useRef(current);
  useEffect(() => {if (previousView.current !== current) {previousView.current = current; document.getElementById('manager-panel-' + current)?.scrollIntoView({block: 'start'});}}, [current]);
  const select = view => {const next = new URLSearchParams(search); if (view === 'activities') next.delete('view'); else next.set('view', view); setSearch(next, {replace: true});};
  if (!p) return <ResourceState busy={project.busy} error={project.error} onRetry={project.reload} noun="projekat"/>;
  const status = projectStatuses[p.status] || {label: p.status, tone: 'neutral'};
  const sectorName = sectors.data?.items.find(sector => personId(sector) === personId(p.sector))?.name || 'Moj sektor';
  const team = [...new Map([...(p.owner ? [p.owner] : []), ...p.members].map(person => [personId(person), person])).values()];
  const recent = (comments.data?.total > 1 ? last.data?.items : comments.data?.items)?.[0];
  const canAdd = !p.archived && !['completed', 'cancelled'].includes(p.status);
  const panel = key => 'manager-project-panel manager-project-panel--' + key + (current === key ? ' is-current' : '');
  const reportTo = '/reports?' + new URLSearchParams({scope: 'project', id, type: 'daily'});
  return <div className="manager-project-detail" data-view={current}>
    {project.error && <ResourceState error={project.error} onRetry={project.reload}/>}
    <section className="manager-project-overview" aria-labelledby="manager-project-title"><div className="manager-project-overview-heading"><IconDisc name="monitor"/><div><h1 id="manager-project-title">{p.title}</h1><p>{sectorName}</p></div><Badge tone={status.tone}>{status.label}</Badge></div><p className="manager-project-description">{p.description || 'Opis projekta još nije dodat.'}</p><div className="manager-project-progress-heading"><strong>Ukupni napredak</strong><strong>{p.progress}%</strong></div><DetailProgress value={p.progress} label="Ukupni napredak projekta"/><dl className="manager-project-facts"><div><dt><Icon name="calendar" size={18}/>Rok</dt><dd>{formatProjectDate(p.dueDate)}</dd></div><div><dt><Icon name="flag" size={18}/>Prioritet</dt><dd className={['high', 'urgent'].includes(p.priority) ? 'is-urgent' : ''}>{priorities[p.priority]||'Nije zadat'}</dd></div><div><dt><Icon name="users" size={18}/>Tim</dt><dd>{team.length} {countLabel(team.length, 'član', 'člana', 'članova')}</dd></div></dl></section>
    <nav className="manager-project-tabs" aria-label="Prikaz projekta">{[['activities', 'Aktivnosti', tasks.data?.items.length], ['team', 'Tim', team.length], ['comments', 'Komentari', comments.data?.total], ['details', 'Detalji']].map(([key, title, count]) => <button key={key} aria-pressed={current === key} aria-controls={'manager-panel-' + key} className={current === key ? 'is-active' : ''} onClick={() => select(key)}>{title}{count !== undefined && <span> ({count})</span>}</button>)}</nav>
    <div className="manager-project-content-grid">
      <section className={panel('activities')} id="manager-panel-activities" aria-labelledby="manager-activities-heading"><div className="manager-form-section-heading"><h2 id="manager-activities-heading">Aktivnosti projekta</h2>{canAdd && <Link className="employee-text-button" to={'/projects/' + id + '/new-activity'}><Icon name="plusSquare" size={16}/>Dodaj aktivnost</Link>}</div><ResourceState busy={tasks.busy && !tasks.data} error={tasks.error} onRetry={tasks.reload} noun="aktivnosti"/>
        {activities.map(activity => <Link className="manager-project-activity" key={activity._id} to={'/activities/' + activity._id}><span className={'manager-activity-state ' + (activity.status === 'completed' ? 'is-completed' : activity.status === 'blocked' ? 'is-blocked' : '')} title={activityStatuses[activity.status]}><Icon name={activity.status === 'completed' ? 'check' : activity.status === 'blocked' ? 'warning' : 'clock'} size={16}/><span className="employee-sr-only">{activityStatuses[activity.status]}</span></span><div className="manager-project-activity-copy"><strong>{activity.title}</strong><small>{activity.assignees.length ? activity.assignees.map(personName).join(', ') : 'Nije dodeljena osoba'}</small><DetailProgress value={activity.progress} label={'Napredak: ' + activity.title}/></div><div className="manager-project-activity-end"><span>{formatDeadline(activity.dueDate)}</span><Icon name="chevron" size={17}/></div></Link>)}
        {tasks.data && !activities.length && <EmptyState icon="activity" title="Još nema aktivnosti">Dodajte prvu aktivnost i dodelite je članu tima.</EmptyState>}
        <div className="manager-latest-comment"><div className="manager-form-section-heading"><h2>Najnoviji komentar</h2><button className="employee-text-button" onClick={() => select('comments')}>Prikaži sve <Icon name="arrow" size={15}/></button></div><ResourceState busy={comments.busy && !comments.data || last.busy && comments.data?.total > 1 && !last.data} error={comments.error || last.error} onRetry={() => {comments.reload(); last.reload();}} noun="komentare"/>{recent && <article><IconDisc name={recent.author?.role === 'president' ? 'crown' : 'message'}/><div><strong>{recent.author?.role === 'president' ? 'Predsednik' : personName(recent.author)}</strong><p>{recent.body}</p><button className="employee-text-button" onClick={() => {select('comments'); setReply({...recent});}}>Odgovori <Icon name="arrow" size={15}/></button></div></article>}{comments.data?.total === 0 && <p className="employee-small-note">Još nema komentara na projektu.</p>}</div>
      </section>
      <section className={panel('team')} id="manager-panel-team" aria-labelledby="manager-team-heading"><div className="manager-form-section-heading"><h2 id="manager-team-heading">Tim projekta</h2><Link to={'/projects/' + id + '/edit'} className="employee-text-button"><Icon name="edit" size={16}/>Uredi tim</Link></div><div className="manager-project-people">{team.map(person => <div key={personId(person)}><span className="manager-initials" aria-hidden="true">{[person.firstName, person.lastName].filter(Boolean).map(value => value[0]).join('')}</span><div><strong>{personName(person)}</strong><small>{personId(person) === personId(p.owner) ? 'Odgovorna osoba' : person.jobTitle || 'Član tima'}</small><span>{activities.filter(activity => activity.assignees.some(assignee => personId(assignee) === personId(person))).length} dodeljenih aktivnosti</span></div></div>)}</div></section>
      <div className={panel('comments')} id="manager-panel-comments"><EmployeeThread key={id} type="project" id={id} user={user} heading="Komentari na projekat" sectionId="manager-project-comments" initialReply={reply} allowInstructions onDraftChange={setThreadDirty}/></div>
      <section className={panel('details')} id="manager-panel-details" aria-labelledby="manager-info-heading"><div className="manager-form-section-heading"><h2 id="manager-info-heading">Detalji projekta</h2><Link to={'/projects/' + id + '/edit'} className="employee-text-button"><Icon name="edit" size={16}/>Uredi</Link></div><dl className="employee-summary-facts"><div><dt>Odgovorna osoba</dt><dd>{p.owner ? personName(p.owner) : 'Nije dodeljena'}</dd></div><div><dt>Početak</dt><dd>{formatProjectDate(p.startDate)}</dd></div><div><dt>Rok</dt><dd>{formatProjectDate(p.dueDate)}</dd></div><div><dt>Sektor</dt><dd>{sectorName}</dd></div></dl><EmployeeAttachments type="project" id={id} user={user} editable/></section>
    </div>
    {!canAdd && <p className="manager-form-notice">Projekat je zatvoren ili arhiviran. Za dodavanje aktivnosti prvo promenite njegov status.</p>}
    <div className="manager-project-actions">{canAdd && <Link className="manager-secondary-button" to={'/projects/' + id + '/new-activity'}><Icon name="plusSquare" size={17}/>Dodaj aktivnost</Link>}<button className="manager-secondary-button" onClick={() => select('comments')}><Icon name="message" size={17}/>Komentariši</button><Link className="employee-save-button" to={reportTo}><Icon name="chart" size={17}/>Izveštaj</Link></div>
  <ProjectExitDialog guard={guard} saving={false} entity="komentara"/></div>;
}
