import React from 'react';
import {useLocation} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import WorkspacePage from '../workspace/WorkspacePage.jsx';
import Icon from '../../components/Icon.jsx';
import {personName} from './adminPresentation.js';
import './admin.css';

const links=[['/admin','Pregled','grid'],['/admin/users','Korisnici','users'],['/admin/sectors','Sektori','folder'],['/admin/audit','Istorija','clock']];
export default function AdminShell({user,logout,children}){
 const {pathname}=useLocation();
 return <div className="app-shell employee-shell workspace-shell admin-shell"><a className="employee-skip" href="#admin-main">Preskoči na sadržaj</a>
  <header className="admin-header"><Link to="/admin" className="admin-brand">ZEPTER</Link><div><span className="admin-header-label">Administracija</span><span className="admin-avatar" title={personName(user)} aria-label={personName(user)}>{user.firstName?.[0]}{user.lastName?.[0]}</span><button className="admin-icon" onClick={logout} title="Odjavi se" aria-label="Odjavi se"><Icon name="logout" size={21}/></button></div></header>
  <WorkspacePage className="admin-main" id="admin-main">{children}</WorkspacePage>
  <aside className="workspace-navigation admin-navigation" aria-label="Administratorski radni prostor"><div className="workspace-navigation-brand workspace-desktop-only"><Link to="/admin">ZEPTER</Link><span>Management Overview</span></div><div className="workspace-nav-caption workspace-desktop-only">Upravljanje portalom</div>
   <nav aria-label="Glavna navigacija administratora">{links.map(([to,label,icon])=><Link key={to} to={to} className={pathname===to?'is-active':''} aria-current={pathname===to?'page':undefined}><Icon name={icon} size={22}/><span>{label}</span></Link>)}</nav>
   <div className="workspace-account workspace-desktop-only"><span className="admin-avatar"><Icon name="user" size={20}/></span><div><strong>{personName(user)}</strong><span>Administrator</span></div></div>
  </aside>
 </div>;
}
