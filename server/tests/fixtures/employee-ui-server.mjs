// Explicit browser-test fixture. No MongoDB connection, no dotenv, no real accounts.
// Run from server/: ZEPTER_UI_FIXTURE=1 node tests/fixtures/employee-ui-server.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import express from 'express';
import {Server} from 'socket.io';

if (process.env.ZEPTER_UI_FIXTURE !== '1') throw Error('Set ZEPTER_UI_FIXTURE=1 to run this isolated test server.');
if (process.env.ZEPTER_UI_ROLE && !['employee','manager'].includes(process.env.ZEPTER_UI_ROLE)) throw Error('Fixture role must be employee or manager.');
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'zepter-ui-fixture-'));
process.env.UPLOAD_DIR = folder;
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
const models = await import('../../src/models/index.js');
const {attachSocket} = await import('../../src/services/events.js');
const {errorHandler} = await import('../../src/lib/errors.js');
const self = '111111111111111111111111', manager = '222222222222222222222222', sector = '333333333333333333333333';
const projectId = '444444444444444444444444', activityId = '555555555555555555555555', colleagueActivity = '666666666666666666666666';
const president = '777777777777777777777777', colleague = '888888888888888888888888';
const user = {_id: self, firstName: 'Test', lastName: 'Zaposleni', jobTitle: 'UI test', role: 'employee', approval: 'approved', sector};
const people = [user, {_id: manager, firstName: 'Test', lastName: 'Rukovodilac', role: 'manager', approval: 'approved', sector}, {_id: president, firstName: 'Test', lastName: 'Predsednik', role: 'president', approval: 'approved'}, {_id: colleague, firstName: 'Test', lastName: 'Kolega', role: 'employee', approval: 'approved', sector}];
const authUser = process.env.ZEPTER_UI_ROLE === 'manager' ? people.find(person => person.role === 'manager') : user;
const now = () => new Date();
const stores = Object.fromEntries(['User', 'Sector', 'Project', 'Activity', 'Comment', 'Attachment', 'WorkLog', 'Notification', 'Audit', 'Idea'].map(key => [key, new Map()]));
for (const p of people) stores.User.set(p._id, p);
stores.Sector.set(sector, {_id: sector, name: 'Test sektor', code: 'UI_TEST', active: true, manager});
stores.Project.set(projectId, {_id: projectId, title: 'Test projekat — web sajt', description: 'Izolovani podaci za proveru čuvanja, priloga i komentara. Ovaj projekat ne postoji u demo bazi.', status: 'active', progress: 80, priority: 'medium', sector, owner: manager, members: [self, manager, colleague], createdAt: now(), updatedAt: now(), dueDate: new Date('2026-12-15T12:00:00Z')});
stores.Activity.set(activityId, {_id: activityId, project: projectId, sector, title: 'Moja test aktivnost', description: 'Ova aktivnost sme da se menja u testu.', status: 'in_progress', progress: 60, assignees: [self], actualWork: 'Početni test unos.', nextStep: 'Provera mobilnog prikaza.', blockers: '', dueDate: new Date('2026-12-10T12:00:00Z'), createdAt: now(), updatedAt: now()});
stores.Activity.set(colleagueActivity, {_id: colleagueActivity, project: projectId, sector, title: 'Aktivnost kolege — samo pregled', description: '', status: 'completed', progress: 100, assignees: [colleague], actualWork: 'Završen posao kolege.', createdAt: now(), updatedAt: now()});
const parentId = '999999999999999999999999';
stores.Comment.set(parentId, {_id: parentId, targetType: 'activity', targetId: activityId, author: president, body: 'Molim proveru i novi pregled rezultata.', kind: 'instruction', responseStatus: 'open', addressedTo: [self], createdAt: now()});
stores.Comment.set('aaaaaaaaaaaaaaaaaaaaaaaa', {_id: 'aaaaaaaaaaaaaaaaaaaaaaaa', targetType: 'project', targetId: projectId, author: manager, body: 'Dodajte projektni komentar u okviru ovog testa.', kind: 'comment', responseStatus: 'open', addressedTo: [], createdAt: now()});

