import React, {useRef, useState} from 'react';
import Icon from '../../components/Icon.jsx';
import {api, downloadAttachment} from '../../api.js';
import useEmployeeResource from './useEmployeeResource.js';
import {IconDisc, ResourceState} from './EmployeeComponents.jsx';
import {formatFileSize, validateAttachment} from './activityForm.js';
import {uncertainWrite} from '../workspace/mutations.js';

export default function EmployeeAttachments({type, id, user, editable = false, resource, showCount = false}) {
  const ownResource = useEmployeeResource(resource ? null : `/attachments/target/${type}/${id}`, {keepPreviousData: true});
  const {data, busy, error: loadError, reload} = resource || ownResource;
  const config = useEmployeeResource('/attachments/config', {live: false});
  const [working, setWorking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [uncertain,setUncertain]=useState(false);
  const picker = useRef(null), lock = useRef(false);
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || lock.current || uncertain || !editable || !config.data) return;
    const invalid = validateAttachment(file, config.data);
    setNotice(''); setError(invalid);
    if (invalid) return;
    lock.current = true; setWorking(true);
    try {
      const body = new FormData(); body.append('file', file);
      await api(`/attachments?targetType=${type}&targetId=${id}`, {method: 'POST', body, isForm: true});
      setNotice('Prilog je dodat.'); reload();
    } catch (e) {setError(e.message);setUncertain(uncertainWrite(e));}
    finally {lock.current = false; setWorking(false);}
  };
  const remove = async attachment => {
    if (lock.current) return;
    lock.current = true; setWorking(true); setError(''); setNotice('');
    try {await api(`/attachments/${attachment._id}`, {method: 'DELETE'}); setConfirmId(null); setNotice('Prilog je uklonjen.'); reload();}
    catch (e) {setError(e.message);}
    finally {lock.current = false; setWorking(false);}
  };
  return <section className="employee-attachment-panel" aria-label="Prilozi">
    <div className="employee-attachment-heading"><IconDisc name="clip"/><h2>Prilozi{showCount && data ? ` (${data.items.length})` : ''}</h2>{editable && <button type="button" className="employee-add-file" disabled={working || uncertain || !config.data} onClick={() => picker.current?.click()}><span aria-hidden="true">+</span> {working ? 'Sačekajte…' : 'Dodaj prilog'}</button>}</div>
    <ResourceState busy={busy && !data} error={loadError} onRetry={reload} noun="priloge"/>
    <div className="employee-attachment-list">{data?.items.map(attachment => <div className="employee-attachment-item" key={attachment._id}>
      <Icon name="file" size={25}/><button className="employee-attachment-download" disabled={working} onClick={async () => {try {await downloadAttachment(attachment._id, attachment.originalName);} catch (e) {setError(e.message);}}}><strong>{attachment.originalName}</strong><small>{formatFileSize(attachment.size)}</small></button><Icon name="download" size={17}/>
      {String(attachment.owner?._id || attachment.owner) === user._id && <button className="employee-icon-button" disabled={working} aria-label={`Ukloni prilog ${attachment.originalName}`} onClick={() => setConfirmId(attachment._id)}><Icon name="close" size={16}/></button>}
      {confirmId === attachment._id && <div className="employee-remove-confirm" role="alert"><p>Trajno ukloniti ovaj prilog?</p><button className="employee-text-button" disabled={working} onClick={() => remove(attachment)}>Ukloni prilog</button><button className="employee-text-button" disabled={working} onClick={() => setConfirmId(null)}>Otkaži</button></div>}
    </div>)}</div>
    {data && !data.items.length && <p className="employee-small-note">Još nema priloga.</p>}
    {editable && <><input ref={picker} className="employee-file-input" type="file" aria-label="Izaberite prilog" accept={config.data?.extensions.join(',')} disabled={working || !config.data} onChange={upload}/><p className="employee-small-note">PDF, slike i Office dokumenti{config.data ? `, do ${formatFileSize(config.data.maxBytes)} po fajlu` : ''}. Prilog se čuva odmah.</p></>}
    {editable && config.error && <p className="employee-form-error" role="alert">Ne mogu da učitam dozvoljene formate. <button className="employee-text-button" onClick={config.reload}>Pokušaj ponovo</button></p>}
    {error && <p className="employee-form-error" role="alert">{error}</p>}
    {uncertain&&<div className="employee-conflict" role="alert"><p>Prilog je možda već dodat. Proverite spisak da ga ne biste poslali dvaput.</p><button className="employee-text-button" onClick={reload}>Proveri priloge</button><button className="employee-text-button" onClick={()=>{setUncertain(false);setError('');}}>Proverio/la sam spisak — nastavi dodavanje</button></div>}
    {notice && <p className="employee-form-success" role="status">{notice}</p>}
  </section>;
}
