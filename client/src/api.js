import {io} from 'socket.io-client';
let accessToken=null;let refreshPromise=null;let socket=null;
export const setToken=(value)=>{accessToken=value;};
export const getSocket=()=>socket;
export function connectSocket(onNotification){
 if(!accessToken)return;
 socket?.disconnect();
 socket=io('/',{path:'/socket.io',autoConnect:true,auth:{token:accessToken},transports:['websocket','polling']});
 socket.on('notification:new',onNotification);
 socket.on('data:changed',()=>window.dispatchEvent(new Event('zepter:data-changed')));
 socket.on('connect_error',async()=>{
  try{await refresh();if(socket){socket.auth={token:accessToken};socket.connect();}}
  catch{socket?.disconnect();}
 });
}
export function disconnectSocket(){socket?.disconnect();socket=null;}
async function refresh(){
 if(!refreshPromise)refreshPromise=fetch('/api/auth/refresh',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}})
  .then(async r=>{if(!r.ok)throw Error('Session expired');const d=await r.json();accessToken=d.accessToken;if(socket){socket.auth={token:accessToken};}return d;})
  .finally(()=>{refreshPromise=null;});
 return refreshPromise;
}
export async function bootstrap(){try{return await refresh();}catch{return null;}}
export async function api(endpoint,{method='GET',body,headers={},isForm=false,retry=true}={}){
 const send=()=>fetch('/api'+endpoint,{method,credentials:'same-origin',headers:{...(!isForm&&body!==undefined?{'Content-Type':'application/json'}:{}),...(accessToken?{Authorization:'Bearer '+accessToken}:{}),...headers},body:body===undefined?undefined:isForm?body:JSON.stringify(body)});
 let response;
 try { response=await send(); } catch { throw Error('Ne mogu da kontaktiram API. Proverite da li backend radi na portu 4000.'); }
 if(response.status===401&&retry&&!endpoint.startsWith('/auth/')){
  try{await refresh();response=await send();}catch{}
 }
 if(response.status===204)return null;
 const raw=await response.text();
 let data;
 try { data=raw?JSON.parse(raw):null; } catch {
  throw Error(`Backend nije vratio JSON (HTTP ${response.status}). Proverite http://127.0.0.1:4000/health i Vite proxy.`);
 }
 if(!response.ok)throw Error(data?.error||`API greška: HTTP ${response.status}.`);
 return data;
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
 const call=()=>fetch('/api/attachments/'+id,{headers:accessToken?{Authorization:'Bearer '+accessToken}:{},credentials:'same-origin'});
 let r=await call();if(r.status===401){await refresh();r=await call();}
 if(!r.ok)throw Error('Preuzimanje nije uspelo.');
 const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name||'prilog';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
