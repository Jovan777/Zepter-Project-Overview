import React, {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {EmptyState, Metric, Pagination, ProjectCard, ResourceState} from './EmployeeComponents.jsx';
import {countLabel} from './presentation.js';

const tabs = [['all', 'Svi'], ['active', 'U toku'], ['review', 'Na proveri'], ['completed', 'Završeni']];
export default function EmployeeProjects() {
  const [search, setSearch] = useSearchParams();
  const tab = tabs.some(([key]) => key === search.get('tab')) ? search.get('tab') : 'all';
  const sort = ['updated', 'due', 'title'].includes(search.get('sort')) ? search.get('sort') : 'updated';
  const page = Math.max(1, Number(search.get('page')) || 1);
  const q = search.get('q') || '';
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const query = new URLSearchParams({tab, sort, page, limit: 8, ...(q ? {q} : {})});
  const {data, busy, error, reload} = useEmployeeResource('/projects/mine?' + query);
  const update = changes => {
    const next = new URLSearchParams(search);
    next.delete('page');
    for (const [key, value] of Object.entries(changes)) {if (value) next.set(key, value); else next.delete(key);}
    setSearch(next, {replace: true});
  };
  return <div className="employee-projects">
    <div className="employee-metrics">
      <Metric icon="folder" value={data?.stats.activeProjects} label={countLabel(data?.stats.activeProjects || 0, 'Aktivan projekat', 'Aktivna projekta', 'Aktivnih projekata')}/>
      <Metric icon="clock" value={data?.stats.dueThisWeek} label="Rok ove nedelje"/>
    </div>
    {search.has('tools') && <section className="employee-tools" id="project-tools" aria-label="Pretraga i redosled projekata">
      <form onSubmit={event => {event.preventDefault(); update({q: draft.trim()});}}><label htmlFor="project-search">Pretraži moje projekte</label><div className="employee-search-field"><Icon name="search" size={20}/><input id="project-search" name="q" type="search" maxLength={160} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Naziv projekta…" autoFocus/><button type="submit" aria-label="Pokreni pretragu"><Icon name="arrow" size={20}/></button></div></form>
      <label className="employee-sort">Redosled<select value={sort} onChange={event => update({sort: event.target.value})}><option value="updated">Poslednja promena</option><option value="due">Najbliži rok</option><option value="title">Naziv projekta</option></select></label>
    </section>}
    <div className="employee-filter-tabs" role="group" aria-label="Filter projekata">{tabs.map(([key, title]) => <button key={key} aria-pressed={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => update({tab: key === 'all' ? null : key})}>{title}</button>)}</div>
    {tab === 'review' && <p className="employee-filter-note">Projekti na kojima je vaša aktivnost na proveri.</p>}
    {q && <div className="employee-search-summary"><span>Pretraga: „{q}“</span><button className="employee-icon-button" aria-label="Obriši pretragu" onClick={() => update({q: null})}><Icon name="close" size={18}/></button></div>}
    <section className="employee-section" aria-labelledby="project-list-heading"><h2 id="project-list-heading">Lista projekata</h2>
      <ResourceState busy={busy} error={error} onRetry={reload} noun="spisak projekata"/>
      <div className="employee-project-list" aria-live="polite" aria-busy={busy}>{data?.items.map(project => <ProjectCard key={project._id} project={project} sectorName={data.sectorName}/>)}
        {data && !data.items.length && <EmptyState title={q ? 'Nema rezultata pretrage' : tab === 'all' ? 'Još nemate projekata' : 'Nema projekata za ovaj filter'}>{q ? 'Pokušajte sa drugim nazivom ili obrišite pretragu.' : tab === 'all' ? 'Kada vas rukovodilac uključi u tim, projekat će biti prikazan ovde.' : 'Izaberite „Svi“ za pregled svih svojih projekata.'}</EmptyState>}
      </div>
      {data && <Pagination {...data} onPage={page => {const next = new URLSearchParams(search); next.set('page', page); setSearch(next); window.scrollTo({top: 0, behavior: 'smooth'});}}/>}
    </section>
  </div>;
}
