/// <reference lib="WebWorker" />
import {precacheAndRoute,cleanupOutdatedCaches} from 'workbox-precaching';
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
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
  if(client){client.focus();client.navigate(url);return;}
  return self.clients.openWindow(url);
 }));
});
