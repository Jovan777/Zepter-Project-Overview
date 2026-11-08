import React from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {Badge,EmptyState,ResourceState,Pagination} from '../employee/EmployeeComponents.jsx';
import {attentionTime} from './reportPresentation.js';
import {usePresidentBackLink} from './navigation.jsx';
import './president-reports-attention.css';
const tabs=[['all','Sve'],['approvals','Odobrenja'],['deadlines','Rokovi'],['comments','Komentari'],['ideas','Ideje']];
export default function PresidentAttention(){
 const [search,setSearch]=useSearchParams(),sectorId=search.get('sectorId')||'',tab=tabs.some(([key])=>key===search.get('tab'))?search.get('tab'):'all';
 const resource=useEmployeeResource('/dashboard/president/attention?'+new URLSearchParams({page:search.get('page')||'1',limit:8,tab,...(sectorId?{sectorId}:{})}),{keepPreviousData:true}),sectors=useEmployeeResource('/sectors'),data=resource.data?.tab===tab&&(resource.data?.sectorId||'')===sectorId?resource.data:null;
 usePresidentBackLink(sectorId?'/sectors/'+sectorId:'/','Nazad na '+(sectorId?'sektor':'početnu'));
 const change=patch=>{const next=new URLSearchParams(search);next.delete('page');for(const[key,value]of Object.entries(patch)){if(value)next.set(key,value);else next.delete(key);}setSearch(next);};
 return <div className="president-attention-page"><div className="president-greeting"><h1>Potrebna moja pažnja</h1><p>Pitanja koja čekaju vašu reakciju</p></div>
  <div className="president-attention-metrics">{[['all','Čekaju reakciju','calendar'],['deadlines','Rok ugrožen','warning'],['approvals','Odobrenja na čekanju','file']].map(([key,label,icon])=><button key={key} onClick={()=>change({tab:key==='all'?null:key})} aria-label={label+': '+(data?.stats[key]??'—')}><Icon name={icon} size={21}/><strong>{data?.stats[key]??'—'}</strong><span>{label}</span></button>)}</div>
  <div className="president-attention-tabs" role="group" aria-label="Vrsta važnih pitanja">{tabs.map(([key,label])=><button key={key} aria-pressed={tab===key} onClick={()=>change({tab:key==='all'?null:key})}>{label}</button>)}</div>
  <label className="president-attention-sector">Sektor<select value={sectorId} onChange={event=>change({sectorId:event.target.value})}><option value="">Svi sektori</option>{sectors.data?.items.map(sector=><option key={sector._id} value={sector._id}>{sector.name}</option>)}</select></label>
  {tab==='comments'&&<p className="president-report-caption">Odgovori na vaše instrukcije ostaju ovde dok ih ne označite kao rešene.</p>}
  <ResourceState busy={resource.busy&&!data} error={resource.error} onRetry={resource.reload} noun="pregled važnih pitanja"/>
  <div className="president-attention-feed">{data?.items.map(item=><Link className="president-attention-item" to={item.link} key={item.key}><div className="president-attention-item-meta"><span><Icon name={item.kind==='idea'?'bulb':item.kind==='comment'?'message':item.kind==='request'?'flag':item.kind==='project'?'folder':'warning'} size={18}/>{item.sectorName}</span>{attentionTime(item.timestamp)&&<time dateTime={item.timestamp}>{attentionTime(item.timestamp)}</time>}</div><div className="president-attention-item-title"><h2>{item.title}</h2><Badge tone={item.kind==='comment'?'gold':'warning'}>{item.label}</Badge></div><p>{item.description}</p><span className="president-attention-open">Pogledaj <Icon name="chevron" size={16}/></span></Link>)}</div>
  {data&&!data.items.length&&(data.total?<div className="president-attention-moved"><p>Na ovoj stranici više nema pitanja.</p><button className="employee-text-button" onClick={()=>change({page:null})}>Otvori prvu stranicu</button></div>:<EmptyState icon="check" title={tab==='all'?'Nema pitanja koja čekaju reakciju':'Nema pitanja za ovaj filter'}>{tab==='all'?'Novi zahtevi, ugroženi rokovi i odgovori pojaviće se ovde.':'Izaberite drugi filter ili sektor.'}</EmptyState>)}
  {data&&<Pagination {...data} label="Stranice važnih pitanja" onPage={page=>change({page})}/>}
  <Link className="president-attention-notifications" to="/notifications"><Icon name="bell" size={18}/><span>Ostala obaveštenja<small>Komentari, izveštaji i ostale novosti</small></span><Icon name="chevron" size={18}/></Link>
 </div>;
}
