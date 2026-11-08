export const roles={employee:'Zaposleni',manager:'Rukovodilac sektora',president:'Predsednik',admin:'Administrator'};
export const approvals={pending:'Čeka odobrenje',approved:'Aktivan',disabled:'Deaktiviran',rejected:'Odbijen'};
export const entityNames={User:'Korisnici',Sector:'Sektori',Project:'Projekti',Activity:'Aktivnosti',Idea:'Ideje',Report:'Izveštaji',Comment:'Komentari',Attachment:'Prilozi',WorkLog:'Dnevni rad',Assignment:'Zaduženja',DecisionRequest:'Zahtevi'};
export const personName=user=>[user?.firstName,user?.lastName].filter(Boolean).join(' ')||'Korisnik';
export const refId=value=>String(value?._id||value||'');
export const protectedAccount=user=>['admin','president'].includes(user?.role);
export const adminDate=value=>value?new Date(value).toLocaleString('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Nije zabeleženo';
export const adminVersion=row=>row?.updatedAt?{'If-Match':'"'+new Date(row.updatedAt).toISOString()+'"'}:{};
export function userDraft(user){return {firstName:user.firstName||'',lastName:user.lastName||'',jobTitle:user.jobTitle||'',role:['pending','rejected'].includes(user.approval)?'employee':user.role,sectorId:refId(user.sector)};}
export function adminUserQuery(search){
 const query=new URLSearchParams();query.set('limit','12');
 for(const key of ['q','role','approval','sectorId'])if(search.get(key))query.set(key,search.get(key));
 query.set('page',String(Math.max(1,Math.min(10000,Math.floor(Number(search.get('page'))||1)))));return query;
}
export const auditLabel=action=>({
 'admin.user_approved':'Registracija odobrena','admin.user_rejected':'Registracija odbijena','admin.user_disabled':'Nalog deaktiviran','admin.user_activated':'Nalog ponovo aktiviran','admin.user_updated':'Podaci ili prava korisnika izmenjeni',
 'admin.sector_created':'Sektor dodat','admin.sector_updated':'Sektor izmenjen','auth.registration':'Nova registracija',
 'project.created':'Projekat kreiran','project.updated':'Projekat ažuriran','activity.created':'Aktivnost kreirana','activity.updated':'Aktivnost ažurirana'
 }[action]||'Zabeležena promena');
