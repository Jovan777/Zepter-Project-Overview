import React from 'react';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import {Badge,IconDisc,ProjectThumbnail} from '../employee/EmployeeComponents.jsx';
import {belgradeDate} from '../employee/presentation.js';
import {managerProjectStatus} from '../manager/presentation.js';

export function ReportShortcuts({sectorId}){
 return <div className="president-reports">{[['daily','Dnevni izveštaj','chart',sectorId?'Pregled dnevnog rada':'Pregled dana iz svih sektora'],['weekly','Nedeljni izveštaj','calendar',sectorId?'Pregled nedelje':'Pregled nedelje iz svih sektora']].map(([type,title,icon,caption])=><Link key={type} to={'/reports?'+new URLSearchParams({scope:sectorId?'sector':'company',...(sectorId?{id:sectorId}:{}),type})}><IconDisc name={icon}/><span><strong>{title}</strong><small>{caption}</small></span><Icon name="arrow" size={18}/></Link>)}</div>;
}
export function AttentionCard({item}){
 return <Link className="president-attention-card" to={item.link}><IconDisc name={item.kind==='request'?'message':item.kind==='assignment'?'flag':item.kind==='idea'?'bulb':'warning'}/><div><div className="president-card-heading"><h3>{item.title}</h3><Badge tone="warning">{item.label}</Badge></div><p className="president-context"><Icon name="folder" size={14}/>{item.sectorName}</p><p className="president-attention-description">{item.description}</p><span className="president-open">Pogledaj <Icon name="arrow" size={18}/></span></div></Link>;
}
export function updatedLabel(value,now=new Date()){
 if(!value||Number.isNaN(Date.parse(value)))return 'Ažuriranje nije dostupno';
 const day=belgradeDate(new Date(value)),today=belgradeDate(now),difference=(Date.parse(today+'T12:00:00Z')-Date.parse(day+'T12:00:00Z'))/86400000;
 return difference===0?'Ažurirano danas':difference===1?'Ažurirano juče':'Ažurirano '+new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short'}).format(new Date(value));
}
export function PresidentProjectCard({project}){
 const status=managerProjectStatus(project),progress=Math.max(0,Math.min(100,Number(project.progress)||0));
 const owner=project.owner?[project.owner.firstName,project.owner.lastName].filter(Boolean).join(' '):'';
 return <Link className="president-project-card" to={'/projects/'+project._id}><ProjectThumbnail attachmentId={project.thumbnailId}/><div><div className="president-card-heading"><h3>{project.title}</h3><Badge tone={status.tone}>{status.label}</Badge></div><p className="president-team">{owner?'Odgovoran: '+owner:'Odgovorna osoba nije dodeljena'}{project.memberCount>0&&` · Tim: ${project.memberCount}`}</p><div className="employee-progress-row"><div className="employee-progress" role="progressbar" aria-label={'Napredak projekta '+project.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{width:progress+'%'}}/></div><strong>{progress}%</strong></div><div className="president-project-meta"><span><Icon name="clock" size={13}/><time dateTime={project.updatedAt}>{updatedLabel(project.updatedAt)}</time></span><span title="Komentari na projekat"><Icon name="message" size={13}/>{project.commentCount}</span><span className="president-open">Otvori projekat <Icon name="arrow" size={15}/></span></div></div></Link>;
}
