import React, {useEffect, useRef, useState} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import {api, subscribePush} from '../../api.js';
import {EmptyState, IconDisc, Pagination, ResourceState} from './EmployeeComponents.jsx';
import useEmployeeResource from './useEmployeeResource.js';
import {managerNotificationTabs,managerNotificationIcon} from '../manager/notifications.js';
import {notificationDestination, notificationIcon, notificationTabs, notificationTime} from './notifications.js';

export default function EmployeeNotifications({variant='employee'}) {
  const manager=variant==='manager', tabs=manager?managerNotificationTabs:notificationTabs;
  const [search, setSearch] = useSearchParams(), navigate = useNavigate();
  const category = tabs.some(([key]) => key === search.get('category')) ? search.get('category') : 'all';
  const page = Math.max(1, Math.floor(Number(search.get('page')) || 1));
  const resource = useEmployeeResource('/notifications?' + new URLSearchParams({category, page, limit: 12, grouped: true,...(manager?{view:'manager'}:{})}));
  const {data, busy, error: loadError, reload} = resource;
  const [working, setWorking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [failedLink, setFailedLink] = useState(null);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  useEffect(() => {const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer);}, []);
  useEffect(() => {if (data && page > 1 && !data.items.length) setSearch(category === 'all' ? {} : {category}, {replace: true});}, [data, page, category, setSearch]);
  const change = (nextCategory, nextPage = 1) => {setError(''); setNotice(''); setFailedLink(null); setSearch({...(nextCategory !== 'all' ? {category: nextCategory} : {}), ...(nextPage > 1 ? {page: nextPage} : {})}); window.scrollTo({top: 0});};
  const open = async notification => {
    if (lock.current) return;
    const target = notificationDestination(notification.link);
    if (!target) {setError('Obaveštenje nema podržan link. Potražite sadržaj kroz projekte ili ideje.'); return;}
    setError(''); setNotice(''); setFailedLink(null);
    if (notification.readAt) {navigate(target); return;}
    lock.current = true; setWorking(true);
    try {await api('/notifications/' + notification._id + '/read', {method: 'PATCH'}); navigate(target);}
    catch (e) {setError('Označavanje nije uspelo: ' + e.message); setFailedLink(target);}
    finally {lock.current = false; setWorking(false);}
  };
  const readAll = async () => {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError(''); setNotice(''); setFailedLink(null);
    try {await api('/notifications/read-all', {method: 'POST'}); setNotice('Sva obaveštenja su označena kao pročitana.'); reload();}
    catch (e) {setError(e.message);}
    finally {lock.current = false; setWorking(false);}
  };
  const enablePush = async () => {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError(''); setNotice(''); setFailedLink(null);
    try {await subscribePush(); setNotice('Obaveštenja na telefonu su uključena.');}
    catch (e) {setError(e.message);}
    finally {lock.current = false; setWorking(false);}
  };
  const fresh = data?.items.filter(item => !item.readAt) || [], earlier = data?.items.filter(item => item.readAt) || [];
  const group = (items, heading, id) => items.length > 0 && <section className="employee-notification-group" aria-labelledby={id}><h2 id={id}>{heading}</h2>{items.map(item => <button className={`employee-notification-card ${item.readAt ? '' : 'is-unread'}`} key={item._id} onClick={() => open(item)} disabled={working}>
    <IconDisc name={manager?managerNotificationIcon(item):notificationIcon(item)}/><span className="employee-notification-copy"><strong>{item.title}</strong><span>{item.body}</span><time dateTime={item.createdAt}>{notificationTime(item.createdAt, now)}</time></span><span className="employee-notification-tail">{!item.readAt && <i aria-label="Nepročitano"/>}<Icon name="chevron" size={19}/></span>
  </button>)}</section>;
  return <div className={manager?"employee-notifications manager-notifications":"employee-notifications"}>
    <div className="employee-greeting">{manager&&<IconDisc name="bell"/>}<div><h1>Obaveštenja</h1><p>{manager?"Pregled važnih novosti u sektoru":"Sve važne novosti i aktivnosti"}</p></div></div>
    <div className="employee-filter-tabs employee-notification-tabs" role="group" aria-label="Kategorija obaveštenja">{tabs.map(([key, title]) => <button key={key} aria-pressed={category === key} className={category === key ? 'is-active' : ''} onClick={() => change(key)}>{title}</button>)}</div>
    {data?.unread > 0 && <div className="employee-notification-tools"><span>{data.unread} nepročitanih ukupno</span><button className="employee-text-button" disabled={working} onClick={readAll}>Označi sva kao pročitana</button></div>}
    <ResourceState busy={busy} error={loadError} onRetry={reload} noun="pregled obaveštenja"/>
    {error && <div className="employee-form-error" role="alert"><p>{error}</p>{failedLink && <Link className="employee-text-button" to={failedLink}>Otvori sadržaj bez označavanja</Link>}</div>}
    {notice && <p className="employee-form-success" role="status">{notice}</p>}
    <div className="employee-notifications-feed" aria-busy={busy}>{group(fresh, `Nova (${data?.filteredUnread ?? fresh.length})`, 'new-notifications')}{group(earlier, 'Ranije', 'earlier-notifications')}</div>
    {data && !data.items.length && <EmptyState icon="bell" title={category === 'all' ? 'Nema obaveštenja' : 'Nema obaveštenja u ovoj kategoriji'}>Nova zaduženja, komentari i promene biće prikazani ovde.</EmptyState>}
    {data && <Pagination {...data} label="Stranice obaveštenja" onPage={value => change(category, value)}/>}
    <details className="employee-push-settings"><summary>Obaveštenja na telefonu</summary><p>Uključite postojeći Web Push da biste dobijali obaveštenja i kada aplikacija nije otvorena.</p><button className="employee-text-button" disabled={working} onClick={enablePush}>Uključi obaveštenja na telefonu</button></details>
  </div>;
}
