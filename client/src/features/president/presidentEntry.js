const personalPath=/^(?:\/president\/zp\/002\/([A-Za-z0-9]{12}|[-_A-Za-z0-9]{32})|\/president-zp-([-_A-Za-z0-9]{32}))(?=\/|$)/;
export const presidentBasename=pathname=>personalPath.exec(pathname||'')?.[0]||null;
export const presidentKeyFromPath=pathname=>{const match=personalPath.exec(pathname||'');return match?.[1]||match?.[2]||null;};
const personalPrefix=pathname=>String(pathname).startsWith('/president-zp-')||pathname==='/president/zp'||String(pathname).startsWith('/president/zp/');
export const isPresidentEntryPath=pathname=>['/predsednik','/president'].includes(pathname)||personalPrefix(pathname);
// The personal path stays in the address bar and becomes the router basename.
// Legacy fragment links remain accepted. No credential goes into persistent JS storage.
export function capturePresidentEntry(location,history){
 if(!isPresidentEntryPath(location.pathname))return null;
 const basename=presidentBasename(location.pathname);
 if(basename){
  let key=presidentKeyFromPath(location.pathname);
  return {basename,invalid:false,takeKey(){const captured=key;key='';return captured||null;}};
 }
 if(personalPrefix(location.pathname))return {basename:null,invalid:true,takeKey:()=>null};
 let key=location.hash.slice(1);
 const invalid=!!key&&!/^[-_A-Za-z0-9]{32}$/.test(key);
 if(location.hash)history.replaceState(history.state,'',location.pathname+location.search);
 if(invalid)key='';
 return {basename:null,invalid,takeKey(){const captured=key;key='';return captured||null;}};
}
export function presidentScopedPath(currentPath,destination){
 const target=typeof destination==='string'&&destination.startsWith('/')&&!destination.startsWith('//')?destination:'/';
 const basename=presidentBasename(currentPath);
 if(!basename||target===basename||target.startsWith(basename+'/'))return target;
 return basename+(target==='/'?'':target);
}
