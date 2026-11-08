import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useLocation, useSearchParams} from 'react-router-dom';
import {Link} from '../workspace/MotionNavigation.jsx';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import './employee.css';
import './employee-details.css';
import './employee-ideas.css';
import './employee-inbox.css';
import WorkspaceNavigation from '../workspace/WorkspaceNavigation.jsx';
import WorkspacePage from '../workspace/WorkspacePage.jsx';

const DetailHeader = createContext(null);
export function useEmployeeBackLink(to, label) {
  const setHeader = useContext(DetailHeader);
  useEffect(() => {
    setHeader?.({to, label});
    return () => setHeader?.(null);
  }, [setHeader, to, label]);
}

export function ProfileMenu({user, logout}) {
  const menu = useRef(null);
  const location = useLocation();
  useEffect(() => {if (menu.current) menu.current.open = false;}, [location.pathname]);
  useEffect(() => {
    const close = event => {if (!menu.current?.contains(event.target)) menu.current?.removeAttribute('open');};
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  return <details className="employee-profile" ref={menu} onKeyDown={event => {if (event.key === 'Escape') {menu.current.open = false; menu.current.querySelector('summary').focus();}}}>
    <summary className="employee-icon-button" aria-label="Moj nalog" title="Moj nalog"><Icon name="profile" size={27}/></summary>
    <div className="employee-profile-menu"><strong>{user.firstName} {user.lastName}</strong><span>{user.jobTitle || (user.role === 'president' ? 'Predsednik' : user.role === 'manager' ? 'Rukovodilac sektora' : 'Zaposleni')}</span>{user.role!=='president'&&<Link to="/daily"><Icon name="calendar" size={18}/>Moj dnevni unos</Link>}<button onClick={logout}><Icon name="logout" size={18}/>Odjavi se</button></div>
  </details>;
}

export default function EmployeeShell({user, logout, newNotification, children}) {
  const {pathname} = useLocation();
  const [search, setSearch] = useSearchParams();
  const desktopTitle = pathname === '/' ? 'Moj pregled' : pathname.startsWith('/activities/') ? 'Aktivnost' : pathname.startsWith('/projects/') ? 'Projekat' : pathname === '/ideas/new' ? 'Nova ideja' : pathname === '/notifications' ? 'Obaveštenja' : 'Moj radni prostor';
  const isProjects = pathname === '/projects';
  const isIdeas = pathname === '/ideas';
  const isIdeaDetail = /^\/ideas\/[a-f\d]{24}$/i.test(pathname);
  const isDetail = isIdeaDetail || /^\/(projects|activities)\/[a-f\d]{24}$/i.test(pathname) || pathname === '/ideas/new';
  const [detailBack, setDetailBack] = useState(null);
  const {data} = useEmployeeResource('/notifications?limit=1');
  const unread = data?.unread ?? (newNotification ? 1 : 0);
  useEffect(() => {window.scrollTo({top: 0});}, [pathname]);
  const toggleTools = () => {
    const next = new URLSearchParams(search);
    if (next.has('tools')) next.delete('tools'); else next.set('tools', '1');
    setSearch(next);
  };
  return <DetailHeader.Provider value={setDetailBack}><div className="app-shell employee-shell workspace-shell">
    <a className="employee-skip" href="#employee-main">Preskoči na sadržaj</a>
    <header className={`employee-header ${isProjects || isIdeas ? 'employee-header--page' : ''} ${isDetail ? 'employee-header--detail' : ''}`}>
      {isIdeas ? <><Link className="employee-icon-button employee-back" to="/" aria-label="Nazad na moj pregled"><Icon name="back" size={25}/></Link><div className="employee-page-heading"><h1>Moje ideje</h1><p>Pregled ideja koje ste poslali</p></div></> : isProjects ? <><Link className="employee-icon-button employee-back" to="/" aria-label="Nazad na moj pregled"><Icon name="back" size={25}/></Link><div className="employee-page-heading"><h1>Moji projekti</h1><p>Projekti na kojima učestvujete</p></div><button className="employee-icon-button" onClick={toggleTools} aria-label="Pretraga i redosled projekata" aria-expanded={search.has('tools')} aria-controls="project-tools"><Icon name="more"/></button></> : <><div className="employee-detail-brand">{isDetail && <Link className="employee-icon-button employee-back" to={detailBack?.to || (isIdeaDetail ? '/ideas' : '/projects')} aria-label={detailBack?.label || (isIdeaDetail ? 'Nazad na moje ideje' : 'Nazad na moje projekte')}><Icon name="back" size={25}/></Link>}{isIdeaDetail ? <span className="employee-idea-header-title">Ideja</span> : <Link className="employee-brand" to="/" aria-label="Zepter — početna">ZEPTER</Link>}{!isIdeaDetail && <span className="workspace-header-context workspace-desktop-only">{desktopTitle}</span>}</div><div className="employee-header-actions">{!isDetail && <Link className="employee-icon-button" to="/projects?tools=1" aria-label="Pretraži moje projekte"><Icon name="search" size={25}/></Link>}<Link className="employee-icon-button employee-bell" to="/notifications" aria-label={unread ? `Obaveštenja, ${unread} nepročitanih` : 'Obaveštenja'}><Icon name="bell" size={25}/>{unread > 0 && <span className="employee-notification-count">{unread > 99 ? '99+' : unread}</span>}</Link><ProfileMenu user={user} logout={logout}/></div></>}
    </header>
    <WorkspacePage className="employee-content" id="employee-main">{children}</WorkspacePage>
    <WorkspaceNavigation user={user} logout={logout}/>
  </div></DetailHeader.Provider>;
}
