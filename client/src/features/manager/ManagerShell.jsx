import React, {useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {ProfileMenu} from '../employee/EmployeeShell.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import '../employee/employee.css';
import '../employee/employee-details.css';
import './manager.css';

export default function ManagerShell({user, logout, children}) {
  const {pathname} = useLocation();
  const resource = useEmployeeResource('/notifications?limit=1');
  const unread = resource.data?.unread;
  useEffect(() => {window.scrollTo({top: 0});}, [pathname]);
  const detail = !['/', '/projects', '/reports', '/ideas', '/notifications'].includes(pathname);
  const back = pathname.startsWith('/ideas/') ? '/ideas' : pathname.startsWith('/reports/') ? '/reports' : '/projects';
  return <div className="app-shell employee-shell manager-shell">
    <a className="employee-skip" href="#manager-main">Preskoči na sadržaj</a>
    <header className="manager-header"><div>{detail && <Link className="employee-icon-button" to={back} aria-label="Nazad"><Icon name="back" size={22}/></Link>}<Link className="manager-brand" to="/" aria-label="Zepter — pregled mog sektora">ZEPTER</Link></div><div className="manager-header-actions"><Link className="employee-icon-button" to="/projects?tools=1" aria-label="Pretraži projekte sektora"><Icon name="search" size={21}/></Link><Link className="employee-icon-button manager-bell" to="/notifications" aria-label={unread ? `Obaveštenja, ${unread} nepročitanih` : 'Obaveštenja'}><Icon name="bell" size={22}/>{unread > 0 && <span/>}</Link><ProfileMenu user={user} logout={logout}/></div></header>
    <main className="manager-content" id="manager-main">{children}</main>
    <footer className="manager-bottom"><nav aria-label="Glavna navigacija rukovodioca">{[['/', 'Početna', 'home'], ['/projects', 'Projekti', 'folder'], ['/reports', 'Izveštaji', 'chart'], ['/ideas', 'Ideje', 'bulb']].map(([to, label, icon]) => {
      const active = pathname === to || (to !== '/' && pathname.startsWith(to + '/')) || (to === '/projects' && pathname.startsWith('/activities/'));
      return <Link key={to} to={to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}><Icon name={icon} size={23}/><span>{label}</span>{active && <i/>}</Link>;
    })}</nav></footer>
  </div>;
}
