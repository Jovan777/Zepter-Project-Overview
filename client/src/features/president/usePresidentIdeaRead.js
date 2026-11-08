import {useEffect,useState} from 'react';
import {api} from '../../api.js';
export default function usePresidentIdeaRead(idea,user){
 const [attempt,setAttempt]=useState(0),[state,setState]=useState({error:'',conflict:false});
 useEffect(()=>{
  if(user.role!=='president'||!idea?._id)return;
  let active=true;setState({error:'',conflict:false});
  api('/ideas/'+idea._id+'/read',{method:'POST',headers:idea.updatedAt?{'If-Match':'"'+idea.updatedAt+'"'}:{}}).then(()=>{
   window.dispatchEvent(new Event('zepter:notifications-changed'));
  }).catch(error=>{if(active)setState({error:'Status čitanja nije potvrđen. '+error.message,conflict:error.status===409});});
  return()=>{active=false;};
 },[user.role,user._id,idea?._id,idea?.updatedAt,attempt]);
 return {...state,retry:()=>setAttempt(value=>value+1)};
}
