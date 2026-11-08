export const notificationTabs = [['all', 'Sva'], ['tasks', 'Zadaci'], ['projects', 'Projekti'], ['ideas', 'Ideje'], ['guidance', 'Smernice']];
export function notificationDestination(link) {
  if (typeof link !== 'string') return null;
  if (['/projects', '/ideas', '/reports', '/daily', '/assignments', '/requests'].includes(link)) return link;
  const report=/^\/reports\?scope=sector&type=daily&day=(\d{4}-\d{2}-\d{2})$/.exec(link);
  if(report&&Number.isFinite(Date.parse(report[1]+'T00:00:00Z'))&&new Date(report[1]+'T00:00:00Z').toISOString().slice(0,10)===report[1])return link;
  return /^\/(projects|activities|ideas|sectors|reports|assignments|requests)\/[a-f\d]{24}$/i.test(link) ? link : null;
}
export function notificationIcon(item) {
  if (item.type === 'instruction' || (item.type === 'comment' && item.title === 'Nova instrukcija')) return 'flag';
  if (item.type === 'comment') return 'message';
  if (item.link?.startsWith('/ideas/')) return 'bulb';
  if (item.link?.startsWith('/projects/')) return 'folder';
  if (item.link?.startsWith('/reports/')) return 'chart';
  return 'activity';
}
export function notificationTime(value, now = Date.now()) {
  const date = new Date(value), elapsed = Math.max(0, now - date.getTime());
  if (!Number.isFinite(date.getTime())) return '';
  if (elapsed < 60000) return 'Upravo sada';
  if (elapsed < 3600000) return `Pre ${Math.floor(elapsed / 60000)} min`;
  if (elapsed < 86400000) return `Pre ${Math.floor(elapsed / 3600000)} h`;
  return new Intl.DateTimeFormat('sr-Latn-RS', {timeZone: 'Europe/Belgrade', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}).format(date);
}
