import {Project, Activity, Sector, Idea, User, Comment, Notification, Attachment} from '../models/index.js';
import {fail} from '../lib/errors.js';
import {belgradeDay, safePage} from '../lib/utils.js';

const active = ['active', 'at_risk', 'on_hold'];
const open = ['planned', ...active];
const statuses = ['planned', ...active, 'completed', 'cancelled'];
const ref = value => String(value?._id || value);
export function managerDayStart(now = new Date()) {
  const utc = new Date(belgradeDay(now) + 'T00:00:00Z');
  const offsetHours = Number(new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Belgrade', hour: '2-digit', hourCycle: 'h23'}).format(utc));
  return new Date(utc.getTime() - offsetHours * 3600000);
}
const pageOf = query => {const value = safePage(query); value.page = Math.floor(value.page); value.limit = Math.floor(value.limit); value.skip = (value.page - 1) * value.limit; return value;};
export function managerScope(user) {
  if (user.role !== 'manager' || !user.sector) fail(403, 'Pregled zahteva rukovodioca sa dodeljenim sektorom.');
  return {sector: user.sector, archived: false};
}
async function sectorFor(user) {
  const sector = await Sector.findById(user.sector).select('_id name').lean();
  if (!sector) fail(403, 'Dodeljeni sektor nije dostupan.');
  return sector;
}
async function projectCounts(base) {
  const values = await Promise.all(statuses.map(status => Project.countDocuments({...base, status})));
  const byStatus = Object.fromEntries(statuses.map((status, i) => [status, values[i]]));
  return {totalProjects: values.reduce((a, b) => a + b, 0), activeProjects: active.reduce((n, status) => n + byStatus[status], 0), atRiskProjects: byStatus.at_risk, byStatus};
}
const problemActivity = today => ({status: {$ne: 'completed'}, $or: [{status: 'blocked'}, {dueDate: {$lt: today}}]});
function attentionFilter(base, today, problemIds) {
  return {...base, status: {$in: open}, $or: [{status: 'at_risk'}, {dueDate: {$lt: today}}, {_id: {$in: problemIds}}]};
}
async function cards(filter, {skip = 0, limit = 8, order = {updatedAt: -1, _id: -1}, today}) {
  const projects = await Project.find(filter).select('title status progress dueDate sector owner members').populate('owner', 'firstName lastName jobTitle').sort(order).skip(skip).limit(limit).lean();
  if (!projects.length) return [];
  const ids = projects.map(p => p._id);
  const [activities, images] = await Promise.all([
    Activity.find({sector: filter.sector, project: {$in: ids}}).select('project status dueDate').lean(),
    Attachment.find({targetType: 'project', targetId: {$in: ids}, mime: {$in: ['image/png', 'image/jpeg', 'image/webp']}}).select('_id targetId').sort({createdAt: -1, _id: -1}).lean()
  ]);
  return projects.map(project => {
    const work = activities.filter(a => ref(a.project) === ref(project));
    const delayed = work.filter(a => a.status !== 'completed' && a.dueDate && new Date(a.dueDate) < today).length;
    const blocked = work.some(a => a.status === 'blocked');
    const {members, ...fields} = project;
    return {...fields, memberCount: members?.length || 0, activityCount: work.length, delayedActivities: delayed,
      hasReview: work.some(a => a.status === 'review'),
      onTrack: project.status === 'active' && (!project.dueDate || new Date(project.dueDate) >= today) && !delayed && !blocked,
      thumbnailId: images.find(a => ref(a.targetId) === ref(project))?._id || null};
  });
}
export async function managerProjects(user, query = {}, now = new Date()) {
  const base = managerScope(user), today = managerDayStart(now);
  const tab = query.tab || 'all', sort = query.sort || 'updated';
  if (!['all', 'active', 'review', 'on_track', 'attention', ...statuses].includes(tab)) fail(422, 'Nepoznat filter projekata sektora.');
  if (!['updated', 'due', 'title'].includes(sort)) fail(422, 'Nepoznat redosled projekata.');
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 160)) fail(422, 'Pretraga može imati najviše 160 znakova.');
  const filter = {...base};
  if (statuses.includes(tab)) filter.status = tab;
  if (tab === 'active') filter.status = {$in: active};
  if (['review', 'on_track', 'attention'].includes(tab)) {
    const ids = await Project.distinct('_id', base);
    if (tab === 'review') {
      filter._id = {$in: await Activity.distinct('project', {sector: user.sector, project: {$in: ids}, status: 'review'})};
      filter.status = {$in: open};
    } else {
      const problems = await Activity.distinct('project', {sector: user.sector, project: {$in: ids}, ...problemActivity(today)});
      if (tab === 'attention') Object.assign(filter, attentionFilter(base, today, problems));
      else {filter.status = 'active'; filter._id = {$nin: problems}; filter.$or = [{dueDate: null}, {dueDate: {$gte: today}}];}
    }
  }
  if (query.q?.trim()) filter.title = {$regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i'};
  const pagination = pageOf(query);
  const order = sort === 'title' ? {title: 1, _id: 1} : sort === 'due' ? {dueDate: 1, _id: 1} : {updatedAt: -1, _id: -1};
  const [items, total, stats, sector] = await Promise.all([cards(filter, {...pagination, order, today}), Project.countDocuments(filter), projectCounts(base), sectorFor(user)]);
  return {items, total, page: pagination.page, limit: pagination.limit, stats, sector};
}
const commentLink = comment => `/${({sector: 'sectors', project: 'projects', activity: 'activities', idea: 'ideas'})[comment.targetType]}/${comment.targetId}`;
export async function managerOverview(user, query = {}, now = new Date()) {
  const base = managerScope(user), today = managerDayStart(now);
  const [sector, stats, projectIds, ideaIds, presidents] = await Promise.all([
    sectorFor(user), projectCounts(base), Project.distinct('_id', base), Idea.distinct('_id', {sector: user.sector}), User.find({role: 'president', approval: 'approved'}).select('_id').lean()
  ]);
  const activityScope = {sector: user.sector, project: {$in: projectIds}};
  const [activityIds, openProjectIds] = await Promise.all([Activity.distinct('_id', activityScope), Project.distinct('_id', {...base, status: {$in: open}})]);
  const liveActivities = {sector: user.sector, project: {$in: openProjectIds}};
  const problems = await Activity.distinct('project', {...liveActivities, ...problemActivity(today)});
  const attention = attentionFilter(base, today, problems);
  const late = {...liveActivities, status: {$ne: 'completed'}, dueDate: {$lt: today}};
  const targets = [{targetType: 'sector', targetId: user.sector}, {targetType: 'project', targetId: {$in: projectIds}}, {targetType: 'activity', targetId: {$in: activityIds}}, {targetType: 'idea', targetId: {$in: ideaIds}}];
  const leadership = {author: {$in: presidents.map(p => p._id)}, $or: targets};
  const visibleLinks = [`/sectors/${user.sector}`, ...projectIds.map(id => `/projects/${id}`), ...activityIds.map(id => `/activities/${id}`), ...ideaIds.map(id => `/ideas/${id}`)];
  const awaiting = {sector: user.sector, status: {$in: ['submitted', 'in_review']}};
  const activityPage = pageOf({page: query.activityPage, limit: 6}), commentPage = pageOf({page: query.commentPage, limit: 6});
  const [delayedActivities, activities, newIdeas, ideas, sectorComment, comments, totalComments, unreadComments, attentionProjects, attentionTotal] = await Promise.all([
    Activity.countDocuments(late), Activity.find(late).select('title project dueDate status').populate('project', 'title').sort({dueDate: 1, _id: 1}).skip(activityPage.skip).limit(activityPage.limit).lean(),
    Idea.countDocuments(awaiting), Idea.find(awaiting).select('title status author').populate('author', 'firstName lastName').sort({createdAt: 1, _id: 1}).limit(3).lean(),
    Comment.findOne({author: leadership.author, targetType: 'sector', targetId: user.sector}).sort({createdAt: -1, _id: -1}).populate('author', 'firstName lastName role').lean(),
    Comment.find(leadership).sort({createdAt: -1, _id: -1}).skip(commentPage.skip).limit(commentPage.limit).populate('author', 'firstName lastName role').lean(), Comment.countDocuments(leadership),
    Notification.countDocuments({user: user._id, type: 'comment', actor: {$in: presidents.map(p => p._id)}, readAt: null, link: {$in: visibleLinks}}),
    cards(attention, {limit: 3, order: {dueDate: 1, _id: 1}, today}), Project.countDocuments(attention)
  ]);
  return {sector, today: belgradeDay(now), stats: {...stats, delayedActivities, newIdeas, unreadPresidentComments: unreadComments}, sectorComment,
    presidentComments: {items: comments.map(c => ({...c, link: commentLink(c)})), total: totalComments, page: commentPage.page, limit: commentPage.limit},
    delayed: {items: activities, total: delayedActivities, page: activityPage.page, limit: activityPage.limit},
    attentionProjects, attentionTotal, ideas};
}
