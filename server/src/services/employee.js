import {Project, Activity, Comment, Idea, User, Sector, Attachment, Notification} from '../models/index.js';
import {belgradeDay, periodRange, safePage} from '../lib/utils.js';
import {fail} from '../lib/errors.js';

export function employeeProjectsFilter(user) {
  if (!user.sector) fail(403, 'Nalog zaposlenog nema dodeljen sektor.');
  return {sector: user.sector, archived: false, $or: [{members: user._id}, {owner: user._id}]};
}
export function employeeActivitiesFilter(user, projectIds) {
  return {sector: user.sector, project: {$in: projectIds}, assignees: user._id};
}
export function employeeCommentTargets(user, projectIds, activityIds, ideaIds) {
  return [
    {targetType: 'project', targetId: {$in: projectIds}},
    {targetType: 'activity', targetId: {$in: activityIds}},
    {targetType: 'idea', targetId: {$in: ideaIds}},
    {targetType: 'sector', targetId: user.sector}
  ];
}
const activeStatuses = ['active', 'at_risk', 'on_hold'];
const openStatuses = ['planned', ...activeStatuses];
const id = value => String(value?._id || value);
function pagination(query) {
  const result = safePage(query);
  result.page = Math.floor(result.page);
  result.limit = Math.floor(result.limit);
  result.skip = (result.page - 1) * result.limit;
  return result;
}

export async function employeeProjects(user, query = {}, now = new Date()) {
  const {limit, skip, page} = pagination(query);
  const tab = query.tab || 'all', sort = query.sort || 'updated';
  if (!['all', 'active', 'review', 'completed'].includes(tab)) fail(422, 'Nepoznat filter projekata.');
  if (!['updated', 'due', 'title'].includes(sort)) fail(422, 'Nepoznat redosled projekata.');
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 160)) fail(422, 'Pretraga može imati najviše 160 znakova.');
  const base = employeeProjectsFilter(user), filter = {...base};
  if (tab === 'active') filter.status = {$in: activeStatuses};
  if (tab === 'completed') filter.status = 'completed';
  if (query.q?.trim()) filter.title = {$regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i'};
  if (tab === 'review') {
    const projectIds = await Project.distinct('_id', base);
    filter._id = {$in: await Activity.distinct('project', {
      ...employeeActivitiesFilter(user, projectIds), status: 'review'
    })};
    filter.status = {$in: openStatuses};
  }
  const {start, end} = periodRange('weekly', belgradeDay(now));
  const dueFilter = {status: {$in: openStatuses}, dueDate: {$gte: new Date(start + 'T00:00:00Z'), $lt: new Date(new Date(end + 'T00:00:00Z').getTime() + 86400000)}};
  const order = sort === 'title' ? {title: 1, _id: 1} : sort === 'due' ? {dueDate: 1, _id: 1} : {updatedAt: -1, _id: -1};
  const [items, total, activeProjects, dueThisWeek, sector] = await Promise.all([
    Project.find(filter).select('title status progress dueDate sector').sort(order).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
    Project.countDocuments({...base, status: {$in: activeStatuses}}),
    Project.countDocuments({...base, ...dueFilter}),
    Sector.findById(user.sector).select('name').lean()
  ]);
  const ids = items.map(p => p._id);
  const [activities, images] = await Promise.all([
    Activity.find(employeeActivitiesFilter(user, ids)).select('title project status progress dueDate').sort({createdAt: 1}).lean(),
    Attachment.find({targetType: 'project', targetId: {$in: ids}, mime: {$in: ['image/png', 'image/jpeg', 'image/webp']}})
      .select('targetId').sort({createdAt: -1}).lean()
  ]);
  return {
    items: items.map(project => ({...project,
      myActivities: activities.filter(a => id(a.project) === id(project)),
      thumbnailId: images.find(a => id(a.targetId) === id(project))?._id || null
    })),
    total, page, limit, sectorName: sector?.name || '', stats: {activeProjects, dueThisWeek}
  };
}

