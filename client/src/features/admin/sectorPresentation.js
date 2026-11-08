const known={pravna_sluzba:'LEGAL',it:'IT',marketing:'MKT',kontroling:'CTRL',finansije:'FIN',hr:'HR',prodaja:'SALES',r_d:'RND',logistika:'LOG',b2b:'B2B',edukativni_sektor:'EDU',call_centar:'CALL'};
export function sectorCode(name){
 const slug=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
 return known[slug]||slug.toUpperCase().slice(0,20);
}
