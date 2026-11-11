import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { handleVisitors } from './visitors.mjs';

let database;
function store() {
  if (!database) {
    mkdirSync('.runtime', { recursive: true });
    database = new DatabaseSync('.runtime/visitors.sqlite');
    database.exec(readFileSync(new URL('../drizzle/0000_visitors.sql', import.meta.url), 'utf8'));
  }
  return {
    record(id) { database.prepare('INSERT OR IGNORE INTO visitor_browsers (id) VALUES (?)').run(id); },
    count() { return database.prepare('SELECT COUNT(*) AS total FROM visitor_browsers').get().total; },
  };
}
const persistentStore = store();
export async function localVisitors(req, res) {
  if (new URL(req.url, 'http://localhost').pathname !== '/api/visitors') return false;
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 256) { res.writeHead(413).end(); return true; } }
    const origin = `http://${req.headers.host}`;
    const response = await handleVisitors(new Request(origin + req.url, { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body } : {}) }), persistentStore);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text());
  } catch { res.writeHead(503, { 'Cache-Control': 'no-store' }).end(); }
  return true;
}