for (const [index, status] of ['submitted', 'in_review', 'revision_requested', 'forwarded'].entries()) {
 const id = ('b' + index).repeat(12);
 stores.Idea.set(id, {_id: id, title: ['Interna edukacija o proizvodima', 'Unapređenje onboarding procesa', 'AI pomoć za pripremu kampanja', 'Program lojalnosti kupaca'][index], description: 'Izolovani predlog za unapređenje rada i saradnje unutar kompanije. Podaci postoje samo u memoriji testnog servera.', benefit: 'Brži rad i bolja saradnja.', author: self, sector, status, reviewNote: status === 'revision_requested' ? 'Dopunite predlog očekivanim troškovima i planom primene.' : '', revisionCount: 0, createdAt: new Date(Date.now() - index * 86400000), updatedAt: now()});
}
// Public app icon used only as a private test attachment, never as a fake product photograph.
const preview = await fs.readFile(new URL('../../../client/public/icons/icon-192.png', import.meta.url));
await fs.writeFile(path.join(folder, 'fixture.png'), preview);
stores.Attachment.set('cccccccccccccccccccccccc', {_id: 'cccccccccccccccccccccccc', targetType: 'idea', targetId: 'b3'.repeat(12), owner: self, originalName: 'fixture.png', fileName: 'fixture.png', mime: 'image/png', size: preview.length, createdAt: now()});
stores.Comment.set('dddddddddddddddddddddddd', {_id:'dddddddddddddddddddddddd',targetType:'idea',targetId:'b2'.repeat(12),author:manager,body:'Molim da dopunite plan primene i okvirni budžet.',kind:'instruction',responseStatus:'open',addressedTo:[self],createdAt:new Date(Date.now()-3600000)});
const fixtureNotifications = [
 ['comment','Novi komentar na aktivnosti','Dodat je komentar uz vašu aktivnost.',`/activities/${activityId}`,null],
 ['idea_status','Ideja vraćena na doradu','Dopunite predlog planom primene.','/ideas/'+'b2'.repeat(12),null],
 ['activity_assigned','Novo zaduženje','Dodeljena vam je test aktivnost.',`/activities/${activityId}`,null],
 ['project_updated','Promena na projektu','Pogledajte novosti na projektu.',`/projects/${projectId}`,now()],
 ['comment','Nova instrukcija','Pripremite plan narednih koraka.','/ideas/'+'b2'.repeat(12),now()]
];
stores.Project.get(projectId).archived = false;
const sectorCommentId = 'ffffffffffffffffffffffff';
stores.Comment.set(sectorCommentId, {_id:sectorCommentId,targetType:'sector',targetId:sector,author:president,body:'Pripremite kratak pregled prioriteta sektora i narednih koraka.',kind:'instruction',responseStatus:'open',addressedTo:[manager],createdAt:now()});
stores.Notification.set('f1'.repeat(12), {_id:'f1'.repeat(12),user:manager,actor:president,type:'comment',title:'Nova instrukcija',body:'Novi prioriteti sektora.',link:'/sectors/'+sector,readAt:null,createdAt:now()});
if(authUser.role==='manager'){
 const yesterday=new Date(Date.now()-86400000*2);
 const extraProject=(id,fields)=>stores.Project.set(id,{_id:id,sector,archived:false,title:'Test projekat',status:'active',progress:40,owner:manager,members:[self,manager],createdAt:now(),updatedAt:now(),...fields});
 extraProject('f2'.repeat(12),{title:'Kampanja — potrebna pažnja',status:'at_risk',dueDate:yesterday});
 extraProject('f4'.repeat(12),{title:'Završen projekat — istorija',status:'completed',progress:100});
 extraProject('f6'.repeat(12),{title:'Tuđi sektor — nedostupno',sector:'f7'.repeat(12)});
 extraProject('f8'.repeat(12),{title:'Arhivirani projekat',archived:true});
 for(const [id,project] of [['f3'.repeat(12),'f2'.repeat(12)],['f5'.repeat(12),'f4'.repeat(12)]])stores.Activity.set(id,{_id:id,project,sector,title:'Test provere roka',status:'review',progress:80,assignees:[self],dueDate:yesterday,createdAt:now(),updatedAt:now()});
}
for (const [index,[type,title,body,link,readAt]] of fixtureNotifications.entries()) {
 const id=('e'+index).repeat(12);
 stores.Notification.set(id,{_id:id,user:self,actor:manager,type,title,body,link,readAt,createdAt:new Date(Date.now()-(index+1)*600000)});
}
const refId = value => String(value?._id || value);
function matches(row, filter = {}) {
  if (!row) return false;
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(part => matches(row, part));
    if (key === '$and') return value.every(part => matches(row, part));
    const current = row[key], values = Array.isArray(current) ? current : [current];
    if (value instanceof RegExp) return value.test(current || '');
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$in' in value) return values.some(v => value.$in.some(candidate => refId(candidate) === refId(v)));
      if ('$nin' in value) return values.every(v => !value.$nin.some(candidate => refId(candidate) === refId(v)));
      if ('$ne' in value) return value.$ne === null ? current != null : values.every(v => refId(v) !== refId(value.$ne));
      if ('$regex' in value) return new RegExp(value.$regex, value.$options || '').test(current || '');
      if ('$lt' in value) return current != null && new Date(current) < value.$lt;
      if ('$gte' in value) return current != null && new Date(current) >= value.$gte;
    }
    if (current instanceof Date || value instanceof Date) return +new Date(current) === +new Date(value);
    if (value === null) return current == null;
    return values.some(v => refId(v) === refId(value));
  });
}
function documentFor(name, raw) {
  if (!raw) return null;
  const doc = structuredClone(raw);
  const plain = () => Object.fromEntries(Object.entries(doc).filter(([, value]) => typeof value !== 'function'));
  const depopulate = data => {
    const copy = structuredClone(data);
    for (const key of ['owner', 'author', 'project', 'activity', 'user', 'parent', 'sector']) if (copy[key]?._id) copy[key] = copy[key]._id;
    for (const key of ['members', 'assignees', 'addressedTo']) if (Array.isArray(copy[key])) copy[key] = copy[key].map(refId);
    return copy;
  };
  doc.populate = async spec => {
    for (const item of Array.isArray(spec) ? spec : [spec]) {
      const key = typeof item === 'string' ? item : item.path;
      const source = ['project', 'activity'].includes(key) ? stores[key === 'project' ? 'Project' : 'Activity'] : key === 'sector' ? stores.Sector : stores.User;
      if (Array.isArray(doc[key])) doc[key] = doc[key].map(value => structuredClone(source.get(refId(value)) || value));
      else if (doc[key]) doc[key] = structuredClone(source.get(refId(doc[key])) || doc[key]);
    }
    return doc;
  };
  doc.save = async () => {doc.updatedAt = now(); stores[name].set(doc._id, depopulate(plain())); return doc;};
  doc.deleteOne = async () => stores[name].delete(doc._id);
  doc.toJSON = plain;
  return doc;
}
function query(name, raw, one = false) {
  let rows = one ? (raw ? [raw] : []) : raw;
  const populate = [];
  const result = async () => {
    const docs = rows.map(item => documentFor(name, item));
    for (const doc of docs) for (const spec of populate) await doc.populate(spec);
    return one ? docs[0] || null : docs;
  };
  const q = {select: () => q, populate: (...args) => {populate.push(args[0]); return q;}, lean: async () => JSON.parse(JSON.stringify(await result())), then: (ok, fail) => result().then(ok, fail),
    sort: order => {rows = [...rows].sort((a, b) => {for (const [key, dir] of Object.entries(order)) {if (a[key] > b[key]) return dir; if (a[key] < b[key]) return -dir;} return 0;}); return q;},
    skip: n => {rows = rows.slice(n); return q;}, limit: n => {rows = rows.slice(0, n); return q;}};
  return q;
}
let failUploadOnce = process.env.ZEPTER_UI_FAIL_UPLOAD_ONCE === '1';
for (const [name, store] of Object.entries(stores)) {
  const Model = models[name];
  Model.find = filter => query(name, [...store.values()].filter(row => matches(row, filter)));
  Model.findById = key => query(name, store.get(refId(key)), true);
  Model.findOne = filter => {const rows = [...store.values()].filter(row => matches(row,filter));const q=query(name,rows);const original=q.then;q.then=(ok,fail)=>original(value=>ok(value[0]||null),fail);q.lean=async()=>JSON.parse(JSON.stringify((await q)||null));return q;};
  Model.distinct = async (field,filter) => [...new Set([...store.values()].filter(row=>matches(row,filter)).flatMap(row=>Array.isArray(row[field])?row[field]:[row[field]]).filter(value=>value!==undefined).map(refId))];
  Model.countDocuments = async filter => [...store.values()].filter(row => matches(row, filter)).length;
  Model.create = async fields => {if (name === 'Attachment' && failUploadOnce) {failUploadOnce = false; throw Object.assign(new Error('Test: prvi upload nije uspeo. Pokušajte ponovo.'), {status: 503});} const raw = {_id: randomBytes(12).toString('hex'), createdAt: now(), updatedAt: now(), ...fields}; store.set(raw._id, raw); return documentFor(name, raw);};
  Model.updateOne = async (filter, patch) => {const row = [...store.values()].find(item => matches(item, filter)); if (row) Object.assign(row, patch.$set); return {modifiedCount: row ? 1 : 0};};
  Model.findOneAndUpdate = async (filter, patch) => {const row = [...store.values()].find(item => matches(item, filter)); if (!row) return null; Object.assign(row, patch.$set, {updatedAt: now()}); for(const [key,value] of Object.entries(patch.$inc||{}))row[key]=(row[key]||0)+value; return documentFor(name, row);};
  Model.updateMany = async (filter, patch) => {const rows = [...store.values()].filter(item => matches(item, filter)); for(const row of rows)Object.assign(row,patch.$set); return {modifiedCount:rows.length};};
}

