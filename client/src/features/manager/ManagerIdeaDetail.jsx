import React, {useRef,useState} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {api} from '../../api.js';
import Icon from '../../components/Icon.jsx';
import {Badge,IconDisc,ResourceState} from '../employee/EmployeeComponents.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import {IdeaView} from '../employee/EmployeeIdeaDetail.jsx';
import EmployeeAttachments from '../employee/EmployeeAttachments.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {formatProjectDate,personName} from './projectForm.js';
import {ProjectExitDialog,useProjectGuard} from './ProjectFormParts.jsx';
import {sectorIdeaStatuses} from './ideaPresentation.js';
import {canReviewIdea,reviewRequest} from './ideaReview.js';
import './manager-idea-notifications.css';

function IdeaReview({initial,user,back}){
 const [idea,setIdea]=useState(initial),[note,setNote]=useState(''),[action,setAction]=useState(null),[working,setWorking]=useState(false),[checking,setChecking]=useState(false),[threadDirty,setThreadDirty]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[uncertain,setUncertain]=useState(false),[latest,setLatest]=useState(null);
 const lock=useRef(false),complete=useRef(false),confirm=useRef(null);
 const guard=useProjectGuard(!!note.trim()||threadDirty||working,complete);
 const adopt=fresh=>{setIdea(fresh);setNote('');setAction(null);setUncertain(false);setLatest(null);setError('');};
 const check=async()=>{setChecking(true);setError('');try{setLatest((await api('/ideas/'+idea._id)).idea);}catch(e){setError(e.message);}finally{setChecking(false);}};
 const decide=async event=>{
  event.preventDefault();if(lock.current||uncertain||!action)return;
  let request;try{request=reviewRequest(idea,action,note);}catch(e){setError(e.message);return;}
  lock.current=true;setWorking(true);setError('');setNotice('');
  try{const result=await api('/ideas/'+idea._id+'/review',request);adopt({...result.idea,author:idea.author,sector:idea.sector});setNotice(action==='forward'?'Ideja je prosleđena predsedniku na razmatranje.':'Ideja je vraćena autoru na doradu.');window.dispatchEvent(new Event('zepter:data-changed'));}
  catch(e){setError(e.message);setUncertain(e.status===409||!e.status||e.status>=500);}
  finally{lock.current=false;setWorking(false);}
 };
 const choose=value=>{setAction(value);setError('');setNotice('');requestAnimationFrame(()=>confirm.current?.scrollIntoView({block:'center'}));};
 const [status,tone,icon]=sectorIdeaStatuses[idea.status]||['Nepoznat status','neutral','info'];
 return <div className="manager-idea-detail"><div className="manager-idea-page-heading"><Link className="employee-icon-button" to={back} aria-label="Nazad na ideje"><Icon name="back" size={21}/></Link><div><h1>Detalji ideje</h1><p>{idea.sector?.name||'Moj sektor'}</p></div></div>
 <div className="manager-idea-detail-grid"><div className="manager-idea-detail-main"><section className="manager-idea-proposal"><div className="manager-idea-proposal-title"><IconDisc name="bulb"/><h2>{idea.title}</h2></div><p>{idea.description}</p>{idea.benefit&&<div className="manager-idea-benefit"><h3>Korist za kompaniju</h3><p>{idea.benefit}</p></div>}<div className="manager-idea-proposal-meta"><span className="manager-idea-initials" aria-hidden="true">{[idea.author?.firstName,idea.author?.lastName].filter(Boolean).map(x=>x[0]).join('')||'?'}</span><div><strong>{personName(idea.author)}</strong><small>{idea.author?.jobTitle||'Autor predloga'}</small></div><time dateTime={idea.createdAt}><Icon name="calendar" size={14}/>{formatProjectDate(idea.createdAt)}</time><Badge tone={tone}><Icon name={icon} size={12}/>{status}</Badge></div></section>
 <EmployeeAttachments type="idea" id={idea._id} user={user} editable={String(idea.author?._id||idea.author)===user._id} showCount/>
 {idea.reviewNote&&<section className="manager-idea-review-note"><h2>{idea.status==='revision_requested'?'Zahtev za doradu':'Obrazloženje odluke'}</h2><p>{idea.reviewNote}</p></section>}
 </div><aside className="manager-idea-conversation"><EmployeeThread type="idea" id={idea._id} user={user} sectionId="manager-idea-comments" variant="idea" allowInstructions onDraftChange={setThreadDirty}/></aside>
 <section className="manager-idea-decision" aria-label="Odluka o ideji"><p className="manager-idea-forward-note"><Icon name="info" size={20}/>Prosleđivanje predsedniku ne znači automatsko odobrenje za realizaciju.</p>
 {canReviewIdea(idea)?<><label htmlFor="idea-review-note">Obrazloženje <small>· obavezno za doradu</small></label><textarea id="idea-review-note" rows={3} maxLength={3000} disabled={working} value={note} onChange={event=>{setNote(event.target.value);setAction(null);setNotice('');}} placeholder="Šta zaposleni treba da dopuni ili zašto prosleđujete predlog…"/><div className="manager-idea-decision-actions"><button className="manager-secondary-button" disabled={working||uncertain} onClick={()=>choose('request_revision')}>Vrati na doradu</button><button className="employee-save-button" disabled={working||uncertain} onClick={()=>choose('forward')}><Icon name="send" size={17}/>Prosledi predsedniku</button></div>{action&&<form ref={confirm} className="manager-idea-confirm" onSubmit={decide}><strong>{action==='forward'?'Proslediti ovaj predlog predsedniku?':'Vratiti ovaj predlog zaposlenom na doradu?'}</strong><p>{action==='forward'?'Predsednik dobija predlog na razmatranje.':'Autor dobija vaše obrazloženje i može dopuniti i ponovo poslati ideju.'}</p><div><button type="button" disabled={working} className="manager-secondary-button" onClick={()=>setAction(null)}>Otkaži</button><button type="submit" disabled={working||uncertain} className="employee-save-button">{working?'Slanje odluke…':'Potvrdi odluku'}</button></div></form>}</>:<p className="manager-idea-status-note">{idea.status==='revision_requested'?'Čeka se dopuna autora. Po ponovnom slanju moći ćete da donesete novu odluku.':'Predlog je prosleđen predsedniku. Odluka o prosleđivanju je evidentirana.'}</p>}
 {idea.status==='revision_requested'&&String(idea.author?._id||idea.author)===user._id&&<Link className="manager-secondary-button" to={'/ideas/'+idea._id+'?edit=1'}>Dopuni svoju ideju</Link>}
 {error&&<p role="alert" className="employee-form-error">{error}</p>}{notice&&<p role="status" className="employee-form-success">{notice}</p>}{uncertain&&<p className="employee-small-note">Ishod nije potvrđen ili je predlog promenjen. Vaš tekst ostaje sačuvan; proverite aktuelni predlog pre nove odluke.</p>}<button className="employee-text-button" disabled={checking||working} onClick={check}>{checking?'Provera…':'Proveri aktuelni predlog'}</button>{latest&&<div className="manager-idea-latest"><strong>{latest.title} · {sectorIdeaStatuses[latest.status]?.[0]||latest.status}</strong><p>{latest.description}</p>{latest.benefit&&<p>{latest.benefit}</p>}{latest.reviewNote&&<p>{latest.reviewNote}</p>}<button className="employee-text-button" disabled={working} onClick={()=>{adopt(latest);setNotice('Preuzeta je aktuelna verzija predloga.');}}>Odbaci moj tekst odluke i preuzmi ovu verziju</button></div>}
 </section></div><ProjectExitDialog guard={guard} saving={working} entity="odluke ili komentara"/></div>;
}
function ManagerIdeaResource({id,user,back,editing}){
 const source=useEmployeeResource('/ideas/'+id,{live:false});
 if(!source.data)return <ResourceState {...source} onRetry={source.reload} noun="predlog"/>;
 const own=String(source.data.idea.author?._id||source.data.idea.author)===user._id;
 if(own&&editing)return <div className="manager-own-idea"><Link className="employee-text-button" to={'/ideas/'+id}>Nazad na pregled i odluku</Link><IdeaView key={id} initial={source.data.idea} user={user}/></div>;
 return <IdeaReview key={id} initial={source.data.idea} user={user} back={back}/>;
}
export default function ManagerIdeaDetail({user}){
 const {id}=useParams(),location=useLocation(),editing=new URLSearchParams(location.search).get('edit')==='1';
 const back=typeof location.state?.ideaList==='string'&&/^\/ideas(?:\?[^#]*)?$/.test(location.state.ideaList)?location.state.ideaList:'/ideas';
 return <ManagerIdeaResource key={id+':'+editing} id={id} user={user} back={back} editing={editing}/>;
}
