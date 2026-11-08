import {fail} from './errors.js';

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
