import React, {useEffect} from 'react';
import {Link, useLocation, useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {Badge, EmptyState, IconDisc, Metric, Pagination, ProjectCard, ResourceState} from './EmployeeComponents.jsx';
import {activityStatuses, countLabel, deadlineLabel, formatDeadline} from './presentation.js';

export default function EmployeeHome({user}) {
  const [search, setSearch] = useSearchParams();
  const {hash} = useLocation();
  const showActivities = search.get('activities') === '1';
  const activityPage = Math.max(1, Number(search.get('activityPage')) || 1);
  const {data, busy, error, reload} = useEmployeeResource(`/dashboard/employee?activityPage=${activityPage}`);
  useEffect(() => {
    if (data && hash) document.getElementById(hash.slice(1))?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [data, hash]);
  const stats = data?.stats || {};
  const activities = data?.activities;
  const toggleActivities = () => {
    const next = new URLSearchParams(search);
    if (showActivities) {next.delete('activities'); next.delete('activityPage');} else next.set('activities', '1');
    setSearch(next, {replace: true});
  };
  return <div className="employee-home">
    <div className="employee-greeting"><h1>Dobar dan, {user.firstName}</h1><p>Pregled vaših aktivnosti</p></div>
    <ResourceState busy={busy} error={error} onRetry={reload}/>
    <div className="employee-metrics" aria-busy={busy}>
      <Metric icon="folder" value={stats.activeProjects} label={countLabel(stats.activeProjects || 0, 'Moj projekat', 'Moja projekta', 'Mojih projekata')} to="/projects"/>
      <Metric icon="clock" value={stats.pendingActivities} label="Moje aktivnosti" onClick={toggleActivities} expanded={showActivities}/>
    </div>
    <div className="employee-shortcuts">
      <Link className="employee-shortcut" to="/#najnoviji-komentari"><IconDisc name="message"/><span><strong>Novi komentari</strong><span>{data ? `${stats.unreadComments} ${countLabel(stats.unreadComments, 'nova poruka', 'nove poruke', 'novih poruka')}` : 'Poslednje poruke'}</span></span><span className="employee-shortcut-arrow"><Icon name="arrow" size={19}/></span></Link>
      <Link className="employee-shortcut" to="/ideas/new"><IconDisc name="bulb"/><span><strong>Nova ideja</strong><span>Pošaljite predlog</span></span><span className="employee-shortcut-arrow"><Icon name="arrow" size={19}/></span></Link>
    </div>
    {showActivities && <section className="employee-section" id="moje-aktivnosti"><div className="employee-section-heading"><h2>Moje aktivnosti</h2><button className="employee-icon-button" onClick={toggleActivities} aria-label="Sakrij moje aktivnosti"><Icon name="close" size={19}/></button></div>
      {activities?.items.map(a => <Link key={a._id} className="employee-task-row" to={`/activities/${a._id}`}><IconDisc name="activity"/><div><strong>{a.title}</strong><span>{a.projectTitle}</span><small>{activityStatuses[a.status]} · Rok: {formatDeadline(a.dueDate)}</small></div><Icon name="chevron" size={18}/></Link>)}
      {data && !activities?.items.length && <EmptyState icon="check" title="Nema otvorenih aktivnosti">Ovde će se pojaviti vaša nova zaduženja.</EmptyState>}
      {activities && <Pagination {...activities} label="Stranice mojih aktivnosti" onPage={page => {const next = new URLSearchParams(search); next.set('activityPage', page); setSearch(next, {replace: true});}}/>}
    </section>}
    <section className="employee-section" aria-labelledby="attention-heading"><h2 id="attention-heading">Potrebna pažnja</h2>
      {data?.attention.map(item => {
        const badge = deadlineLabel(item, data.today);
        return <Link className="employee-attention-card" key={item._id} to={item.link}><IconDisc name={item.status === 'instruction' ? 'message' : 'monitor'}/><div className="employee-attention-content"><div className="employee-attention-heading"><h3>{item.title}</h3><Badge tone={badge.tone}>{badge.label}</Badge></div><p className="employee-context"><Icon name="folder" size={17}/>{item.projectTitle}</p><p className="employee-attention-description">{item.description}</p><span className="employee-link-action">Pogledaj <Icon name="arrow" size={22}/></span></div></Link>;
      })}
      {data && !data.attention.length && <EmptyState icon="check" title="Sve je pod kontrolom">Trenutno nema blokada, rokova za danas ili otvorenih instrukcija koje traže vašu pažnju.</EmptyState>}
    </section>
    <section className="employee-section" id="najnoviji-komentari" aria-labelledby="comments-heading"><h2 id="comments-heading">Najnoviji komentari</h2>
      {data?.latestComments.map(comment => <Link className="employee-comment-card" key={comment._id} to={comment.link}><IconDisc name={comment.author?.role === 'president' ? 'user' : 'users'}/><div><h3>{comment.author?.role === 'president' ? 'Predsednik' : 'Rukovodilac'}</h3><p className="employee-comment-body">{comment.body}</p><p className="employee-context"><Icon name={comment.targetType === 'activity' ? 'activity' : 'folder'} size={16}/><span>{({project: 'Projekat', activity: 'Aktivnost', idea: 'Ideja', sector: 'Sektor'})[comment.targetType]}: {comment.targetTitle}</span></p></div><Icon name="chevron" size={18}/></Link>)}
      {data && !data.latestComments.length && <EmptyState icon="message" title="Još nema komentara">Ovde ćete videti poslednje poruke predsednika i rukovodioca vezane za vaš rad.</EmptyState>}
    </section>
    <section className="employee-section" aria-labelledby="my-projects-heading"><div className="employee-section-heading"><h2 id="my-projects-heading">Moji projekti</h2><Link className="employee-link-action" to="/projects">Prikaži sve <Icon name="arrow" size={20}/></Link></div>
      {data?.projects.map(project => <ProjectCard key={project._id} project={project} compact/>)}
      {data && !data.projects.length && <EmptyState title="Još niste uključeni u projekat">Dodeljeni projekti će se automatski pojaviti ovde.</EmptyState>}
    </section>
    <Link className="employee-daily-link" to="/daily"><Icon name="calendar" size={17}/>Evidentiraj današnji rad<Icon name="arrow" size={17}/></Link>
  </div>;
}
