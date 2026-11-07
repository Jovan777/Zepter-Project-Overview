import {isValidObjectId} from 'mongoose';
import {fail} from './errors.js';
export function requireId(id){if(!isValidObjectId(id))fail(400,'Neispravan ID.');return id;}
export const same=(a,b)=>String(a||'')===String(b||'');
export const inRefs=(arr,id)=>Array.isArray(arr)&&arr.some(x=>same(x,id));
export function hasRole(user,...roles){return roles.includes(user.role);}
export function belgradeDay(now=new Date()){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function validDay(day){return /^\d{4}-\d{2}-\d{2}$/.test(day||'')&&!Number.isNaN(Date.parse(day+'T00:00:00Z')) && new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day;}
export function periodRange(type,day){
 if(!validDay(day))fail(422,'Datum mora biti YYYY-MM-DD.');
 if(type==='daily')return {start:day,end:day};
 if(type!=='weekly')fail(422,'Tip mora biti daily ili weekly.');
 const d=new Date(day+'T12:00:00Z'); const dow=d.getUTCDay();
 d.setUTCDate(d.getUTCDate()-((dow+6)%7));const start=d.toISOString().slice(0,10);
 d.setUTCDate(d.getUTCDate()+6);return {start,end:d.toISOString().slice(0,10)};
}
export function safePage(query){const limit=Math.max(1,Math.min(50,Number(query.limit)||20)),page=Math.max(1,Math.min(10000,Number(query.page)||1));return {limit,page,skip:(page-1)*limit};}
export function dateValue(day){if(!day)return undefined;if(!validDay(day))fail(422,'Neispravan datum.');return new Date(day+'T12:00:00Z');}
export function dateString(date){return date ? new Date(date).toISOString().slice(0,10):null;}
export function pickDefined(obj,keys){return Object.fromEntries(keys.filter(k=>obj[k]!==undefined).map(k=>[k,obj[k]]));}
