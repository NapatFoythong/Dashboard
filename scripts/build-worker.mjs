import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const assets = {};
function collect(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = `${directory}/${entry.name}`, path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) collect(name, path);
    else assets[path] = { type: types[extname(name)] || 'application/octet-stream', body: gzipSync(readFileSync(name)).toString('base64') };
  }
}
collect('out');
const source = 'export default ' + JSON.stringify(assets) + ';\n';
if (Buffer.byteLength(source) > 9 * 1024 * 1024) throw new Error('Embedded assets exceed Worker module budget');
mkdirSync('dist/server', { recursive: true });
writeFileSync('dist/server/assets.js', source);
copyFileSync('worker/index.mjs', 'dist/server/index.js');
copyFileSync('server/visitors.mjs', 'dist/server/visitors.mjs');
console.log(`Worker built: ${Object.keys(assets).length} assets, ${(Buffer.byteLength(source) / 1024 / 1024).toFixed(2)} MiB`);
