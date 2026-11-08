import {createContext,useContext,useEffect} from 'react';
import {useLocation} from 'react-router-dom';
export const PresidentBackContext=createContext(null);
export function usePresidentBackLink(to,label){
 const setBack=useContext(PresidentBackContext),{pathname}=useLocation();
 useEffect(()=>{
  if(!setBack||!to)return;
  setBack({pathname,to,label});
  return()=>setBack(current=>current?.pathname===pathname?null:current);
 },[setBack,pathname,to,label]);
}
