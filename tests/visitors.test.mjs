import assert from 'node:assert/strict';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleVisitors, d1Store } from '../server/visitors.mjs';

test('visitor API persists unique browsers, rejects invalid posts, and handles concurrent repeats', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('drizzle/0000_visitors.sql', 'utf8'));
  const binding = { prepare(sql) { let args = []; return { bind(...values) { args = values; return this; }, async run() { return db.prepare(sql).run(...args); }, async first() { return db.prepare(sql).get(...args); } }; } };
  const store = d1Store(binding), origin = 'https://example.test';
  const post = (id, headers = {}) => handleVisitors(new Request(origin + '/api/visitors', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ id }) }), store);
  const id = crypto.randomUUID();
  assert.equal((await (await post(id)).json()).total, 1);
  await Promise.all(Array.from({ length: 10 }, () => post(id)));
  assert.equal(await store.count(), 1);
  assert.equal((await (await post(crypto.randomUUID())).json()).total, 2);
  assert.equal((await post('invalid')).status, 400);
  assert.equal((await post(crypto.randomUUID(), { Origin: 'https://other.test' })).status, 403);
  assert.equal((await handleVisitors(new Request(origin + '/api/visitors', { method: 'DELETE' }), store)).status, 405);
  assert.equal((await (await handleVisitors(new Request(origin + '/api/visitors'), store)).json()).total, 2);
  assert(!db.prepare('SELECT id FROM visitor_browsers LIMIT 1').get().id.includes('-'), 'Only hashed identifiers are stored');
  db.close();
});
