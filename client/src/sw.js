/// <reference lib="WebWorker" />
import {precacheAndRoute,cleanupOutdatedCaches} from 'workbox-precaching';
import {presidentScopedPath} from './features/president/presidentEntry.js';
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
// Only public, hashed build assets are cached as they are actually used. Do not
// download screens for all roles when installing the PWA on a slow connection.
const staticCache='zepter-public-assets-v1';
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.search||!/^\/assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(staticCache),saved=await cache.match(event.request);if(saved)return saved;
  const response=await fetch(event.request);
  if(response.ok&&!response.headers.has('set-cookie')&&/javascript|text\/css/.test(response.headers.get('content-type')||'')){
   await cache.put(event.request,response.clone());const keys=await cache.keys();if(keys.length>80)await Promise.all(keys.slice(0,keys.length-80).map(key=>cache.delete(key)));
  }
  return response;
 })());
});
// SECURITY: No network/API data caching. Private project information is online-only.
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const url=typeof data.url==='string'&&data.url.startsWith('/')&&!data.url.startsWith('//')?data.url:'/';
 event.waitUntil(self.registration.showNotification(data.title||'ZEPTER',{
  body:data.body||'Novo obaveštenje',icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',data:{url}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=event.notification.data?.url||'/';
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
  const client=clients.find(c=>new URL(c.url).origin===self.location.origin);
  if(client){client.focus();client.navigate(presidentScopedPath(new URL(client.url).pathname,url));return;}
  return self.clients.openWindow(url);
 }));
});
