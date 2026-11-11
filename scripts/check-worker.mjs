import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import worker from '../dist/server/index.js';
for (const path of ['/', '/faculty/adisak-intana/']) {
  const response = await worker.fetch(new Request('https://example.test' + path), {});
  assert.equal(response.status, 200);
  assert(gunzipSync(Buffer.from(await response.arrayBuffer())).toString().includes('<html'));
}
assert.equal((await worker.fetch(new Request('https://example.test/no-such-page'), {})).status, 404);
assert.equal((await worker.fetch(new Request('https://example.test/api/visitors'), {})).status, 503);
assert.equal((await worker.fetch(new Request('https://example.test/', { method: 'HEAD' }), {})).body, null);
console.log('Worker routes, compressed assets, HEAD, and missing-database fallback passed.');
