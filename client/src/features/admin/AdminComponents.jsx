import React,{useEffect,useId,useRef,useState} from 'react';
import {useBlocker} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {uncertainWrite} from '../workspace/mutations.js';
import {approvals} from './adminPresentation.js';

export function AdminStatus({status}){return <span className={'admin-status admin-status--'+status}><i aria-hidden="true"/>{approvals[status]||status}</span>;}
export function AdminEmpty({title,children,icon='users'}){return <div className="admin-empty"><span className="admin-disc"><Icon name={icon} size={26}/></span><h3>{title}</h3><p>{children}</p></div>;}
export function AdminHeading({eyebrow='Administracija',title,children,action}){return <div className="admin-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{children&&<p>{children}</p>}</div>{action}</div>;}
export function useAdminWrite(){
 const lock=useRef(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[conflict,setConflict]=useState(false);
 const run=async(task,success)=>{
  if(lock.current||uncertain)return;lock.current=true;setBusy(true);setError('');setConflict(false);
  try{const result=await task();success?.(result);}catch(e){setError(e.message);setUncertain(uncertainWrite(e));setConflict(e.status===409);}finally{lock.current=false;setBusy(false);}
 };
 const check=async task=>{
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{await task();setUncertain(false);setConflict(false);}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 };
 return {busy,error,uncertain,conflict,run,check};
}
export function AdminWriteState({write,onVerify}){return <>{write.error&&<p className="admin-alert" role="alert">{write.error}</p>}{(write.uncertain||write.conflict)&&<div className="admin-note"><p>{write.uncertain?'Potvrda čuvanja nije stigla. Pre novog slanja proverite šta je sačuvano.':'Učitajte trenutno stanje pre nastavka.'}</p><p className="admin-small">Provera će prikazati podatke sa servera umesto trenutnih unosa.</p><button type="button" className="admin-button" disabled={write.busy} onClick={onVerify}>Proveri i učitaj stanje</button></div>}</>;}
export function AdminDialog({title,dirty=false,navigationDirty=false,busy=false,onClose,children}){
 const ref=useRef(null),id=useId(),[discard,setDiscard]=useState(false);
 const blocker=useBlocker(({currentLocation,nextLocation})=>(dirty||navigationDirty||busy)&&!['/login','/predsednik','/president'].includes(nextLocation.pathname)&&currentLocation.pathname+currentLocation.search!==nextLocation.pathname+nextLocation.search);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 useEffect(()=>{if(blocker.state==='blocked')setDiscard(true);},[blocker.state]);
 useEffect(()=>{const prevent=e=>{if(dirty||navigationDirty||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[dirty,navigationDirty,busy]);
 const close=()=>{if(busy)return;if(dirty)setDiscard(true);else onClose();};
 return <dialog className="admin-dialog" ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();close();}}><div className="admin-dialog-heading"><div><span className="admin-eyebrow">Zepter · administracija</span><h2 id={id}>{title}</h2></div><button type="button" className="admin-icon" aria-label="Zatvori prozor" onClick={close} disabled={busy}><Icon name="close" size={22}/></button></div>
  {discard?<div className="admin-discard"><Icon name="warning" size={32}/><h3>{busy?'Sačekajte potvrdu čuvanja':'Napustiti nesačuvane izmene?'}</h3><p>{busy?'Zahtev je u toku. Sačekajte rezultat pre izlaska.':'Unosi u ovom prozoru neće biti sačuvani.'}</p><div className="admin-actions"><button type="button" className="admin-button admin-button--primary" onClick={()=>{setDiscard(false);blocker.reset?.();}}>Ostani ovde</button>{!busy&&<button type="button" className="admin-button" onClick={()=>{if(blocker.state==='blocked')blocker.proceed();else onClose();}}>Napusti izmene</button>}</div></div>:children}
 </dialog>;
}
export function AdminPageGuard({dirty,busy}){
 const ref=useRef(null),blocker=useBlocker(({currentLocation,nextLocation})=>(dirty||busy)&&!['/login','/predsednik','/president'].includes(nextLocation.pathname)&&currentLocation.pathname+currentLocation.search!==nextLocation.pathname+nextLocation.search);
 useEffect(()=>{if(blocker.state==='blocked')ref.current?.showModal();else ref.current?.close();},[blocker.state]);
 useEffect(()=>{const prevent=e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[dirty,busy]);
 return <dialog ref={ref} className="admin-dialog" aria-label="Nesačuvani unos sektora" onCancel={e=>{e.preventDefault();if(!busy)blocker.reset?.();}}><h2>{busy?'Sačekajte potvrdu':'Napustiti unos sektora?'}</h2><p>Unos u obrascu još nije sačuvan.</p><div className="admin-actions"><button className="admin-button admin-button--primary" onClick={()=>blocker.reset?.()}>Ostani ovde</button><button className="admin-button" disabled={busy} onClick={()=>blocker.proceed?.()}>Napusti unos</button></div></dialog>;
}
