import {activityDraft, changeActivityDraft} from '../employee/activityForm.js';
import {belgradeDate} from '../employee/presentation.js';
import {personId} from './projectForm.js';

export function managerActivityDraft(activity) {
  return {...activityDraft(activity), title: activity.title || '', description: activity.description || '',
    priority: activity.priority || 'medium', dueDate: activity.dueDate ? belgradeDate(activity.dueDate) : '',
    assigneeIds: [...new Set(activity.assignees.map(personId))].sort()};
}
export const changeManagerActivity = changeActivityDraft;
export function managerActivityPatch(draft, baseline) {
  const normalize = value => ({...value, title: value.title.trim(), description: value.description.trim(),
    assigneeIds: [...new Set(value.assigneeIds)].sort(), dueDate: value.dueDate || null});
  const next = normalize(draft), old = normalize(baseline);
  return Object.fromEntries(Object.entries(next).filter(([key,value]) => JSON.stringify(value) !== JSON.stringify(old[key])));
}
export const activityFieldLabels = {title:'naziv',description:'opis',assigneeIds:'odgovorne osobe',status:'status',progress:'napredak',priority:'prioritet',dueDate:'rok',actualWork:'urađeni posao',nextStep:'sledeći korak',blockers:'prepreke'};
