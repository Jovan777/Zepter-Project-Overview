import React, {useEffect} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {Badge, EmptyState, Metric, Pagination, ProjectThumbnail, ResourceState} from './EmployeeComponents.jsx';
import {formatDeadline} from './presentation.js';

const tabs = [['all', 'Sve'], ['review', 'Na razmatranju'], ['revision', 'Na doradi'], ['forwarded', 'Prosleđene predsedniku']];
const statuses = {submitted: ['Na razmatranju', 'gold'], in_review: ['Na razmatranju', 'gold'], revision_requested: ['Na doradi', 'warning'], forwarded: ['Prosleđeno predsedniku', 'success'], approved: ['Predsednik odobrio', 'success'], rejected: ['Predsednik odbio', 'warning']};
export default function EmployeeIdeas() {
  const [search, setSearch] = useSearchParams();
  const tab = tabs.some(([key]) => key === search.get('tab')) ? search.get('tab') : 'all';
  const page = Math.max(1, Math.floor(Number(search.get('page')) || 1));
  const resource = useEmployeeResource(`/ideas/mine?${new URLSearchParams({tab, page, limit: 8})}`);
  const {data, busy, error, reload} = resource;
  useEffect(() => {
    if (data && page > 1 && !data.items.length) setSearch(tab === 'all' ? {} : {tab}, {replace: true});
  }, [data, page, tab, setSearch]);
  const change = (nextTab, nextPage = 1) => {
    const next = new URLSearchParams();
    if (nextTab !== 'all') next.set('tab', nextTab);
    if (nextPage > 1) next.set('page', nextPage);
    setSearch(next); window.scrollTo({top: 0});
  };
  return <div className="employee-ideas">
    <div className="employee-metrics"><Metric icon="bulb" value={data?.stats.total} label="Ukupno ideja" to="/ideas"/><Metric icon="clock" value={data?.stats.revision} label="Na doradi" to="/ideas?tab=revision"/></div>
    <div className="employee-filter-tabs employee-idea-tabs" role="group" aria-label="Filter ideja">{tabs.map(([key, title]) => <button key={key} aria-pressed={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => change(key)}>{title}</button>)}</div>
    <section className="employee-section" aria-labelledby="idea-list-heading">
      <div className="employee-section-heading"><h2 id="idea-list-heading">Lista ideja</h2><Link className="employee-link-action employee-new-idea" to="/ideas/new"><span aria-hidden="true">＋</span> Nova ideja</Link></div>
      <ResourceState busy={busy} error={error} onRetry={reload} noun="spisak ideja"/>
      <div className="employee-ideas-list" aria-live="polite" aria-busy={busy}>{data?.items.map(idea => {
        const [label, tone] = statuses[idea.status] || [idea.status, 'neutral'];
        return <Link className="employee-idea-card" key={idea._id} to={'/ideas/' + idea._id}>
          <ProjectThumbnail attachmentId={idea.thumbnailId} icon="bulb"/>
          <div className="employee-idea-content"><div className="employee-idea-heading"><h3>{idea.title}</h3><Badge tone={tone}>{label}</Badge></div><p className="employee-idea-description">{idea.description}</p>
            {idea.status === 'revision_requested' && <div className="employee-idea-revision"><Icon name="info" size={19}/><span>{idea.reviewNote || 'Rukovodilac traži dopunu predloga.'}</span></div>}
            <div className="employee-idea-footer"><span><Icon name="calendar" size={18}/>Poslato: {formatDeadline(idea.createdAt)}</span><span className="employee-link-action">Otvori ideju <Icon name="arrow" size={19}/></span></div>
          </div>
        </Link>;
      })}
        {data && !data.items.length && <EmptyState icon="bulb" title={tab === 'all' ? 'Još niste poslali ideju' : 'Nema ideja za ovaj filter'}>{tab === 'all' ? 'Podelite predlog za unapređenje rada sa svojim rukovodiocem.' : 'Izaberite „Sve“ za pregled svih svojih ideja.'}</EmptyState>}
      </div>
      {data && <Pagination {...data} label="Stranice ideja" onPage={value => change(tab, value)}/>}
    </section>
  </div>;
}
