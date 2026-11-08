import {belgradeDate} from '../employee/presentation.js';

export const personId = person => String(person?._id || person || '');
export const personName = person => [person?.firstName, person?.lastName].filter(Boolean).join(' ') || 'Član tima';
export const priorities = {low: 'Nizak', medium: 'Srednji', high: 'Visok', urgent: 'Hitan'};
export const formatProjectDate = value => value ? new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(value)) : 'Nije postavljen';
const dateInput = value => value ? belgradeDate(value) : '';
const sortedIds = ids => [...new Set(ids.map(personId))].sort();

export function projectDraft(project, user) {
  return {title: project?.title || '', description: project?.description || '',
    sectorId: personId(project?.sector || user.sector), ownerId: personId(project ? project.owner : user),
    memberIds: sortedIds(project ? [...project.members, ...(project.owner ? [project.owner] : [])] : [user._id]),
    dueDate: dateInput(project?.dueDate), startDate: dateInput(project?.startDate),
    priority: project?.priority || 'medium', status: project?.status || 'planned'};
}
export function projectPayload(draft, baseline) {
  const body = {title: draft.title.trim(), description: draft.description.trim(), priority: draft.priority,
    status: draft.status, ownerId: draft.ownerId || null, memberIds: sortedIds([...draft.memberIds, draft.ownerId].filter(Boolean))};
  for (const key of ['dueDate', 'startDate']) body[key] = draft[key] || (baseline ? null : undefined);
  if (!baseline) {body.sectorId = draft.sectorId; if (!body.ownerId) delete body.ownerId; return body;}
  const previous = projectPayload(baseline);
  return Object.fromEntries(Object.entries(body).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key] ?? (['dueDate', 'startDate'].includes(key) ? null : undefined))));
}
export function activityPayload(draft) {
  return {title: draft.title.trim(), description: draft.description?.trim() || '',
    assigneeIds: sortedIds(draft.assigneeIds || []), dueDate: draft.dueDate || undefined,
    status: 'planned', progress: 0, priority: draft.priority || 'medium'};
}

// Retain the project and confirmed activity IDs across a partial failure.
// An ambiguous network/server failure requires inspection instead of a blind POST retry.
export async function saveProjectWithActivities(session, {request, draft, baseline, activities, onProject = () => {}, onActivity = () => {}}) {
  if (session.uncertain) throw Error('Proverite sačuvane podatke pre novog pokušaja.');
  if (!session.projectSaved) {
    const body = projectPayload(draft, baseline);
    try {
      if (!session.projectId || Object.keys(body).length) {
        const response = await request(session.projectId ? '/projects/' + session.projectId : '/projects', {
          method: session.projectId ? 'PATCH' : 'POST', body,
          headers: session.version ? {'If-Match': `"${session.version}"`} : {}});
        session.projectId = response.project._id;
        session.version = response.project.updatedAt;
      }
      session.projectSaved = true; onProject(session.projectId);
    } catch (error) {if (!error.status || error.status >= 500) session.uncertain = true; throw error;}
  }
  const failures = [];
  for (const row of activities) {
    if (session.activities.has(row.id)) continue;
    onActivity(row.id, {status: 'saving'});
    try {
      const {activity} = await request('/activities/project/' + session.projectId, {method: 'POST', body: activityPayload(row)});
      session.activities.set(row.id, activity._id); onActivity(row.id, {status: 'done'});
    } catch (error) {
      failures.push(row.id);
      if (!error.status || error.status >= 500) session.uncertain = true;
      onActivity(row.id, {status: 'error', error: error.message});
      break;
    }
  }
  return {projectId: session.projectId, failures};
}
