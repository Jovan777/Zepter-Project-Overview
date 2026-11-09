import React,{useEffect,useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import WorkspaceNavigation from '../workspace/WorkspaceNavigation.jsx';
import WorkspacePage from '../workspace/WorkspacePage.jsx';
import {PresidentBackContext} from './navigation.jsx';
import '../employee/employee.css';
import '../employee/employee-details.css';
import './president.css';

export default function PresidentShell({user,children}){
 const {pathname}=useLocation(),notifications=useEmployeeResource('/notifications?limit=1'),unread=notifications.data?.unread;
 const [detailBack,setDetailBack]=useState(null);
 const sector=/^\/sectors\/[^/]+$/.test(pathname),home=['/','/predsednik','/president'].includes(pathname);
 const primary=home||['/sectors','/ideas','/my-comments'].includes(pathname);
 const back=detailBack?.pathname===pathname?detailBack:{to:sector?'/sectors':pathname.startsWith('/ideas/')?'/ideas':pathname.startsWith('/projects/')?'/projects':'/',label:sector?'Nazad na sektore':pathname.startsWith('/ideas/')?'Nazad na ideje':pathname.startsWith('/projects/')?'Nazad na projekte':'Nazad na početnu'};
 const ideaPage=pathname==='/ideas'||pathname.startsWith('/ideas/');
 const reportsPage=pathname==='/reports'||pathname.startsWith('/reports/'),attentionPage=pathname==='/attention',commentsPage=pathname==='/my-comments';
 useEffect(()=>{window.scrollTo({top:0});},[pathname]);
 return <div className="app-shell employee-shell workspace-shell president-shell">
  <a className="employee-skip" href="#president-main">Preskoči na sadržaj</a>
  <header className="employee-header president-header"><div>{!primary&&<Link to={back.to} className="employee-icon-button" aria-label={back.label}><Icon name="back" size={23}/></Link>}<Link to="/" className="president-brand" aria-label="Zepter — pregled kompanije">ZEPTER</Link><span className="workspace-desktop-only workspace-header-context">{home?'Pregled kompanije':sector?'Pregled sektora':ideaPage?'Ideje zaposlenih':reportsPage?'Pregled izveštaja':attentionPage?'Potrebna pažnja':commentsPage?'Komentari i instrukcije':pathname.startsWith('/projects/')?'Pregled projekta':pathname.startsWith('/activities/')?'Pregled aktivnosti':'Predsednički pregled'}</span></div><div>{!reportsPage&&!attentionPage&&!commentsPage&&<Link to={ideaPage?'/ideas?search=1':'/sectors?search=1'} className="employee-icon-button" aria-label={ideaPage?'Pretraži ideje':'Pretraži sektore'}><Icon name="search" size={22}/></Link>}<Link to="/notifications" className="employee-icon-button president-bell" aria-label={unread>0?`Obaveštenja, ${unread} nepročitanih`:'Obaveštenja'}><Icon name="bell" size={23}/>{unread>0&&<span/>}</Link></div></header>
  <WorkspacePage className="employee-content president-content" id="president-main"><PresidentBackContext.Provider value={setDetailBack}>{children}</PresidentBackContext.Provider></WorkspacePage>
  <WorkspaceNavigation user={user}/>
 </div>;
}
