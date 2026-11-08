import React, {useState} from 'react';
import {EmptyState, Pagination, ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {activityFieldLabels} from './activityManagement.js';
import {formatProjectDate, personName} from './projectForm.js';

export default function ManagerActivityHistory({id}) {
  const [page,setPage]=useState(1),[worklogPage,setWorklogPage]=useState(1);
  const resource=useEmployeeResource(`/activities/${id}/history?page=${page}&worklogPage=${worklogPage}&limit=10`,{keepPreviousData:true});
  const {events,worklogs}=resource.data||{};
  return <section className="manager-activity-history" aria-labelledby="activity-history-heading"><h2 id="activity-history-heading">Istorija rada</h2><p className="employee-small-note">Dnevni unosi zaposlenih i evidentirane izmene aktivnosti. Starije vrednosti polja nisu deo evidencije promena.</p><ResourceState busy={resource.busy&&!resource.data} error={resource.error} onRetry={resource.reload} noun="istoriju"/>
    <h3>Dnevni rad zaposlenih</h3>{worklogs?.items.map(log=><article className="manager-worklog-card" key={log._id}><div><strong>{personName(log.user)}</strong><time>{formatProjectDate(log.day+'T12:00:00Z')}</time></div><p>{log.done}</p>{log.nextSteps&&<p><b>Sledeći korak:</b> {log.nextSteps}</p>}{log.blockers&&<p className="manager-history-blocker"><b>Prepreke:</b> {log.blockers}</p>}{log.minutes!==undefined&&<small>{log.minutes} min</small>}</article>)}{worklogs&&!worklogs.items.length&&<EmptyState icon="calendar" title="Još nema dnevnih unosa za ovu aktivnost"/>}{worklogs&&<Pagination {...worklogs} label="Stranice dnevnog rada aktivnosti" onPage={setWorklogPage}/>}
    <h3>Izmene aktivnosti</h3>{events?.items.map(event=><article className="manager-history-event" key={event._id}><strong>{event.action==='activity.created'?'Aktivnost je kreirana':'Aktivnost je ažurirana'}</strong><p>{event.actor?personName(event.actor):'Korisnik više nije dostupan'} · {formatProjectDate(event.createdAt)}</p>{event.fields.length>0&&<small>Izmenjeno: {event.fields.map(key=>activityFieldLabels[key]).join(', ')}</small>}</article>)}{events&&!events.items.length&&<EmptyState icon="clock" title="Još nema evidentiranih izmena"/>}{events&&<Pagination {...events} label="Stranice izmena aktivnosti" onPage={setPage}/>}
  </section>;
}
