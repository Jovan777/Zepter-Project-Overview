export const sectorIdeaTabs=[['all','Sve'],['review','Na razmatranju'],['revision','Na doradi'],['forwarded','Prosleđene predsedniku']];
export const sectorIdeaStatuses={submitted:['Na razmatranju','review','clock'],in_review:['Na razmatranju','review','clock'],revision_requested:['Na doradi','warning','edit'],forwarded:['Prosleđeno predsedniku','success','check']};
export function sectorIdeaFilters(search) {
  const legacy={submitted:'review',in_review:'review',revision_requested:'revision',forwarded:'forwarded'};
  const value=search.get('tab')||legacy[search.get('status')]||'all';
  return {tab:sectorIdeaTabs.some(([key])=>key===value)?value:'all',page:Math.max(1,Math.min(10000,Math.floor(Number(search.get('page'))||1)))};
}
