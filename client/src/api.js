import {io} from 'socket.io-client';
let accessToken=null;let refreshPromise=null;let socket=null;let sessionGeneration=0;
export const setToken=(value)=>{sessionGeneration++;accessToken=value;refreshPromise=null;};
const sessionChanged=()=>Object.assign(Error('Prijava je promenjena. Otvorite sadržaj ponovo.'),{name:'AbortError'});
function expireSession(generation){
 if(generation!==sessionGeneration)return;
 setToken(null);disconnectSocket();window.dispatchEvent(new Event('zepter:session-expired'));
}
export const getSocket=()=>socket;
export function connectSocket(onNotification){
 if(!accessToken)return;
 socket?.disconnect();
 const current=socket=io('/',{path:'/socket.io',autoConnect:true,auth:{token:accessToken},transports:['websocket','polling']});
 socket.on('notification:new',()=>{onNotification();window.dispatchEvent(new Event('zepter:notifications-changed'));});
 socket.on('data:changed',()=>window.dispatchEvent(new Event('zepter:data-changed')));
 let renewing=false;
 const renewConnection=async()=>{
  const generation=sessionGeneration;
  if(socket!==current||renewing)return;
  renewing=true;
  try{await refresh();if(socket===current){current.auth={token:accessToken};current.connect();}}
  catch(e){if(socket===current)current.disconnect();if(e.status===401||e.status===403)expireSession(generation);}
  finally{renewing=false;}
 };
 socket.on('connect_error',renewConnection);
 socket.on('disconnect',reason=>{if(reason==='io server disconnect')renewConnection();});
}
export function disconnectSocket(){socket?.disconnect();socket=null;}
export async function logoutSession(){
 // A rotating refresh can set its HttpOnly cookie after logout has started.
 // Drain it before asking the server to revoke and clear that cookie.
 const pending=refreshPromise;setToken(null);disconnectSocket();
 if(pending)await pending.catch(()=>{});
 return api('/auth/logout',{method:'POST',retry:false});
}
async function refresh(){
 if(!refreshPromise){
  const generation=sessionGeneration;
  const pending=fetch('/api/auth/refresh',{method:'POST',cache:'no-store',credentials:'same-origin',headers:{'Content-Type':'application/json'}})
   .then(async r=>{if(!r.ok)throw Object.assign(Error('Prijavite se ponovo.'),{status:r.status});const d=await r.json();if(generation!==sessionGeneration)throw sessionChanged();accessToken=d.accessToken;if(socket){socket.auth={token:accessToken};}return d;})
   .catch(e=>{if(e.status===401||e.status===403)expireSession(generation);throw e;})
   .finally(()=>{if(refreshPromise===pending)refreshPromise=null;});
  refreshPromise=pending;
 }
 return refreshPromise;
}
export async function bootstrap(){try{return await refresh();}catch{return null;}}
export async function api(endpoint,{method='GET',body,headers={},isForm=false,retry=true,signal}={}){
 const generation=sessionGeneration;
 const send=()=>{if(generation!==sessionGeneration)throw sessionChanged();return fetch('/api'+endpoint,{method,signal,cache:'no-store',credentials:'same-origin',headers:{...(!isForm&&body!==undefined?{'Content-Type':'application/json'}:{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...headers},body:body===undefined?undefined:isForm?body:JSON.stringify(body)});};
 let response;
 try { response=await send(); } catch(error) { if(signal?.aborted)throw error;throw Error('Ne mogu da kontaktiram API. Proverite da li backend radi na portu 4000.'); }
 if(generation!==sessionGeneration)throw sessionChanged();
 if(response.status===401&&retry&&!endpoint.startsWith('/auth/')){
  try{await refresh();response=await send();}catch(e){if(e.name==='AbortError')throw e;if(e.status===401||e.status===403)expireSession(generation);else throw Object.assign(Error('Prijava trenutno ne može da se osveži. Proverite vezu i pokušajte ponovo.'),{status:e.status});}
 }
 if(generation!==sessionGeneration)throw sessionChanged();
 if(response.status===401&&!endpoint.startsWith('/auth/'))expireSession(generation);
 if(response.status===204)return null;
 const raw=await response.text();
 if(generation!==sessionGeneration)throw sessionChanged();
 let data;
 try { data=raw?JSON.parse(raw):null; } catch {
  throw Error(`Backend nije vratio JSON (HTTP ${response.status}). Proverite http://127.0.0.1:4000/health i Vite proxy.`);
 }
 if(!response.ok){const error=Error(data?.error||`API greška: HTTP ${response.status}.`);error.status=response.status;throw error;}
 if(method!=='GET'&&endpoint.startsWith('/notifications/'))window.dispatchEvent(new Event('zepter:notifications-changed'));
 return data;
}
export async function attachmentImageUrl(id,{signal}={}){
 const generation=sessionGeneration;
 const call=()=>{if(generation!==sessionGeneration)throw sessionChanged();return fetch('/api/attachments/'+id,{signal,cache:'no-store',headers:accessToken?{Authorization:'Bearer '+accessToken}:{},credentials:'same-origin'});};
 let response=await call();
 if(generation!==sessionGeneration)throw sessionChanged();
 if(response.status===401){await refresh();response=await call();}
 if(!response.ok)throw Error('Slika nije dostupna.');
 const blob=await response.blob();
 if(generation!==sessionGeneration)throw sessionChanged();
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Nepodržana slika.');
 return URL.createObjectURL(blob);
}
export async function subscribePush(){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Ovaj uređaj ne podržava push.');
 const result=await Notification.requestPermission();if(result!=='granted')throw Error('Nisu odobrena obaveštenja.');
 const {publicKey}=await api('/notifications/push/key');if(!publicKey)throw Error('Push nije konfigurisan na serveru.');
 const reg=await navigator.serviceWorker.ready;
 const b64=publicKey.replace(/-/g,'+').replace(/_/g,'/'),pad='='.repeat((4-b64.length%4)%4);
 const bytes=Uint8Array.from(atob(b64+pad),c=>c.charCodeAt(0));
 const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
 await api('/notifications/push/subscribe',{method:'POST',body:sub.toJSON()});return true;
}
export async function downloadAttachment(id,name){
 const generation=sessionGeneration;
 const call=()=>{if(generation!==sessionGeneration)throw sessionChanged();return fetch('/api/attachments/'+id,{cache:'no-store',headers:accessToken?{Authorization:'Bearer '+accessToken}:{},credentials:'same-origin'});};
 let r=await call();if(generation!==sessionGeneration)throw sessionChanged();if(r.status===401){await refresh();r=await call();}
 if(!r.ok)throw Error('Preuzimanje nije uspelo.');
 const blob=await r.blob();if(generation!==sessionGeneration)throw sessionChanged();
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name||'prilog';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
