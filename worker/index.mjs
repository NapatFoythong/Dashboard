import assets from './assets.js';
import { handleVisitors, d1Store } from './visitors.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/visitors') {
      try { return await handleVisitors(request, d1Store(env.DB)); }
      catch { return Response.json({ error: 'Counter unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return new Response('Bad request', { status: 400 }); }
    if (path.endsWith('/')) path += 'index.html';
    if (!assets[path] && assets[path + '/index.html']) return Response.redirect(url.origin + url.pathname + '/' + url.search, 308);
    const asset = assets[path] || assets['/404.html'];
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, { status: assets[path] ? 200 : 404, headers: { 'Content-Type': asset.type, 'Content-Encoding': 'gzip', 'Cache-Control': path.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : 'no-cache' } });
  }
};