const app = express(); app.use(express.json());
app.post('/api/auth/refresh', (_req, res) => res.json({user:authUser, accessToken: 'isolated-ui-fixture'}));
app.post('/api/auth/logout', (_req, res) => res.json({ok: true}));
app.use('/api', (req, _res, next) => {req.user = authUser; next();});
app.get('/api/sectors', (_req, res) => res.json({items: [...stores.Sector.values()]}));
for (const [prefix, file] of [['projects', 'projects'], ['activities', 'activities'], ['comments', 'comments'], ['attachments', 'attachments'], ['worklogs', 'worklogs'], ['ideas', 'ideas'], ['notifications','notifications'], ['dashboard','dashboard']]) {
  app.use('/api/' + prefix, (await import('../../src/routes/' + file + '.js')).default);
}
app.use('/api', (_req, res) => res.status(404).json({error: 'Fixture route not implemented'}));
app.use(async (req, res, next) => {
  try {
    const response = await fetch('http://localhost:5173' + req.originalUrl);
    res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'text/plain').send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {next(error);}
});
app.use(errorHandler);
const server = http.createServer(app), io = new Server(server);
io.on('connection', socket => {socket.join('user:' + authUser._id); socket.join('sector:' + sector);}); attachSocket(io);
await new Promise(resolve => server.listen(4002, '127.0.0.1', resolve));
console.log(`Isolated UI fixture: http://127.0.0.1:4002/projects/${projectId}`);
console.log('No MongoDB connection. Type stop to close and remove temporary files.');
let closing = false;
async function shutdown() {
  if (closing) return; closing = true;
  io.close(); if (server.listening) await new Promise(resolve => server.close(resolve));
  if (path.dirname(path.resolve(folder)) !== path.resolve(os.tmpdir()) || !path.basename(folder).startsWith('zepter-ui-fixture-')) throw Error('Unsafe fixture cleanup path');
  await fs.rm(folder, {recursive: true, force: true}); process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
process.stdin.setEncoding('utf8'); process.stdin.on('data', line => {if (line.trim() === 'stop') shutdown();});
