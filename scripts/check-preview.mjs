import assert from "node:assert/strict";

const origin = process.argv[2] || "http://localhost:3000";
const response = await fetch(origin);
assert.equal(response.status, 200);
const html = await response.text();
assert(html.includes("ผลงานทางวิชาการของอาจารย์"));
assert(html.includes("234"));
const assets = [...new Set([...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map(match => match[1]))];
assert(assets.length > 0);
await Promise.all(assets.map(async path => {
  const asset = await fetch(new URL(path, origin));
  assert.equal(asset.status, 200, path);
}));
assert.equal((await fetch(new URL("/missing-page/", origin))).status, 404);
console.log(`PASS: page, initial metrics, ${assets.length} JS/CSS assets, 404 route`);
