export const workspaceLinks = {
  president: [['/', 'Početna', 'home'], ['/sectors', 'Sektori', 'grid'], ['/ideas', 'Ideje', 'bulb'], ['/my-comments', 'Komentari', 'message']],
  employee: [['/', 'Početna', 'home'], ['/projects', 'Projekti', 'folder'], ['/ideas', 'Moje ideje', 'bulb'], ['/notifications', 'Obaveštenja', 'bell']],
  manager: [['/', 'Početna', 'home'], ['/projects', 'Projekti', 'folder'], ['/reports', 'Izveštaji', 'chart'], ['/ideas', 'Ideje', 'bulb']]
};
export function isWorkspaceLinkActive(pathname, to,role) {
  return pathname === to || (to !== '/' && pathname.startsWith(to + '/')) || (to === '/projects' && pathname.startsWith('/activities/')) || (role==='president'&&to==='/sectors'&&/^\/(projects|activities)(\/|$)/.test(pathname));
}
