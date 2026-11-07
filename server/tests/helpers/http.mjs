import express from 'express';
import {once} from 'node:events';
import {errorHandler} from '../../src/lib/errors.js';

export async function withRoutes(user, routes, run) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {req.user = user; next();});
  for (const [prefix, router] of routes) app.use(prefix, router);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {await run(`http://127.0.0.1:${server.address().port}`);}
  finally {await new Promise(resolve => server.close(resolve));}
}
export const query = result => {
  const q = {then: (ok, fail) => Promise.resolve(result).then(ok, fail), lean: async () => result};
  for (const method of ['select', 'sort', 'skip', 'limit', 'populate']) q[method] = () => q;
  return q;
};
