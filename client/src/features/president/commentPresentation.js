import {belgradeDate} from '../employee/presentation.js';
export const commentStatuses={open:{label:'Čeka odgovor',tone:'gold',icon:'clock'},answered:{label:'Odgovoreno',tone:'success',icon:'check'},resolved:{label:'Rešeno',tone:'neutral',icon:'check'},unavailable:{label:'Nedostupno',tone:'neutral',icon:'info'}};
export const commentTypes={sector:{label:'Sektor',icon:'users'},project:{label:'Projekat',icon:'folder'},activity:{label:'Aktivnost',icon:'activity'},idea:{label:'Ideja',icon:'bulb'},assignment:{label:'Zaduženje',icon:'flag'},request:{label:'Zahtev',icon:'message'}};
export function commentFilters(search){
 const status=search.get('status')||'all',targetType=search.get('targetType')||'all';
 return {status:status==='all'||Object.hasOwn(commentStatuses,status)?status:'all',targetType:targetType==='all'||Object.hasOwn(commentTypes,targetType)?targetType:'all',page:Math.max(1,Math.min(10000,Math.floor(Number(search.get('page'))||1)))};
}
export function commentDate(value,now=new Date()){
 if(!value||Number.isNaN(Date.parse(value)))return null;
 const day=belgradeDate(new Date(value)),today=belgradeDate(now),previous=new Date(today+'T12:00:00Z');previous.setUTCDate(previous.getUTCDate()-1);
 const time=new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
 return day===today?'Danas, '+time:day===previous.toISOString().slice(0,10)?'Juče, '+time:new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short',year:'numeric'}).format(new Date(value))+' · '+time;
}
