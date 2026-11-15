import assets from './assets.js';
import { handleVisitors, d1Store } from './visitors.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/visitors') {
      try { return await handleVisitors(request, d1Store(env.DB)); }
      catch { return Response.json({ error: 'Counter unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    if (url.pathname === '/api/charts/trend' || url.pathname === '/api/charts/pie') {
      if (request.method !== 'POST') return Response.json({ detail: 'Method not allowed' }, { status: 405, headers: { 'Allow': 'POST', 'Cache-Control': 'no-store' } });
      if (!env.MATPLOTLIB_API) return Response.json({ detail: 'Matplotlib API is not configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      try {
        if (Number(request.headers.get('Content-Length') || 0) > 256 * 1024) return Response.json({ detail: 'Chart request is too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
        const body = await request.arrayBuffer();
        if (body.byteLength > 256 * 1024) return Response.json({ detail: 'Chart request is too large' }, { status: 413, headers: { 'Cache-Control': 'no-store' } });
        const base = env.MATPLOTLIB_API.replace(/\/$/, '');
        const target = new URL(url.pathname + url.search, base);
        const headers = new Headers({ 'Content-Type': 'application/json' });
        if (env.MATPLOTLIB_API_TOKEN) headers.set('Authorization', `Bearer ${env.MATPLOTLIB_API_TOKEN}`);
        return await fetch(new Request(target, { method: request.method, headers, body }));
      } catch {
        return Response.json({ detail: 'Matplotlib API unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
      }
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
