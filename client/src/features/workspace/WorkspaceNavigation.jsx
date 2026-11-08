import React from 'react';
import {Link, useLocation} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {isWorkspaceLinkActive, workspaceLinks} from './navigation.js';

export default function WorkspaceNavigation({user, logout}) {
  const {pathname} = useLocation();
  const manager = user.role === 'manager';
  const president = user.role === 'president';
  const role = president ? 'Predsednik' : manager ? 'Rukovodilac sektora' : 'Zaposleni';
  const secondary = president ? [['/reports?scope=company&type=daily','Izveštaji','chart'],['/attention','Potrebna pažnja','clock'],['/ideas','Prosleđene ideje','bulb'],['/notifications','Obaveštenja','bell']] : manager ? [['/notifications', 'Obaveštenja', 'bell'], ['/assignments', 'Zaduženja predsednika', 'flag'], ['/daily', 'Moj dnevni unos', 'calendar']] : [['/daily', 'Moj dnevni unos', 'calendar']];
  const link = ([to, title, icon]) => {
    const active = isWorkspaceLinkActive(pathname, to.split('?')[0]);
    return <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}><Icon name={icon} size={manager ? 23 : 28}/><span>{title}</span>{active && <i aria-hidden="true"/>}</Link>;
  };
  return <aside className={`workspace-navigation ${president ? 'president-bottom' : manager ? 'manager-bottom' : 'employee-bottom'}`} aria-label="Navigacija radnog prostora">
    <div className="workspace-navigation-brand workspace-desktop-only"><Link to="/" aria-label="Zepter — početna">ZEPTER</Link><span>Management Overview</span></div>
    <div className="workspace-nav-caption workspace-desktop-only">{president ? 'Kompanija' : manager ? 'Moj sektor' : 'Moj radni prostor'}</div>
    <nav aria-label={president ? 'Glavna navigacija predsednika' : manager ? 'Glavna navigacija rukovodioca' : 'Glavna navigacija zaposlenog'}>{workspaceLinks[user.role].map(link)}</nav>
    <nav className="workspace-secondary-nav workspace-desktop-only" aria-label="Dodatne opcije">{secondary.map(link)}</nav>
    <div className="workspace-account workspace-desktop-only"><span className="workspace-account-icon"><Icon name="user" size={23}/></span><div><strong>{user.firstName} {user.lastName}</strong><span>{role}</span></div>{!president&&<button onClick={logout} aria-label="Odjavi se" title="Odjavi se"><Icon name="logout" size={20}/></button>}</div>
  </aside>;
}
