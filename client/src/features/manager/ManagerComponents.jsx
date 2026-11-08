import React from 'react';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {Badge, IconDisc, ProjectThumbnail} from '../employee/EmployeeComponents.jsx';
import {formatDeadline, countLabel} from '../employee/presentation.js';
import {managerProjectStatus} from './presentation.js';

export function ManagerMetric({icon, value, label, to, onClick, expanded, controls}) {
  const content = <><IconDisc name={icon}/><span><strong>{value ?? '—'}</strong><span>{label}</span></span><Icon name="chevron" size={16}/></>;
  return to ? <Link className="manager-metric" to={to}>{content}</Link> : <button className="manager-metric" onClick={onClick} aria-expanded={expanded} aria-controls={controls}>{content}</button>;
}
export function ManagerProjectCard({project, sectorName, attention = false}) {
  const status = managerProjectStatus(project), progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
  const owner = [project.owner?.firstName, project.owner?.lastName].filter(Boolean).join(' ');
  return <Link className={`manager-project-card ${attention ? 'manager-project-card--attention' : ''}`} to={'/projects/' + project._id}>
    <ProjectThumbnail attachmentId={project.thumbnailId}/><div className="manager-project-card-content">
      <div className="manager-project-card-heading"><h3>{project.title}</h3><Badge tone={status.tone} title={status.description}>{status.label}</Badge></div>
      <p className="manager-project-team">{sectorName}{project.memberCount ? ` · Tim: ${project.memberCount} ${countLabel(project.memberCount, 'član', 'člana', 'članova')}` : ''}{owner ? ` · Odgovoran: ${owner}` : ' · Odgovorna osoba nije dodeljena'}</p>
      <div className="manager-progress-row"><div className="employee-progress" role="progressbar" aria-label={'Napredak projekta ' + project.title} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width: progress + '%'}}/></div><strong>{progress}%</strong></div>
      <div className="manager-project-card-footer"><span><Icon name="calendar" size={14}/>Rok: {formatDeadline(project.dueDate)}</span><span>Otvori projekat <Icon name="arrow" size={15}/></span></div>
    </div>
  </Link>;
}
