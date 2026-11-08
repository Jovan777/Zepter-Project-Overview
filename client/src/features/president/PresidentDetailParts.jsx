import React from 'react';
import Icon from '../../components/Icon.jsx';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {ResourceState} from '../employee/EmployeeComponents.jsx';
import CommentAttachmentLinks from '../workspace/CommentAttachmentLinks.jsx';

export function PersonAvatar({person}){
 return <span className="president-person-avatar" aria-hidden="true">{[person?.firstName,person?.lastName].filter(Boolean).map(name=>name[0]).join('')||'?'}</span>;
}
export function PresidentDocuments({type,id}){
 const resource=useEmployeeResource('/attachments/target/'+type+'/'+id,{keepPreviousData:true});
 // Conversation files are displayed alongside their message, not as original proposal documents.
 const items=resource.data?.items.filter(file=>!file.comment)||[];
 return <section className="president-record-documents" aria-label="Dokumenti"><div className="president-record-section-heading"><h2>Prilozi{resource.data?' ('+items.length+')':''}</h2><Icon name="clip" size={18}/></div><ResourceState busy={resource.busy&&!resource.data} error={resource.error} onRetry={resource.reload} noun="spisak priloga"/>{resource.data&&!items.length&&<p className="president-record-empty">Još nema priloženih dokumenata.</p>}<CommentAttachmentLinks items={items}/></section>;
}
