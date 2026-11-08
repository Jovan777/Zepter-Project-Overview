import React,{useState} from 'react';
import {shiftReportDay,validReportDay} from './reportPresentation.js';

export default function ReportPeriodPicker({type,day,busy,onChange}) {
  const [selectedDay,setSelectedDay]=useState(day);
  const weekly=type==='weekly';
  return <section className="manager-report-period" aria-label="Izbor perioda izveštaja">
    <div className="manager-report-tabs" role="group" aria-label="Tip novog izveštaja">{[['daily','Dnevni izveštaj'],['weekly','Nedeljni izveštaj']].map(([key,title])=><button type="button" key={key} disabled={busy} className={type===key?'is-active':''} aria-pressed={type===key} onClick={()=>{if(key!==type)onChange({type:key,day:validReportDay(selectedDay)?selectedDay:day});}}>{title}</button>)}</div>
    <form aria-label="Priprema izabranog perioda" onSubmit={event=>{event.preventDefault();if(validReportDay(selectedDay))onChange({day:selectedDay});}}>
      <label htmlFor="new-report-day">{weekly?'Datum u izabranoj nedelji':'Datum izveštaja'}</label>
      <div className="manager-report-date-controls"><input id="new-report-day" type="date" required disabled={busy} value={selectedDay} onChange={event=>setSelectedDay(event.target.value)}/><button type="submit" className="manager-secondary-button" disabled={busy||!validReportDay(selectedDay)||selectedDay===day}>Pripremi izveštaj</button></div>
    </form>
    <div className="manager-report-period-step"><button type="button" disabled={busy} className="employee-text-button" onClick={()=>onChange({day:shiftReportDay(type,day,-1)})}>← {weekly?'Prethodna nedelja':'Prethodni dan'}</button><button type="button" disabled={busy} className="employee-text-button" onClick={()=>onChange({day:shiftReportDay(type,day,1)})}>{weekly?'Sledeća nedelja':'Sledeći dan'} →</button></div>
  </section>;
}
