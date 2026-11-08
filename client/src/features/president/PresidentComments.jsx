import React from 'react';
import {useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {EmptyState,Pagination,ResourceState} from '../employee/EmployeeComponents.jsx';
import {commentDate,commentFilters,commentStatuses,commentTypes} from './commentPresentation.js';
import {fullName} from './presentation.js';
import {countLabel} from '../employee/presentation.js';
import './president-comments.css';

export function PresidentCommentCard({comment}){
 const type=commentTypes[comment.targetType],status=commentStatuses[comment.status];
 const content=<><div className="president-history-card-meta"><span><Icon name={type.icon} size={20}/>{type.label}{comment.kind==='instruction'&&<small> · Instrukcija</small>}</span>{commentDate(comment.createdAt)&&<time dateTime={comment.createdAt}>{commentDate(comment.createdAt)}</time>}</div>
  <div className="president-history-card-heading"><h2 id={'history-title-'+comment._id}>{comment.target.title}</h2><span id={'history-status-'+comment._id} className={'president-history-status status-'+comment.status}><Icon name={status.icon} size={13}/>{status.label}</span></div>
  {(comment.target.projectTitle||comment.targetType!=='sector'&&comment.target.sectorName)&&<p className="president-history-context">{comment.target.projectTitle?'Projekat: '+comment.target.projectTitle:comment.target.sectorName}</p>}
  <div className="president-history-quote"><span aria-hidden="true">“</span><p id={'history-body-'+comment._id}>{comment.body||'Tekst komentara više nije dostupan.'}</p>{comment.link&&<Icon name="chevron" size={18}/>}</div>
  {comment.reply&&<div className="president-history-reply"><span className="president-history-avatar" aria-hidden="true">{[comment.reply.author?.firstName,comment.reply.author?.lastName].filter(Boolean).map(part=>part[0]).join('')||'?'}</span><div><strong>{comment.reply.author?fullName(comment.reply.author):'Autor odgovora nije dostupan'}<small> · Poslednji odgovor</small></strong><p>{comment.reply.body}</p><time dateTime={comment.reply.createdAt}>{commentDate(comment.reply.createdAt)}</time></div></div>}
  {!comment.reply&&comment.status==='answered'&&<p className="president-history-note">Odgovor je evidentiran. Otvorite razgovor za ceo pregled.</p>}
  {comment.status==='unavailable'&&<p className="president-history-note">Povezani sadržaj više nije dostupan. Sačuvan je vaš komentar.</p>}
 </>;
 return comment.link?<Link className="president-history-card" to={comment.link} aria-labelledby={'history-title-'+comment._id} aria-describedby={'history-body-'+comment._id+' history-status-'+comment._id}>{content}</Link>:<article className="president-history-card is-unavailable">{content}</article>;
}
export default function PresidentComments(){
 const [search,setSearch]=useSearchParams(),filters=commentFilters(search);
 const resource=useEmployeeResource('/comments/mine/president?'+new URLSearchParams(filters),{keepPreviousData:true});
 const data=resource.data?.filters.status===filters.status&&resource.data?.filters.targetType===filters.targetType&&resource.data?.page===filters.page?resource.data:null;
 const update=patch=>{const next=new URLSearchParams(search);next.delete('page');for(const [key,value]of Object.entries(patch)){if(value&&value!=='all')next.set(key,value);else next.delete(key);}setSearch(next);};
 return <div className="president-history-page"><div className="president-greeting"><h1>Moji komentari i instrukcije</h1><p>Sve vaše poruke i odgovori na jednom mestu</p></div>
  <div className="president-history-metrics">{[['all','Ukupno','message','total'],['open','Čeka odgovor','clock','open'],['answered','Odgovoreno','check','answered']].map(([status,label,icon,key])=><button key={key} onClick={()=>update({status,targetType:'all'})} aria-label={label+': '+(data?.stats[key]??'—')}><Icon name={icon} size={21}/><strong>{data?.stats[key]??'—'}</strong><span>{label}</span></button>)}</div>
  <p className="president-history-metric-caption">Brojevi obuhvataju celu vašu istoriju.{data&&(data.stats.resolved>0||data.stats.unavailable>0)?' Rešene i nedostupne poruke izdvojene su u posebnim filterima.':''}</p>
  <div className="president-history-filters" role="group" aria-label="Status odgovora">{[['all','Sve'],['open','Čeka odgovor'],['answered','Odgovoreno'],...(data?.stats.resolved>0||filters.status==='resolved'?[['resolved','Rešeno ('+(data?.stats.resolved??'—')+')']]:[]),...(data?.stats.unavailable>0||filters.status==='unavailable'?[['unavailable','Nedostupno ('+(data?.stats.unavailable??'—')+')']]:[])].map(([status,label])=><button key={status} aria-pressed={filters.status===status} onClick={()=>update({status})}>{label}</button>)}</div>
  <div className="president-history-filters president-history-types" role="group" aria-label="Nivo komentara"><button aria-pressed={filters.targetType==='all'} onClick={()=>update({targetType:'all'})}>Svi nivoi</button>{Object.entries(commentTypes).filter(([type])=>!['assignment','request'].includes(type)||data?.stats.byType[type]>0||filters.targetType===type).map(([type,{label,icon}])=><button key={type} aria-pressed={filters.targetType===type} onClick={()=>update({targetType:type})}><Icon name={icon} size={15}/>{label}</button>)}</div>
  <ResourceState busy={resource.busy&&!data} error={resource.error} onRetry={resource.reload} noun="istoriju komentara"/>
  {data&&<><p className="president-history-result-count" role="status">{data.total} {countLabel(data.total,'poruka','poruke','poruka')} u ovom prikazu</p><div className="president-history-list">{data.items.map(comment=><PresidentCommentCard key={comment._id} comment={comment}/>)}</div>{!data.items.length&&(data.total?<div className="employee-empty"><p>Na ovoj stranici više nema poruka.</p><button className="employee-text-button" onClick={()=>update({page:null})}>Otvori prvu stranicu</button></div>:<EmptyState icon="message" title={data.stats.total?'Nema poruka za ovaj filter':'Još nemate komentara'}>{data.stats.total?'Izaberite drugi status ili nivo.':'Komentari i instrukcije koje ostavite na sektoru, projektu, aktivnosti ili ideji pojaviće se ovde.'}</EmptyState>)}<Pagination {...data} label="Stranice mojih komentara" onPage={page=>update({page})}/></>}
 </div>;
}
