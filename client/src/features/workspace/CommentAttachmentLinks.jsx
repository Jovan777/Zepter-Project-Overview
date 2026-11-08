import React,{useState} from 'react';
import Icon from '../../components/Icon.jsx';
import {downloadAttachment} from '../../api.js';
import {formatFileSize} from '../employee/activityForm.js';
import './comment-files.css';

export default function CommentAttachmentLinks({items=[]}){
 const [error,setError]=useState(''),[working,setWorking]=useState(null);
 if(!items.length)return null;
 return <><div className="comment-attachment-links">{items.map(file=><button key={file._id} type="button" disabled={!!working} onClick={async()=>{setError('');setWorking(file._id);try{await downloadAttachment(file._id,file.originalName);}catch(e){setError(e.message);}finally{setWorking(null);}}} aria-label={'Preuzmi '+file.originalName}><Icon name="file" size={20}/><span><strong>{file.originalName}</strong><small>{working===file._id?'Preuzimanje…':formatFileSize(file.size)}</small></span><Icon name="download" size={15}/></button>)}</div>{error&&<p className="employee-form-error" role="alert">{error}</p>}</>;
}
