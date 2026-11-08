import {projectStatuses} from '../employee/presentation.js';
export const managerTabs = [['all', 'Svi'], ['active', 'U toku'], ['review', 'Na proveri'], ['on_track', 'Po planu']];
export const managerExtraTabs = {attention: 'Potrebna pažnja', at_risk: 'Rok ugrožen', planned: 'Planirani', on_hold: 'Pauzirani', completed: 'Završeni', cancelled: 'Otkazani'};
export function managerProjectStatus(project) {
  if (project.status === 'active' && project.hasReview) return {label: 'Na proveri', tone: 'warning', description: 'Projekat ima aktivnost koja čeka proveru.'};
  if (project.status === 'active' && project.onTrack) return {label: 'Po planu', tone: 'success', description: 'Aktivan projekat bez probijenog roka, blokiranih ili zakašnjelih aktivnosti.'};
  return projectStatuses[project.status] || {label: 'Nepoznat status', tone: 'neutral'};
}
