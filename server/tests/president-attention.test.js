import test from 'node:test';
import assert from 'node:assert/strict';
import {Project,Activity,Sector,Comment,Assignment,DecisionRequest,Idea} from '../src/models/index.js';
import {presidentAttention,presidentOverview} from '../src/services/president.js';
const key=n=>n.toString(16).padStart(24,'0'),a=key(1),b=key(2),president={_id:key(3),role:'president'},now=new Date('2026-11-08T10:00Z'),past=new Date('2026-11-06T12:00Z'),future=new Date('2026-12-01T12:00Z');
const ref=value=>String(value?._id||value);
function matches(row,filter){return Object.entries(filter).every(([field,value])=>{
 if(field==='$and')return value.every(part=>matches(row,part));if(field==='$or')return value.some(part=>matches(row,part));const actual=row[field];
 if(value&&typeof value==='object'&&!(value instanceof Date)&&!value.toHexString){if('$in'in value)return value.$in.some(x=>ref(x)===ref(actual));if('$nin'in value)return !value.$nin.some(x=>ref(x)===ref(actual));if('$ne'in value)return ref(actual)!==ref(value.$ne);if('$lt'in value)return actual&&new Date(actual)<value.$lt;}
 return ref(actual)===ref(value);
});}
function fixture(t){
 const rows=new Map([[Sector,[{_id:a,name:'Marketing',active:true},{_id:b,name:'IT',active:true}]],
 [Project,[{_id:key(10),sector:a,title:'Rizik',status:'at_risk',archived:false,dueDate:past},{_id:key(11),sector:a,title:'Aktivan',status:'active',archived:false,dueDate:future},{_id:key(12),sector:a,title:'Zatvoren',status:'completed',archived:false,dueDate:past},{_id:key(13),sector:a,status:'active',archived:true},{_id:key(14),sector:b,title:'IT projekat',status:'active',archived:false,dueDate:future}]],
 [Activity,[{_id:key(20),sector:a,project:key(10),status:'blocked',dueDate:past},{_id:key(21),sector:a,project:key(11),title:'Kasni',status:'blocked',dueDate:past},{_id:key(22),sector:a,project:key(11),title:'Prepreka',status:'blocked',dueDate:future},{_id:key(23),sector:a,project:key(12),status:'blocked',dueDate:past},{_id:key(24),sector:a,project:key(11),status:'completed',dueDate:past}]],
 [DecisionRequest,[{_id:key(30),sector:a,title:'Odobrenje',status:'open',type:'approval'},{_id:key(31),sector:b,title:'Pitanje',status:'open',type:'question'},{_id:key(32),sector:a,status:'answered',type:'approval'}]],
 [Assignment,[{_id:key(40),sector:a,title:'Blokirano',status:'blocked'},{_id:key(41),sector:a,status:'new'}]],
 [Idea,[{_id:key(50),sector:a,title:'Prosleđena ideja',status:'forwarded'},{_id:key(51),sector:a,title:'Privatna ideja',status:'submitted'},{_id:key(52),sector:b,status:'approved'}]],
 [Comment,[{_id:key(60),targetType:'sector',targetId:a,body:'Instrukcija sektoru'},{_id:key(61),targetType:'project',targetId:key(14),body:'Instrukcija projektu'},{_id:key(62),targetType:'sector',targetId:a,author:key(9)},{_id:key(63),targetType:'sector',targetId:a,responseStatus:'open'},{_id:key(64),targetType:'sector',targetId:a,responseStatus:'resolved'},{_id:key(65),targetType:'idea',targetId:key(51)},{_id:key(66),targetType:'project',targetId:key(99)},{_id:key(67),targetType:'sector',targetId:a,kind:'comment'}].map(row=>({author:president._id,kind:'instruction',responseStatus:'answered',createdAt:past,updatedAt:now,...row}))]]);
 const q=value=>{
  let current=value;const query={then:(yes,no)=>Promise.resolve(current).then(yes,no),lean:async()=>current,select:()=>query,populate:()=>query,sort:order=>{if(Array.isArray(current))current=[...current].sort((x,y)=>{for(const [field,direction]of Object.entries(order)){if(x[field]>y[field])return direction;if(x[field]<y[field])return -direction;}return 0;});return query;},skip:n=>{current=current.slice(n);return query;},limit:n=>{current=current.slice(0,n);return query;}};return query;
 };
 const populate=row=>row?.sector?{...row,sector:{_id:row.sector,name:row.sector===a?'Marketing':'IT'}}:row;
 for(const [Model,data]of rows){
  t.mock.method(Model,'find',filter=>q(data.filter(row=>matches(row,filter)).map(populate)));
  t.mock.method(Model,'countDocuments',async filter=>data.filter(row=>matches(row,filter)).length);
  t.mock.method(Model,'distinct',async(field,filter)=>data.filter(row=>matches(row,filter)).map(row=>row[field]));
  t.mock.method(Model,'exists',async filter=>data.find(row=>matches(row,filter))||null);
  t.mock.method(Model,'aggregate',async pipeline=>{const values=data.filter(row=>matches(row,pipeline[0].$match)),groups=new Map();for(const row of values)groups.set(ref(row.sector),(groups.get(ref(row.sector))||0)+1);return [...groups].map(([_id,count])=>({_id,count}));});
 }
 return rows;
}
test('Global attention, categories and sector counts use the same eligible sources without duplicate project alarms',async t=>{
 fixture(t);const all=await presidentAttention(president,{limit:50},now);
 assert.equal(all.total,9);assert.deepEqual(all.stats,{all:9,approvals:1,deadlines:2,comments:2,ideas:1});
 assert.equal(new Set(all.items.map(item=>item.key)).size,9);assert.equal(all.items.some(item=>item.id===key(20)||item.id===key(23)),false);
 for(const item of all.items){assert.equal(item.link.includes('undefined'),false);assert.ok(item.sectorName);}
 const overview=await presidentOverview(president,{},now);assert.equal(overview.stats.attention,all.total);
 for(const sector of overview.sectors.items){const scoped=await presidentAttention(president,{sectorId:sector._id,limit:50},now);assert.equal(sector.attentionCount,scoped.total);}
});
test('Filters apply before pagination, while global scoped metrics remain stable across pages',async t=>{
 fixture(t);const pages=await Promise.all([1,2,3].map(page=>presidentAttention(president,{page,limit:4},now)));
 assert.deepEqual(pages.map(page=>page.items.length),[4,4,1]);assert.equal(new Set(pages.flatMap(page=>page.items.map(item=>item.key))).size,9);assert.deepEqual(pages[0].stats,pages[2].stats);
 const replies=await presidentAttention(president,{tab:'comments',sectorId:b},now);assert.equal(replies.total,1);assert.equal(replies.items[0].title,'IT projekat');assert.match(replies.items[0].link,/#president-project-comments$/);
 const deadlines=await presidentAttention(president,{tab:'deadlines'},now);assert.equal(deadlines.items.some(item=>item.title==='Prepreka'),false);
});
test('Only the president’s answered unresolved instructions count; resolving one updates home and sector totals',async t=>{
 const rows=fixture(t),all=await presidentAttention(president,{tab:'comments'},now);assert.deepEqual(all.items.map(row=>row.id),[key(60),key(61)]);
 rows.get(Comment)[0].responseStatus='resolved';const after=await presidentAttention(president,{},now);assert.equal(after.total,8);assert.equal(after.stats.comments,1);assert.equal((await presidentOverview(president,{},now)).stats.attention,8);
});
test('Attention rejects foreign roles, invalid categories and missing sector contexts',async t=>{
 fixture(t);for(const role of ['employee','manager','admin'])await assert.rejects(presidentAttention({...president,role},{},now),error=>error.status===403);
 await assert.rejects(presidentAttention(president,{tab:'fake'},now),error=>error.status===422);
 await assert.rejects(presidentAttention(president,{sectorId:'bad'},now),error=>error.status===400);
 await assert.rejects(presidentAttention(president,{sectorId:key(99)},now),error=>error.status===404);
});

test('Attention reuses repeated counts within one request and never caches them across requests',async t=>{
 const rows=fixture(t);await presidentAttention(president,{limit:50},now);
 const models=[Project,Activity,Comment,Assignment,DecisionRequest,Idea],calls=()=>models.reduce((sum,Model)=>sum+Model.countDocuments.mock.calls.length,0);
 assert.equal(calls(),8,'Six base counts plus approvals and delayed activities; project deadlines reuse the base count.');
 rows.get(DecisionRequest)[0].status='answered';const changed=await presidentAttention(president,{limit:50},now);assert.equal(calls(),16);assert.equal(changed.total,8);assert.equal(changed.stats.approvals,0);
});
test('Company overview derives attention totals from grouped sector counts without six extra count queries',async t=>{
 fixture(t);const result=await presidentOverview(president,{},now);assert.equal(result.stats.attention,9);assert.equal(result.sectors.items.reduce((sum,row)=>sum+row.attentionCount,0),9);
 for(const Model of [Activity,Comment,Assignment,DecisionRequest,Idea])assert.equal(Model.countDocuments.mock.calls.length,0);
 assert.equal(Project.countDocuments.mock.calls.length,1,'Only the separate active-project metric needs a count.');
});
