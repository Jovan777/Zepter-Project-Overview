import {useEffect,useRef,useState} from 'react';
import {api} from '../../api.js';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {validateAttachment} from '../employee/activityForm.js';

// The comment is confirmed first. File retries retain their original operation ID.
export default function useCommentFiles(enabled,type,id){
 const config=useEmployeeResource(enabled?'/attachments/config':null,{live:false});
 const [items,setItems]=useState([]),[bound,setBound]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef([]),lock=useRef(false);
 const replace=next=>{current.current=next;setItems(next);};
 useEffect(()=>{current.current=[];setItems([]);setBound(null);setError('');},[type,id]);
 const choose=files=>{
  if(!enabled||lock.current||bound||!config.data)return;
  const next=[...current.current];
  for(const file of files){
   const invalid=validateAttachment(file,config.data);
   if(invalid){setError(file.name+': '+invalid);return;}
   if(next.length>=3){setError('Uz jednu poruku možete dodati najviše 3 priloga.');return;}
   next.push({key:crypto.randomUUID(),file});
  }
  replace(next);setError('');
 };
 const upload=async commentId=>{
  if(lock.current)return false;
  if(!current.current.length)return true;
  lock.current=true;setBusy(true);setBound(commentId);setError('');
  try{
   for(const entry of [...current.current]){
    const body=new FormData();body.append('file',entry.file);
    await api('/attachments?'+new URLSearchParams({targetType:type,targetId:id,commentId,uploadId:entry.key}),{method:'POST',body,isForm:true});
    replace(current.current.filter(item=>item.key!==entry.key));
    window.dispatchEvent(new Event('zepter:data-changed'));
   }
   setBound(null);return true;
  }catch(e){setError('Komentar je poslat. Prilog još nije potvrđen: '+e.message);return false;}
  finally{lock.current=false;setBusy(false);}
 };
 const remove=key=>{if(lock.current)return;const next=current.current.filter(item=>item.key!==key);replace(next);if(!next.length){setBound(null);setError('');}};
 const clear=()=>{if(!lock.current){replace([]);setBound(null);setError('');}};
 return {items,bound,busy,error,config,choose,upload,remove,clear};
}
