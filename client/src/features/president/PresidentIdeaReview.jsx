import React,{useRef,useState} from 'react';
import {useParams} from 'react-router-dom';
import {api} from '../../api.js';
import Icon from '../../components/Icon.jsx';
import {Badge,ResourceState} from '../employee/EmployeeComponents.jsx';
import EmployeeThread from '../employee/EmployeeThread.jsx';
import EmployeeAttachments from '../employee/EmployeeAttachments.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ProjectExitDialog,useProjectGuard} from '../manager/ProjectFormParts.jsx';
import IdeaDecisionSummary from '../workspace/IdeaDecisionSummary.jsx';
import {usePresidentBackLink} from './navigation.jsx';
import usePresidentIdeaRead from './usePresidentIdeaRead.js';
import {fullName,presidentDate,recoverDecisionDraft} from './presentation.js';
import './president-project-ideas.css';

export default function PresidentIdeaReview({user}){
 const {id}=useParams(),source=useEmployeeResource('/ideas/'+id,{live:false});
 usePresidentBackLink('/ideas','Nazad na ideje');
 if(!source.data)return <ResourceState {...source} onRetry={source.reload} noun="predlog"/>;
 return <Proposal key={id} initial={source.data.idea} user={user}/>;
}
function Proposal({initial,user}){
 const [idea,setIdea]=useState(initial),[action,setAction]=useState(null),[note,setNote]=useState(''),[working,setWorking]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[threadDirty,setThreadDirty]=useState(false);
 const complete=useRef(false),lock=useRef(false),requestId=useRef(null);
 const [recoveredNote,setRecoveredNote]=useState('');
 const guard=useProjectGuard(!!note.trim()||!!recoveredNote||working||uncertain||threadDirty,complete),read=usePresidentIdeaRead(idea,user);
 const adopt=fresh=>{setIdea({...fresh,author:idea.author,sector:idea.sector});if(fresh.status!=='forwarded'){setNote('');setAction(null);}setUncertain(false);};
 const check=async()=>{if(lock.current)return;lock.current=true;setWorking(true);setError('');try{const data=await api('/ideas/'+idea._id),retained=recoverDecisionDraft(note,data.idea);if(retained)setRecoveredNote(retained);adopt(data.idea);setNotice(data.idea.status==='forwarded'?'Predlog još nema predsedničku odluku.':'Prikazana je sačuvana odluka predsednika.');}catch(e){setError(e.message);}finally{lock.current=false;setWorking(false);}};
 const send=async event=>{
  event.preventDefault();if(lock.current||uncertain||!action)return;
  if(action==='approve'&&!note.trim()){setError('Unesite komentar sa narednim koracima.');return;}
  lock.current=true;setWorking(true);setError('');setNotice('');requestId.current??=crypto.randomUUID();
  try{
   const result=await api('/ideas/'+idea._id+'/decision',{method:'POST',headers:{'If-Match':'"'+idea.updatedAt+'"'},body:{action,comment:action==='approve'?note.trim():'',requestId:requestId.current}});
   adopt(result.idea);setNotice(result.pending?'Odluka je sačuvana. Obaveštenje rukovodiocu se još isporučuje.':result.idea.status==='approved'?'Ideja je odobrena. Komentar sa narednim koracima poslat je rukovodiocu.':'Ideja je odbijena. Tok predloga je završen.');
   window.dispatchEvent(new Event('zepter:data-changed'));
  }catch(e){setError(e.message);setUncertain(!e.status||e.status>=500||e.status===409);}
  finally{lock.current=false;setWorking(false);}
 };
 const deliver=async()=>{if(lock.current)return;lock.current=true;setWorking(true);setError('');try{const result=await api('/ideas/'+idea._id+'/decision/deliver',{method:'POST'});adopt(result.idea);setNotice(result.pending?'Odluka je sačuvana. Isporuka još nije potvrđena.':'Obaveštenje je poslato rukovodiocu.');}catch(e){setError(e.message);}finally{lock.current=false;setWorking(false);}};
 return <div className="president-proposal"><div className="president-greeting"><h1>Ideja zaposlenog</h1><p>{idea.sector?.name||'Predlog prosleđen predsedniku'}</p></div>
  <div className="president-proposal-body"><div><section className="president-proposal-summary"><div className="president-card-heading"><Icon name="bulb" size={27}/><Badge tone={idea.status==='approved'?'success':idea.status==='rejected'?'warning':'gold'}>{idea.status==='approved'?'Odobrena':idea.status==='rejected'?'Odbijena':'U razmatranju'}</Badge></div><h2>{idea.title}</h2><p>{idea.description}</p>{idea.benefit&&<><h3>Korist za kompaniju</h3><p>{idea.benefit}</p></>}<div className="president-proposal-meta"><span>{fullName(idea.author)}</span><time dateTime={idea.forwardedAt||idea.createdAt}>{presidentDate(idea.forwardedAt||idea.createdAt)}</time></div></section>
   <IdeaDecisionSummary idea={idea}/>
   <EmployeeAttachments type="idea" id={idea._id} user={user} editable={false} showCount/>
   {idea.status==='forwarded'&&<section className="president-proposal-decision" aria-labelledby="president-decision-heading"><h2 id="president-decision-heading">Odluka o ideji</h2><div className="president-decision-actions"><button className="employee-save-button" disabled={working||uncertain} onClick={()=>{setAction('approve');setError('');}}><Icon name="check" size={18}/>Odobri ideju</button><button className="manager-secondary-button" disabled={working||uncertain} onClick={()=>{setAction('reject');setError('');}}>Odbij ideju</button></div>
    {action&&<form onSubmit={send} className="president-decision-form" aria-label={action==='approve'?'Odobrenje ideje':'Odbijanje ideje'}><h3>{action==='approve'?'Šta dalje sa idejom?':'Odbiti ovu ideju?'}</h3>{action==='approve'?<><label htmlFor="president-idea-next-steps">Komentar i naredni koraci <span aria-hidden="true">*</span></label><textarea id="president-idea-next-steps" rows={4} required maxLength={4000} value={note} disabled={working} onChange={event=>setNote(event.target.value)} placeholder="Napišite šta rukovodilac treba da uradi dalje…"/><p>Komentar će biti prikazan rukovodiocu koji je prosledio ideju.</p></>:<p>Odbijanjem se završava tok ovog predloga.</p>}<div><button type="button" className="employee-text-button" disabled={working||uncertain} onClick={()=>{setAction(null);setNote('');setError('');requestId.current=null;}}>Otkaži</button><button type="submit" className="employee-save-button" disabled={working||uncertain}>{working?'Čuvanje odluke…':action==='approve'?'Potvrdi odobrenje':'Potvrdi odbijanje'}</button></div></form>}
   </section>}
   {idea.decision?.deliveryStatus==='pending'&&<div className="employee-conflict" role="status"><p>Odluka je sačuvana. Obaveštenje rukovodiocu se još isporučuje.</p><button className="employee-text-button" disabled={working} onClick={deliver}>Ponovi isporuku obaveštenja</button></div>}
   {error&&<p role="alert" className="employee-form-error">{error}</p>}{notice&&<p role="status" className="employee-form-success">{notice}</p>}
   {recoveredNote&&<div className="employee-conflict"><label htmlFor="president-recovered-note">Neposlati nacrt</label><p>Vaš tekst je sačuvan. Možete ga kopirati u razgovor.</p><textarea id="president-recovered-note" rows={4} readOnly value={recoveredNote}/><button className="employee-text-button" onClick={()=>setRecoveredNote('')}>Odbaci neposlati nacrt</button></div>}
   {uncertain&&<div className="employee-conflict" role="alert"><p>Odluka je možda već sačuvana. Proverite aktuelni predlog pre nastavka.</p><button className="employee-text-button" disabled={working} onClick={check}>Proveri odluku</button></div>}
   {read.error&&<div className="employee-error" role="alert"><p>{read.error}</p><button className="employee-text-button" onClick={read.conflict?check:read.retry}>Osveži oznaku čitanja</button></div>}
  </div><aside><EmployeeThread type="idea" id={idea._id} user={user} sectionId="president-idea-comments" variant="idea" allowInstructions onDraftChange={setThreadDirty}/></aside></div>
  <ProjectExitDialog guard={guard} saving={working} entity="odluke ili komentara"/>
 </div>;
}
