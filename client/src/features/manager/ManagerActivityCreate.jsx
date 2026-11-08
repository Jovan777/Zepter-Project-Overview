import React, {useRef, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Link, useNavigate} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {api} from '../../api.js';
import {ResourceState} from '../employee/EmployeeComponents.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {useManagerProjectHeader} from './ManagerShell.jsx';
import {ActivityFields, ProjectExitDialog, useProjectGuard} from './ProjectFormParts.jsx';
import {activityPayload, personId} from './projectForm.js';

function ActivityEditor({project}) {
  const navigate = useNavigate(), complete = useRef(false), lock = useRef(false);
  const [row, setRow] = useState({title: '', description: '', dueDate: '', priority: 'medium', assigneeIds: []});
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false);
  const dirty = !!(row.title || row.description || row.dueDate || row.assigneeIds.length || row.priority !== 'medium');
  const guard = useProjectGuard(dirty || saving, complete);
  const save = async event => {
    event.preventDefault(); if (lock.current || uncertain || !row.title.trim()) return;
    lock.current = true; setSaving(true); setError('');
    try {await api('/activities/project/' + project._id, {method: 'POST', body: activityPayload(row)}); complete.current = true; window.dispatchEvent(new Event('zepter:data-changed')); navigate('/projects/' + project._id, {replace: true});}
    catch (e) {setError(e.message); if (!e.status || e.status >= 500) setUncertain(true);}
    finally {lock.current = false; setSaving(false);}
  };
  if (project.archived || ['completed', 'cancelled'].includes(project.status)) return <div className="manager-form-notice"><p>Ponovo aktivirajte projekat pre dodavanja aktivnosti.</p><Link to={'/projects/' + project._id + '/edit'}>Uredi projekat</Link></div>;
  const people = [...new Map(project.members.map(person => [personId(person), person])).values()];
  return <div className="manager-activity-create"><h1>Nova aktivnost</h1><p className="manager-form-sector">{project.title}</p><form onSubmit={save} aria-busy={saving}><ActivityFields row={row} onChange={setRow} people={people} disabled={saving || uncertain} prefix="new-activity"/>{error && <p role="alert" className="employee-form-error">{error}</p>}{uncertain && <p role="alert" className="manager-form-notice">Odgovor nije potvrđen. Proverite aktivnosti na projektu pre ponovnog unosa.</p>}<div className="manager-project-form-actions"><Link className="manager-secondary-button" to={'/projects/' + project._id}>Otkaži</Link><button className="employee-save-button" disabled={saving || uncertain}><Icon name="check" size={19}/>{saving ? 'Dodavanje…' : 'Dodaj aktivnost'}</button></div></form><ProjectExitDialog guard={guard} saving={saving}/></div>;
}
export default function ManagerActivityCreate() {
  const {id} = useParams(); useManagerProjectHeader('Dodavanje aktivnosti', '/projects/' + id);
  const resource = useEmployeeResource('/projects/' + id, {live: false});
  return resource.data ? <ActivityEditor key={id} project={resource.data.project}/> : <ResourceState busy={resource.busy} error={resource.error} onRetry={resource.reload} noun="projekat"/>;
}
