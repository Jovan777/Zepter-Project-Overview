export const isPresidentEntryPath=pathname=>['/predsednik','/president'].includes(pathname);
// Capture once, before the router starts. The credential is never a query parameter.
export function capturePresidentEntry(location,history){
 if(!isPresidentEntryPath(location.pathname))return null;
 let key=location.hash.slice(1);
 const invalid=!!key&&!/^[-_A-Za-z0-9]{32}$/.test(key);
 if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
 if(invalid)key='';
 return {invalid,takeKey(){const captured=key;key='';return captured||null;}};
}
