import {fail} from './errors.js';
import {User} from '../models/index.js';

export async function managerNotificationFilter(user,category='all') {
 if(user.role!=='manager'||!user.sector)fail(403,'Pregled je namenjen rukovodiocu sa sektorom.');
 if(typeof category!=='string'||!['all','president','employees','projects','ideas'].includes(category))fail(422,'Nepoznata kategorija obaveštenja.');
 const filter={user:user._id};
 if(['president','employees'].includes(category)){
  const people=await User.find({role:category==='president'?'president':'employee'}).select('_id');
  filter.actor={$in:people.map(person=>person._id)};filter.type={$in:['comment','instruction']};
 }
 if(category==='projects'){filter.link=/^\/(projects|activities)\//;filter.type={$nin:['comment','instruction']};}
 if(category==='ideas')filter.link=/^\/ideas\//;
 return filter;
}

// Existing notification records carry a type and a local resource link.
// Instructions created before this UI use type=comment and this exact system title.
export function notificationFilter(userId, category = 'all') {
  const filters = {
    all: {}, tasks: {link: /^\/(activities|assignments)\//},
    projects: {link: /^\/projects\//}, ideas: {link: /^\/ideas\//},
    guidance: {$or: [{type: 'instruction'}, {type: 'comment', title: 'Nova instrukcija'}]}
  };
  if (typeof category !== 'string' || !Object.hasOwn(filters, category)) fail(422, 'Nepoznata kategorija obaveštenja.');
  return {user: userId, ...filters[category]};
}
