import {belgradeDate} from '../employee/presentation.js';
import {validReportDay} from '../manager/reportPresentation.js';
export const reportScopes=[['company','Kompanija','grid'],['sector','Sektor','users'],['project','Projekat','folder']];
export function presidentReportFilters(search){
 return {scope:search.get('scope')||'company',type:search.get('type')||'daily',day:search.get('day')||belgradeDate(),id:search.get('id')||''};
}
export function reportSearch(context){
 return new URLSearchParams({scope:context.scope,type:context.type,day:context.day,...(context.scope!=='company'&&context.id?{id:context.id}:{})});
}
export function evidenceLink(item){return item.activityId?'/activities/'+item.activityId:item.projectId?'/projects/'+item.projectId:null;}
export function reportMatches(data,filters){
 const context=data?.context;return !!context&&validReportDay(filters.day)&&context.scope===filters.scope&&context.type===filters.type&&(filters.scope==='company'||String(context.targetId)===filters.id)&&context.periodStart<=filters.day&&context.periodEnd>=filters.day;
}
export function attentionTime(value){
 if(!value||Number.isNaN(Date.parse(value)))return null;
 return new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
}
