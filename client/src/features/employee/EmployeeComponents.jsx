import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {attachmentImageUrl} from '../../api.js';
import {formatDeadline, projectStatus} from './presentation.js';

export function Badge({children, tone = 'gold', title}) {
  return <span className={`employee-badge employee-badge--${tone}`} title={title}>{children}</span>;
}
export function IconDisc({name, className = ''}) {
  return <span className={`employee-icon-disc ${className}`}><Icon name={name}/></span>;
}
export function Metric({icon, value, label, to, onClick, expanded}) {
  const content = <><IconDisc name={icon}/><span className="employee-metric-copy"><strong>{value ?? '—'}</strong><span>{label}</span></span>{to || onClick ? <Icon name="chevron" size={17} className="employee-metric-chevron"/> : null}</>;
  return to ? <Link className="employee-metric" to={to}>{content}</Link> : onClick ? <button className="employee-metric" onClick={onClick} aria-expanded={expanded} aria-controls="moje-aktivnosti">{content}</button> : <div className="employee-metric">{content}</div>;
}
export function ResourceState({busy, error, onRetry, noun = 'pregled'}) {
  if (busy) return <div className="employee-loading" role="status"><span className="employee-loading-dot"/>Učitavamo vaš {noun}…</div>;
  if (error) return <div className="employee-error" role="alert"><p>{error}</p><button className="employee-text-button" onClick={onRetry}>Pokušaj ponovo <Icon name="arrow" size={18}/></button></div>;
  return null;
}
export function EmptyState({icon = 'folder', title, children}) {
  return <div className="employee-empty"><IconDisc name={icon}/><div><strong>{title}</strong>{children && <p>{children}</p>}</div></div>;
}
export function ProjectThumbnail({attachmentId, icon = 'folder'}) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    setUrl(null);
    if (!attachmentId) return;
    const controller = new AbortController();
    let objectUrl;
    attachmentImageUrl(attachmentId, {signal: controller.signal}).then(value => {
      objectUrl = value;
      if (controller.signal.aborted) URL.revokeObjectURL(value);
      else setUrl(value);
    }).catch(() => {});
    return () => {controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl);};
  }, [attachmentId]);
  return <span className={`employee-project-thumbnail ${url ? 'has-image' : ''}`}>{url ? <img src={url} alt="" loading="lazy" onError={() => setUrl(null)}/> : <Icon name={icon} size={34}/>}</span>;
}
export function ProjectCard({project, compact = false, sectorName = ''}) {
  const status = projectStatus(project);
  const progress = Math.min(100, Math.max(0, Number(project.progress) || 0));
  const activities = project.myActivities || [];
  return <Link className={`employee-project-card ${compact ? 'employee-project-card--compact' : ''}`} to={`/projects/${project._id}`}>
    <ProjectThumbnail attachmentId={project.thumbnailId}/>
    <div className="employee-project-content">
      <div className="employee-project-heading"><h3>{project.title}</h3><Badge tone={status.tone} title={status.description}>{status.label}</Badge>{compact && <Icon name="chevron" size={19}/>}</div>
      {!compact && <p className="employee-project-meta">{sectorName && <>{sectorName}<span aria-hidden="true"> · </span></>}{activities.length ? <>Moja aktivnost: {activities[0].title}{activities.length > 1 && <span className="employee-more-count"> +{activities.length - 1}</span>}</> : 'Trenutno nemate dodeljenu aktivnost'}</p>}
      <div className="employee-progress-row"><div className="employee-progress" role="progressbar" aria-label={`Napredak projekta ${project.title}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{width: `${progress}%`}}/></div><strong>{progress}%</strong></div>
      {!compact && <div className="employee-project-footer"><span><Icon name="calendar" size={19}/>Rok: {formatDeadline(project.dueDate)}</span><span className="employee-link-action">Otvori projekat <Icon name="arrow" size={20}/></span></div>}
    </div>
  </Link>;
}
export function Pagination({page, total, limit, onPage, label}) {
  const pages = Math.ceil(total / limit);
  if (pages < 2) return null;
  return <nav className="employee-pagination" aria-label={label || 'Stranice projekata'}><button disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Prethodna stranica"><Icon name="back" size={19}/></button><span>Stranica {page} od {pages}</span><button disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Sledeća stranica"><Icon name="arrow" size={19}/></button></nav>;
}
