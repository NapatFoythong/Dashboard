import assert from 'node:assert/strict';
const origin = process.argv[2] || 'http://127.0.0.1:3100';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Local counter checks only');
const id = crypto.randomUUID();
const record = async identifier => {
  const response = await fetch(origin + '/api/visitors', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: identifier }) });
  assert.equal(response.status, 200);
  return response.json();
};
const first = await record(id), repeat = await record(id), second = await record(crypto.randomUUID());
assert.equal(first.total, repeat.total);
assert.equal(second.total, first.total + 1);
console.log('Live local counter deduplicates repeated browsers and counts new browsers.');
