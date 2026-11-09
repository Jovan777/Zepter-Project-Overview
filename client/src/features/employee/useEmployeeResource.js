import {useEffect, useRef, useState} from 'react';
import {api} from '../../api.js';

export default function useEmployeeResource(url, {live = true, keepPreviousData = false} = {}) {
  const [state, setState] = useState({data: null, busy: true, error: ''});
  const [version, setVersion] = useState(0);
  const previousUrl = useRef(null);
  useEffect(() => {
    if (!live) return;
    let timer;
    const reload = () => {clearTimeout(timer);timer=setTimeout(()=>setVersion(v=>v+1),120);};
    const visible = () => {if(document.visibilityState==='visible')reload();};
    window.addEventListener('zepter:data-changed', reload);
    window.addEventListener('zepter:notifications-changed', reload);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('zepter:data-changed', reload);
      window.removeEventListener('zepter:notifications-changed', reload);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [live]);
  useEffect(() => {
    if (!url) {setState({data: null, busy: false, error: ''}); return;}
    const controller = new AbortController();
    const preserve = keepPreviousData && previousUrl.current === url;
    previousUrl.current = url;
    setState(previous => ({data: preserve ? previous.data : null, busy: true, error: ''}));
    api(url, {signal: controller.signal})
      .then(data => {if (!controller.signal.aborted) setState({data, busy: false, error: ''});})
      .catch(error => {if (!controller.signal.aborted) setState(previous => ({data: preserve ? previous.data : null, busy: false, error: error.message}));});
    return () => controller.abort();
  }, [url, version, keepPreviousData]);
  return {...state, reload: () => setVersion(v => v + 1)};
}
