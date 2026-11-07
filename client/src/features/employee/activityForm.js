export const activityFields = ['status', 'progress', 'actualWork', 'nextStep', 'blockers'];
export function activityDraft(activity) {
  return {status: activity.status, progress: Number(activity.progress) || 0, actualWork: activity.actualWork || '', nextStep: activity.nextStep || '', blockers: activity.blockers || ''};
}
export function changeActivityDraft(draft, field, value) {
  const next = {...draft, [field]: value};
  if (field === 'status' && value === 'completed') next.progress = 100;
  if (field === 'progress') {
    next.progress = Math.max(0, Math.min(100, Number(value) || 0));
    if (next.progress < 100 && next.status === 'completed') next.status = 'in_progress';
  }
  if (next.progress === 100 && next.status !== 'completed') next.status = 'review';
  return next;
}
export function sameActivityDraft(a, b) {
  return activityFields.every(field => a[field] === b[field]);
}
export function validateAttachment(file, config) {
  if (!file.size) return 'Izabrani fajl je prazan.';
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!config.extensions.includes(extension)) return 'Ovaj format nije podržan. Izaberite PDF, sliku ili Office dokument.';
  if (file.size > config.maxBytes) return `Prilog može imati najviše ${Math.round(config.maxBytes / 1024 / 1024 * 10) / 10} MB.`;
  return '';
}
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat('sr-Latn-RS', {maximumFractionDigits: 1}).format(bytes / 1024 / 1024)} MB`;
}
