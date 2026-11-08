export const priorities={low:'Nizak',medium:'Srednji',high:'Visok',urgent:'Hitan'};
export function presidentDate(value,year=true){
 if(!value||Number.isNaN(Date.parse(value)))return 'Nije postavljen';
 return new Intl.DateTimeFormat('sr-Latn-RS',{timeZone:'Europe/Belgrade',day:'numeric',month:'short',...(year?{year:'numeric'}:{})}).format(new Date(value));
}
export const fullName=person=>[person?.firstName,person?.lastName].filter(Boolean).join(' ')||'Osoba nije dostupna';
export const personId=person=>String(person?._id||person);
export function projectTeam(project){
 return [...new Map([project?.owner,...(project?.members||[])].filter(Boolean).map(person=>[personId(person),person])).values()];
}
export function projectActivities(items,filter){
 return filter==='completed'?items.filter(a=>a.status==='completed'):filter==='open'?items.filter(a=>a.status!=='completed'):items;
}
export function recoverDecisionDraft(text,idea){
 if(idea.status==='forwarded'||!text.trim()||idea.decision?.note===text.trim())return '';
 return text;
}
