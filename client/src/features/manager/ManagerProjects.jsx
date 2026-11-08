import React, {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {EmptyState, Pagination, ResourceState} from '../employee/EmployeeComponents.jsx';
import {ManagerMetric, ManagerProjectCard} from './ManagerComponents.jsx';
import {managerTabs, managerExtraTabs} from './presentation.js';
import {countLabel} from '../employee/presentation.js';

export default function ManagerProjects() {
  const [search, setSearch] = useSearchParams();
  const valid = [...managerTabs.map(([key]) => key), ...Object.keys(managerExtraTabs)];
  const tab = valid.includes(search.get('tab')) ? search.get('tab') : 'all';
  const q = search.get('q') || '', sort = ['updated', 'due', 'title'].includes(search.get('sort')) ? search.get('sort') : 'updated';
  const page = Math.max(1, Math.floor(Number(search.get('page')) || 1));
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const {data, busy, error, reload} = useEmployeeResource('/projects/sector?' + new URLSearchParams({tab, q, sort, page, limit: 8}));
  const update = changes => {const next = new URLSearchParams(search); next.delete('page'); for (const [key, value] of Object.entries(changes)) {if (value) next.set(key, value); else next.delete(key);} setSearch(next);};
  useEffect(() => {if (data && page > 1 && !data.items.length) {const next = new URLSearchParams(search); next.delete('page'); setSearch(next, {replace: true});}}, [data, page, search, setSearch]);
  return <div className="manager-projects">
    <div className="manager-heading"><h1>Projekti sektora</h1><p>{data?.sector.name || 'Vaš sektor'}</p></div>
    <div className="manager-metrics"><ManagerMetric icon="folder" value={data?.stats.activeProjects} label={countLabel(data?.stats.activeProjects || 0, 'Aktivan projekat', 'Aktivna projekta', 'Aktivnih projekata')} to="/projects?tab=active"/><ManagerMetric icon="warning" value={data?.stats.atRiskProjects} label="Rok ugrožen" to="/projects?tab=at_risk"/></div>
    <Link className="manager-create-project" to="/projects/new"><Icon name="plusSquare" size={19}/>Kreiraj projekat</Link>
    {search.has('tools') && <section className="manager-project-tools" aria-label="Pretraga i redosled projekata"><form onSubmit={event => {event.preventDefault(); update({q: draft.trim()});}}><label htmlFor="manager-search">Pretraži projekte sektora</label><div><input id="manager-search" type="search" maxLength={160} placeholder="Naziv projekta…" value={draft} onChange={event => setDraft(event.target.value)}/><button aria-label="Pokreni pretragu"><Icon name="search" size={19}/></button></div></form><label>Redosled<select value={sort} onChange={event => update({sort: event.target.value})}><option value="updated">Poslednja promena</option><option value="due">Najbliži rok</option><option value="title">Naziv</option></select></label><label>Ostali statusi<select value={managerExtraTabs[tab] ? tab : ''} onChange={event => update({tab: event.target.value || null})}><option value="">Svi</option>{Object.entries(managerExtraTabs).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label></section>}
    <div className="manager-tabs" role="group" aria-label="Filter projekata sektora">{managerTabs.map(([key, title]) => <button key={key} aria-pressed={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => update({tab: key === 'all' ? null : key})}>{title}</button>)}</div>
    {['review', 'on_track'].includes(tab) && <p className="manager-filter-note">{tab === 'review' ? 'Projekti sa aktivnošću koja čeka proveru.' : 'Aktivni projekti bez probijenog roka, blokiranih ili zakašnjelih aktivnosti.'}</p>}
    {(q || managerExtraTabs[tab]) && <div className="manager-applied-filter"><span>{q && `Pretraga: „${q}“`}{q && managerExtraTabs[tab] ? ' · ' : ''}{managerExtraTabs[tab]}</span><button className="employee-icon-button" aria-label="Ukloni filtere" onClick={() => update({q: null, tab: null})}><Icon name="close" size={16}/></button></div>}
    <section className="manager-section" aria-labelledby="manager-project-list"><h2 id="manager-project-list">Lista projekata</h2><ResourceState busy={busy} error={error} onRetry={reload} noun="spisak projekata"/><div className="manager-project-list" aria-busy={busy}>{data?.items.map(project => <ManagerProjectCard key={project._id} project={project} sectorName={data.sector.name}/>)}{data && !data.items.length && <EmptyState title={tab === 'all' && !q ? 'Sektor još nema projekata' : 'Nema projekata za ovaj izbor'}>{tab === 'all' && !q ? 'Kreirajte prvi projekat i uključite članove tima.' : 'Izaberite „Svi“ ili promenite pretragu.'}</EmptyState>}</div>{data && <Pagination {...data} label="Stranice projekata sektora" onPage={value => {const next = new URLSearchParams(search); next.set('page', value); setSearch(next); window.scrollTo({top: 0});}}/>}</section>
  </div>;
}