export async function employeeOverview(user, query = {}, now = new Date()) {
  const today = belgradeDay(now);
  const {page, skip} = pagination({page: query.activityPage, limit: 6});
  const [projects, ideas, leaders, recentProjects] = await Promise.all([
    Project.find(employeeProjectsFilter(user)).select('title status dueDate').lean(),
    Idea.find({author: user._id, sector: user.sector}).select('title').lean(),
    User.find({approval: 'approved', $or: [{role: 'president'}, {role: 'manager', sector: user.sector}]}).select('_id').lean(),
    employeeProjects(user, {limit: 2}, now)
  ]);
  const projectIds = projects.map(p => p._id);
  const openProjectIds = projects.filter(p => openStatuses.includes(p.status)).map(p => p._id);
  const allActivityFilter = employeeActivitiesFilter(user, projectIds);
  const openActivityFilter = {...employeeActivitiesFilter(user, openProjectIds), status: {$ne: 'completed'}};
  const activityIds = await Activity.distinct('_id', allActivityFilter);
  const targetFilter = {$or: employeeCommentTargets(user, projectIds, activityIds, ideas.map(i => i._id))};
  const leadershipFilter = {...targetFilter, author: {$in: leaders.map(u => u._id)}};
  const [activities, activityCount, attentionActivities, latestComments, instructions, unread, unreadComments] = await Promise.all([
    Activity.find(openActivityFilter).select('title project status progress dueDate blockers nextStep').sort({dueDate: 1, _id: 1}).skip(skip).limit(6).lean(),
    Activity.countDocuments(openActivityFilter),
    Activity.find({...openActivityFilter, $or: [{status: 'blocked'}, {dueDate: {$lt: new Date(today + 'T23:59:59.999Z')}}]})
      .select('title project status dueDate blockers nextStep').sort({dueDate: 1, _id: 1}).limit(3).lean(),
    Comment.find(leadershipFilter).populate('author', 'firstName lastName role').sort({createdAt: -1, _id: -1}).limit(2).lean(),
    // A project-wide instruction or a direct instruction is actionable for this employee.
    Comment.find({$and: [leadershipFilter, {$or: [{addressedTo: user._id}, {addressedTo: {$size: 0}}]}], kind: 'instruction', responseStatus: 'open'})
      .populate('author', 'firstName lastName role').sort({createdAt: -1, _id: -1}).limit(3).lean(),
    Notification.countDocuments({user: user._id, readAt: null}),
    Notification.countDocuments({user: user._id, readAt: null, type: 'comment', actor: {$in: leaders.map(u => u._id)}})
  ]);
  const projectMap = new Map(projects.map(p => [id(p), p]));
  // Resolve names only inside the employee's authorized target set.
  const namedActivities = await Activity.find({...allActivityFilter, _id: {$in: [...latestComments, ...instructions].filter(c => c.targetType === 'activity').map(c => c.targetId)}}).select('title project').lean();
  const names = {
    project: projectMap,
    activity: new Map(namedActivities.map(a => [id(a), a])),
    idea: new Map(ideas.map(i => [id(i), i]))
  };
  const routes = {project: 'projects', activity: 'activities', idea: 'ideas', sector: 'sectors'};
  const commentItem = c => ({
    _id: c._id, body: c.body, kind: c.kind, createdAt: c.createdAt, author: c.author,
    targetType: c.targetType, targetTitle: names[c.targetType]?.get(id(c.targetId))?.title || recentProjects.sectorName,
    link: `/${routes[c.targetType]}/${c.targetId}`
  });
  const attention = attentionActivities.map(a => {
    const instruction = instructions.find(c => c.targetType === 'activity' && id(c.targetId) === id(a));
    return {...a, projectTitle: projectMap.get(id(a.project))?.title || '', description: instruction?.body || a.blockers || a.nextStep || 'Proverite status aktivnosti i naredni korak.', link: `/activities/${a._id}`};
  });
  for (const instruction of instructions) {
    if (attention.some(a => a._id && instruction.targetType === 'activity' && id(a) === id(instruction.targetId))) continue;
    if (attention.length >= 3) break;
    const c = commentItem(instruction);
    attention.push({_id: c._id, title: c.targetTitle, description: c.body, status: 'instruction', link: c.link, projectTitle: 'Nova instrukcija'});
  }
  return {
    stats: {...recentProjects.stats, totalProjects: projects.length, pendingActivities: activityCount, unread, unreadComments},
    projects: recentProjects.items, sectorName: recentProjects.sectorName,
    attention, latestComments: latestComments.map(commentItem),
    activities: {items: activities.map(a => ({...a, projectTitle: projectMap.get(id(a.project))?.title || ''})), total: activityCount, page, limit: 6},
    today
  };
}
