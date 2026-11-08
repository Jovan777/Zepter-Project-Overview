export const reportFields = [['results','Rezultati'],['problems','Problemi / rizici'],['nextSteps','Naredni koraci']];
export function reportDraft(report) {
  return Object.fromEntries(reportFields.map(([key])=>[key,report?.[key]||'']));
}
export const reportDirty=(draft,baseline)=>reportFields.some(([key])=>draft[key]!==baseline[key]);
export function reportHeaders(report) {
  return report?{'If-Match':`"${report.updatedAt}"`}:{'If-None-Match':'*'};
}
export function reportSaveBody({sectorId,type,day,draft}) {
  return {sectorId,type,day,...Object.fromEntries(reportFields.map(([key])=>[key,draft[key].trim()]))};
}
