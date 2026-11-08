import {belgradeDate} from '../employee/presentation.js';

export const validReportDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
export function reportFilters(search) {
  return {type:search.get('type')==='weekly'?'weekly':'daily',page:Math.max(1,Math.min(10000,Math.floor(Number(search.get('page'))||1))),day:validReportDay(search.get('day'))?search.get('day'):belgradeDate()};
}
const date=value=>validReportDay(value)?new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00Z')):'Datum nije dostupan';
export function reportPeriod(report) {
  return report.type==='weekly'&&report.periodEnd!==report.periodStart?`${date(report.periodStart)} – ${date(report.periodEnd)}`:date(report.periodStart);
}
export function reportSummary(report) {
  const text=report.results?.trim();
  if(text)return text.replace(/\s+/g,' ');
  const stats=report.generated?.stats;
  if(stats&&Number.isFinite(stats.workEntries))return `${stats.workEntries} dnevnih unosa · napredak sektora ${Number.isFinite(stats.avgProgress)?stats.avgProgress:0}%`;
  return report.status==='draft'?'Nacrt čeka pregled i objavu.':'Otvorite izveštaj za pregled rezultata.';
}
