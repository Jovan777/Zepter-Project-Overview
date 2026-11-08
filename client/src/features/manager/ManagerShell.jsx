import React, {createContext, useContext, useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {ProfileMenu} from '../employee/EmployeeShell.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import '../employee/employee.css';
import '../employee/employee-details.css';
import './manager.css';
import WorkspaceNavigation from '../workspace/WorkspaceNavigation.jsx';
import './manager-projects.css';

const ProjectHeader = createContext(null);
export function useManagerProjectHeader(title, backTo, editTo) {
  const setHeader = useContext(ProjectHeader);
  useEffect(() => {setHeader?.({title, backTo, editTo}); return () => setHeader?.(null);}, [setHeader, title, backTo, editTo]);
}

export default function ManagerShell({user, logout, children}) {
  const {pathname} = useLocation();
  const [projectHeader, setProjectHeader] = useState(null);
  const resource = useEmployeeResource('/notifications?limit=1');
  const unread = resource.data?.unread;
  useEffect(() => {window.scrollTo({top: 0});}, [pathname]);
  const detail = !['/', '/projects', '/reports', '/ideas', '/notifications'].includes(pathname);
  const back = pathname.startsWith('/ideas/') ? '/ideas' : pathname.startsWith('/reports/') ? '/reports' : '/projects';
  return <ProjectHeader.Provider value={setProjectHeader}><div className="app-shell employee-shell manager-shell workspace-shell">
    <a className="employee-skip" href="#manager-main">Preskoči na sadržaj</a>
    {projectHeader ? <header className="manager-header manager-project-header"><div><Link className="employee-icon-button" to={projectHeader.backTo} aria-label="Nazad"><Icon name="back" size={23}/></Link><strong>{projectHeader.title}</strong></div><div className="manager-header-actions">{projectHeader.editTo && <Link className="employee-icon-button" to={projectHeader.editTo} aria-label="Uredi projekat" title="Uredi projekat"><Icon name="edit" size={23}/></Link>}<Link className="employee-icon-button manager-bell" to="/notifications" aria-label={unread ? `Obaveštenja, ${unread} nepročitanih` : 'Obaveštenja'}><Icon name="bell" size={22}/>{unread > 0 && <span/>}</Link></div></header> : <header className="manager-header"><div>{detail && <Link className="employee-icon-button" to={back} aria-label="Nazad"><Icon name="back" size={22}/></Link>}<Link className="manager-brand" to="/" aria-label="Zepter — pregled mog sektora">ZEPTER</Link><span className="workspace-header-context workspace-desktop-only">{pathname === '/' ? 'Pregled mog sektora' : pathname === '/projects' ? 'Projekti sektora' : pathname === '/reports' ? 'Izveštaji sektora' : pathname === '/ideas' ? 'Ideje zaposlenih' : 'Moj sektor'}</span></div><div className="manager-header-actions"><Link className="employee-icon-button" to="/projects?tools=1" aria-label="Pretraži projekte sektora"><Icon name="search" size={21}/></Link><Link className="employee-icon-button manager-bell" to="/notifications" aria-label={unread ? `Obaveštenja, ${unread} nepročitanih` : 'Obaveštenja'}><Icon name="bell" size={22}/>{unread > 0 && <span/>}</Link><ProfileMenu user={user} logout={logout}/></div></header>}
    <main className="manager-content" id="manager-main">{children}</main>
    <WorkspaceNavigation user={user} logout={logout}/>
  </div></ProjectHeader.Provider>;
}
