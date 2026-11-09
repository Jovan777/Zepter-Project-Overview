import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {waitForBackend} from './startupReadiness.js';
import {capturePresidentEntry} from './features/president/presidentEntry.js';
import './startup.css';
// Capture legacy fragments immediately, without retaining keys in browser storage.
const presidentEntry=capturePresidentEntry(window.location,window.history);
window.addEventListener('hashchange',()=>{if(['/predsednik','/president'].includes(window.location.pathname)&&window.location.hash)window.location.reload();});
let app;
const loadApp=()=>app||(app=import('./main.jsx').catch(error=>{app=null;throw error;}));
function Startup(){
 const [attempt,setAttempt]=useState(0),[error,setError]=useState(''),[slow,setSlow]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();setError('');setSlow(false);const timer=setTimeout(()=>setSlow(true),6000);
  const started=window.__zepterWake,startedAt=window.__zepterWakeAt||Date.now();delete window.__zepterWake;delete window.__zepterWakeAt;
  const ready=Promise.resolve(started).then(ok=>ok||waitForBackend({signal:controller.signal,timeoutMs:Math.max(1,90000-(Date.now()-startedAt))}));
  Promise.all([loadApp(),ready]).then(([module])=>{if(!controller.signal.aborted){clearTimeout(timer);module.mountApp(presidentEntry,root);}}).catch(e=>{if(!controller.signal.aborted){clearTimeout(timer);setError(e.message);controller.abort();}});
  return()=>{clearTimeout(timer);controller.abort();};
 },[attempt]);
 return <div className="zepter-startup"><strong>ZEPTER</strong><h1>{error?'Veza trenutno nije dostupna':'Otvaramo vaš portal'}</h1><p role={error?'alert':'status'}>{error||(slow?'Prvo otvaranje posle pauze može potrajati oko minut. Sačekajte, pokretanje je u toku.':'Pripremamo bezbednu vezu i vaš pregled.')}</p>{!error&&<span className="zepter-startup-progress" aria-hidden="true"/>}{error&&<button onClick={()=>setAttempt(value=>value+1)}>Pokušaj ponovo</button>}</div>;
}
const root=createRoot(document.getElementById('root'));root.render(<Startup/>);
export {root};
