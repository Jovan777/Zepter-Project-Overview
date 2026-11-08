import React from 'react';
import {reportPeriod} from './reportPresentation.js';

export default function ManagerReportPreview({report}) {
  const stats=report.stats||{};
  return <section className="manager-report-preview" aria-labelledby="generated-report-heading"><h2 id="generated-report-heading">Pregled rada za period</h2><p>{reportPeriod(report)}</p><div className="manager-report-preview-stats"><div><strong>{stats.workEntries??0}</strong><span>Dnevnih unosa</span></div><div><strong>{stats.projects??0}</strong><span>Projekata</span></div><div><strong>{stats.avgProgress??0}%</strong><span>Aktuelni napredak</span></div></div><p className="employee-small-note">Rezultati su preuzeti iz dnevnih unosa za izabrani period. Statistika projekata i aktivnosti prikazuje njihovo aktuelno stanje.</p>
    {[[report.completed,'Urađeni poslovi'],[report.blockers,'Problemi i prepreke'],[report.nextSteps,'Naredni koraci']].map(([items,title])=><div className="manager-report-preview-section" key={title}><h3>{title} <small>({items?.length||0})</small></h3>{items?.map((item,index)=><article key={index}><strong>{item.employee||'Zaposleni'}{item.activity&&` · ${item.activity}`}</strong><time>{item.day}</time><p>{item.text}</p></article>)}{!items?.length&&<p className="employee-small-note">Nema evidentiranih stavki za izabrani period.</p>}</div>)}
  </section>;
}
