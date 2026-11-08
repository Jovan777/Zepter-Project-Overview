import React,{useEffect} from 'react';
import {Link,useLocation} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import WorkspaceNavigation from '../workspace/WorkspaceNavigation.jsx';
import './president.css';

export default function PresidentShell({user,children}){
 const {pathname}=useLocation(),notifications=useEmployeeResource('/notifications?limit=1'),unread=notifications.data?.unread;
 const sector=/^\/sectors\/[^/]+$/.test(pathname),home=['/','/predsednik','/president'].includes(pathname);
 useEffect(()=>{window.scrollTo({top:0});},[pathname]);
 return <div className="app-shell employee-shell workspace-shell president-shell">
  <a className="employee-skip" href="#president-main">Preskoči na sadržaj</a>
  <header className="employee-header president-header"><div>{!home&&<Link to={sector?'/sectors':'/'} className="employee-icon-button" aria-label={sector?'Nazad na sektore':'Nazad na početnu'}><Icon name="back" size={23}/></Link>}<Link to="/" className="president-brand" aria-label="Zepter — pregled kompanije">ZEPTER</Link><span className="workspace-desktop-only workspace-header-context">{home?'Pregled kompanije':sector?'Pregled sektora':'Predsednički pregled'}</span></div><div><Link to="/sectors?search=1" className="employee-icon-button" aria-label="Pretraži sektore"><Icon name="search" size={22}/></Link><Link to="/notifications" className="employee-icon-button president-bell" aria-label={unread>0?`Obaveštenja, ${unread} nepročitanih`:'Obaveštenja'}><Icon name="bell" size={23}/>{unread>0&&<span/>}</Link></div></header>
  <main className="employee-content president-content" id="president-main">{children}</main>
  <WorkspaceNavigation user={user}/>
 </div>;
}
