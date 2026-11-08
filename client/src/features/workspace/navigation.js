export const workspaceLinks = {
  president: [['/', 'Početna', 'home'], ['/sectors', 'Sektori', 'grid'], ['/my-comments', 'Komentari', 'message']],
  employee: [['/', 'Početna', 'home'], ['/projects', 'Projekti', 'folder'], ['/ideas', 'Moje ideje', 'bulb'], ['/notifications', 'Obaveštenja', 'bell']],
  manager: [['/', 'Početna', 'home'], ['/projects', 'Projekti', 'folder'], ['/reports', 'Izveštaji', 'chart'], ['/ideas', 'Ideje', 'bulb']]
};
export function isWorkspaceLinkActive(pathname, to) {
  return pathname === to || (to !== '/' && pathname.startsWith(to + '/')) || (to === '/projects' && pathname.startsWith('/activities/'));
}
