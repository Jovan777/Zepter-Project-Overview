const keyPattern=/^[-_A-Za-z0-9]{32}$/;
export function presidentAccessUrl(origin,key){
 const base=new URL(origin);
 if(!['http:','https:'].includes(base.protocol)||base.username||base.password||!keyPattern.test(key))throw Error('Nevažeći format ličnog linka.');
 return new URL('/president-zp-'+key,base.origin).href;
}
export function presidentUrlKey(value,origin){
 let url,base;
 try{url=new URL(value);base=new URL(origin);}catch{throw Error('Nevažeći format ličnog linka.');}
 if(url.origin!==base.origin||url.username||url.password)throw Error('Lični link nije za podešeni origin.');
 const pathKey=/^\/president-zp-([-_A-Za-z0-9]{32})\/?$/.exec(url.pathname)?.[1];
 const key=pathKey||(['/predsednik','/president'].includes(url.pathname)?url.hash.slice(1):'');
 if(!keyPattern.test(key))throw Error('Nevažeći format ličnog linka.');
 return key;
}
