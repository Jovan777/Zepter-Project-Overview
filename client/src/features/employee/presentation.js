export const projectStatuses = {
  planned: {label: 'Planirano', tone: 'neutral'},
  active: {label: 'U toku', tone: 'gold'},
  at_risk: {label: 'Rok ugrožen', tone: 'warning'},
  on_hold: {label: 'Pauzirano', tone: 'neutral'},
  completed: {label: 'Završeno', tone: 'success'},
  cancelled: {label: 'Otkazano', tone: 'neutral'}
};
export function projectStatus(project) {
  if (project.status === 'active' && project.myActivities?.some(a => a.status === 'review')) {
    return {label: 'Na proveri', tone: 'warning', description: 'Vaša aktivnost na ovom projektu je na proveri.'};
  }
  return projectStatuses[project.status] || {label: 'Nepoznat status', tone: 'neutral'};
}
export const activityStatuses = {planned: 'Planirano', in_progress: 'U toku', review: 'Na proveri', blocked: 'Blokirano', completed: 'Završeno'};
export function formatDeadline(value) {
  return value ? new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'long'}).format(new Date(value)) : 'Nije postavljen';
}
export function belgradeDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(value));
}
export function deadlineLabel(item, today) {
  if (item.status === 'blocked') return {label: 'Blokirano', tone: 'warning'};
  if (item.dueDate) {
    const day = belgradeDate(item.dueDate);
    if (day < today) return {label: 'Rok prošao', tone: 'warning'};
    if (day === today) return {label: 'Danas', tone: 'gold'};
    return {label: formatDeadline(item.dueDate), tone: 'gold'};
  }
  return {label: 'Instrukcija', tone: 'gold'};
}
export function countLabel(number, one, few, many) {
  const n = Math.abs(number), last = n % 10, lastTwo = n % 100;
  return last === 1 && lastTwo !== 11 ? one : last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}
