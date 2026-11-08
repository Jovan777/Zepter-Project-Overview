import React, {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {Badge, EmptyState, IconDisc, ProjectThumbnail, ResourceState} from './EmployeeComponents.jsx';
import {activityStatuses, formatDeadline, projectStatus} from './presentation.js';
import EmployeeThread from './EmployeeThread.jsx';
import EmployeeAttachments from './EmployeeAttachments.jsx';
import {useEmployeeBackLink} from './EmployeeShell.jsx';

const personId = person => person?._id || person;
export function DetailProgress({value, label, leading = false}) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className={`employee-detail-progress ${leading ? 'is-leading' : ''}`}><div className="employee-progress" role="progressbar" aria-label={label} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width: progress + '%'}}/></div><strong>{progress}%</strong></div>;
}
export function ActivityBadge({status}) {
  return <Badge tone={status === 'completed' ? 'success' : ['blocked', 'review'].includes(status) ? 'warning' : status === 'planned' ? 'neutral' : 'gold'}>{activityStatuses[status] || status}</Badge>;
}
export default function EmployeeProjectDetail({user}) {
  const {id} = useParams();
  useEmployeeBackLink('/projects', 'Nazad na moje projekte');
  const project = useEmployeeResource('/projects/' + id, {keepPreviousData: true});
  const tasks = useEmployeeResource('/activities/project/' + id, {keepPreviousData: true});
  const sectors = useEmployeeResource('/sectors', {keepPreviousData: true});
  const attachments = useEmployeeResource('/attachments/target/project/' + id, {keepPreviousData: true});
  const [teamOpen, setTeamOpen] = useState(false), [detailsOpen, setDetailsOpen] = useState(false);
  const p = project.data?.project;
  if (!p) return <ResourceState {...project} onRetry={project.reload} noun="projekat"/>;
  const activities = tasks.data?.items || [];
  const mine = activities.filter(a => a.assignees.some(person => personId(person) === user._id));
  const status = projectStatus(p);
  const sectorName = sectors.data?.items.find(s => s._id === personId(p.sector))?.name || 'Moj sektor';
  const image = attachments.data?.items.find(a => ['image/png', 'image/jpeg', 'image/webp'].includes(a.mime));
  const team = [...new Map([p.owner, ...p.members].filter(Boolean).map(person => [personId(person), person])).values()];
  return <div className="employee-project-detail">
    <nav className="employee-breadcrumb" aria-label="Putanja"><Link to="/projects">{sectorName}</Link><Icon name="chevron" size={14}/><span>Projekat</span></nav>
    <div className="employee-detail-title"><h1>{p.title}</h1><Badge tone={status.tone}>{status.label}</Badge></div>
    <p className="employee-detail-description">{p.description || 'Opis projekta još nije dodat.'}</p>
    {project.error && <ResourceState error={project.error} onRetry={project.reload}/>}
    <section className="employee-project-summary" aria-label="Pregled projekta"><ProjectThumbnail attachmentId={image?._id}/><div><h2>Ukupni napredak projekta</h2><DetailProgress value={p.progress} label="Ukupni napredak projekta"/><dl className="employee-summary-facts"><div><dt><Icon name="calendar" size={18}/>Rok</dt><dd>{formatDeadline(p.dueDate)}</dd></div><div><dt><Icon name="users" size={18}/>Odgovoran</dt><dd>{p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : 'Nije dodeljen'}</dd></div><div><dt><Icon name="user" size={18}/>Moja uloga</dt><dd>{mine.length ? mine.map(a => a.title).join(' · ') : 'Član projektnog tima'}</dd></div></dl></div></section>
    <nav className="employee-project-shortcuts" aria-label="Sadržaj projekta"><a href="#project-comments"><IconDisc name="message"/><strong>Komentari</strong><Icon name="chevron" size={17}/></a><a href="#project-team" onClick={() => setTeamOpen(true)}><IconDisc name="users"/><strong>Tim</strong><Icon name="chevron" size={17}/></a><a href="#project-info" onClick={() => setDetailsOpen(true)}><IconDisc name="info"/><strong>Detalji</strong><Icon name="chevron" size={17}/></a></nav>
    <div className="workspace-detail-grid"><div className="workspace-detail-primary"><section className="employee-section" aria-labelledby="project-activities-heading"><h2 id="project-activities-heading">Aktivnosti projekta</h2><ResourceState busy={tasks.busy && !tasks.data} error={tasks.error} onRetry={tasks.reload} noun="aktivnosti"/>
      {activities.map(a => {
        const own = a.assignees.some(person => personId(person) === user._id);
        return <Link key={a._id} className={`employee-project-activity ${own ? 'is-mine' : ''}`} to={'/activities/' + a._id}><IconDisc name="monitor"/><div className="employee-project-activity-copy"><div className="employee-project-activity-heading"><h3>{a.title}</h3><ActivityBadge status={a.status}/></div><p className="employee-context"><Icon name="user" size={15}/>{a.assignees.length ? a.assignees.map(person => `${person.firstName} ${person.lastName}`).join(', ') : 'Nema dodeljenih osoba'}{own && <span className="employee-mine-tag">Moja aktivnost</span>}</p><div className="employee-activity-progress-line"><DetailProgress value={a.progress} label={`Napredak aktivnosti ${a.title}`}/><span className="employee-context"><Icon name="calendar" size={15}/>{formatDeadline(a.dueDate)}</span></div></div><Icon name="chevron" size={18}/></Link>;
      })}
      {tasks.data && !activities.length && <EmptyState icon="activity" title="Još nema aktivnosti">Rukovodilac će ovde dodati zaduženja za tim.</EmptyState>}
    </section>
    <details className="employee-detail-disclosure" id="project-team" open={teamOpen} onToggle={event => setTeamOpen(event.currentTarget.open)}><summary><Icon name="users" size={21}/><span>Tim projekta</span><small>{team.length}</small><Icon name="chevron" size={17}/></summary><div className="employee-team-list">{team.map(person => <div key={person._id}><IconDisc name="user"/><div><strong>{person.firstName} {person.lastName}{person._id === user._id ? ' (vi)' : ''}</strong><span>{person._id === personId(p.owner) ? 'Odgovorna osoba' : person.jobTitle || 'Član tima'}</span></div></div>)}</div></details>
    <details className="employee-detail-disclosure" id="project-info" open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)}><summary><Icon name="info" size={21}/><span>Detalji projekta</span><Icon name="chevron" size={17}/></summary><dl className="employee-summary-facts"><div><dt>Početak</dt><dd>{formatDeadline(p.startDate)}</dd></div><div><dt>Prioritet</dt><dd>{({low: 'Nizak', medium: 'Srednji', high: 'Visok', urgent: 'Hitan'})[p.priority]}</dd></div></dl><p className="employee-small-note">Rokove, tim i osnovne podatke projekta uređuje rukovodilac. Svoje aktivnosti možete otvoriti i ažurirati iz liste iznad.</p></details>
    <details className="employee-detail-disclosure"><summary><Icon name="clip" size={21}/><span>Prilozi projekta</span><small>{attachments.data?.items.length ?? '—'}</small><Icon name="chevron" size={17}/></summary><EmployeeAttachments type="project" id={id} user={user} editable={p.members.some(person => personId(person) === user._id)} resource={attachments}/></details>
    </div><div className="workspace-detail-aside"><EmployeeThread type="project" id={id} user={user} heading="Komentari na projekat" sectionId="project-comments"/></div></div>
  </div>;
}
