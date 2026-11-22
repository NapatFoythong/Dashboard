import assets from './assets.js';
import { handleVisitors, d1Store } from './visitors.mjs';

const PROGRAMMES = new Set(['AISE', 'DE', 'COMP', 'Dbiz']);
const PUBLICATION_TYPES = new Set(['International Journal Articles', 'International Proceedings', 'National Journal Articles', 'National Proceedings']);

function authorized(request, env) {
  const secret = env.STAFF_API_TOKEN || '';
  const provided = request.headers.get('Authorization') || '';
  if (!secret || !provided.startsWith('Bearer ')) return false;
  const candidate = provided.slice(7);
  if (candidate.length !== secret.length) return false;
  let difference = 0;
  for (let i = 0; i < secret.length; i++) difference |= secret.charCodeAt(i) ^ candidate.charCodeAt(i);
  return difference === 0;
}

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function readPublications(db) {
  const [added, hidden, programmes] = await Promise.all([
    db.prepare('SELECT id, name, type, detail, year, month, index_name AS "index", psu FROM staff_publications ORDER BY created_at, id').all(),
    db.prepare('SELECT id FROM hidden_publications').all(),
    db.prepare('SELECT faculty_name, programmes_json FROM staff_programmes').all(),
  ]);
  return {
    added: added.results || [],
    hidden: (hidden.results || []).map(row => row.id),
    programmes: Object.fromEntries((programmes.results || []).map(row => {
      try { return [row.faculty_name, JSON.parse(row.programmes_json)]; }
      catch { return [row.faculty_name, []]; }
    })),
  };
}

async function handleStaff(request, env, url) {
  if (!env.DB) return json({ detail: 'D1 database is not configured' }, 503);
  if (!authorized(request, env)) return json({ detail: 'Unauthorized' }, 401);

  if (request.method === 'POST' && url.pathname === '/api/staff/publications') {
    let body;
    const text = await request.text();
    if (text.length > 64 * 1024) return json({ detail: 'Request is too large' }, 413);
    try { body = JSON.parse(text); } catch { return json({ detail: 'Invalid JSON' }, 400); }
    const programmeAssignments = body?.programmes ?? {};
    const authorNames = new Set(Array.isArray(body?.authors) ? body.authors.map(name => typeof name === 'string' ? name.trim() : '') : []);
    const validProgrammeAssignments = programmeAssignments && typeof programmeAssignments === 'object' && !Array.isArray(programmeAssignments)
      && Object.keys(programmeAssignments).length === authorNames.size
      && Object.entries(programmeAssignments).length <= 30
      && Object.entries(programmeAssignments).every(([name, programmes]) => typeof name === 'string' && authorNames.has(name.trim())
        && Array.isArray(programmes) && programmes.length > 0 && programmes.length <= PROGRAMMES.size
        && programmes.every(programme => PROGRAMMES.has(programme)) && new Set(programmes).size === programmes.length);
    if (!body || !Array.isArray(body.authors) || body.authors.length < 1 || body.authors.length > 30
      || body.authors.some(name => typeof name !== 'string' || name.trim().length < 2 || name.length > 160)
      || typeof body.detail !== 'string' || body.detail.trim().length < 5 || body.detail.length > 5000
      || !PUBLICATION_TYPES.has(body.type)
      || !Number.isInteger(body.year) || body.year < 1900 || body.year > 2200
      || !Number.isInteger(body.month) || body.month < 1 || body.month > 12
      || typeof body.index !== 'string' || body.index.length > 160
      || !['', 'Y', 'N'].includes(body.psu)
      || new Set(body.authors.map(name => name.trim())).size !== body.authors.length
      || !validProgrammeAssignments) {
      return json({ detail: 'Invalid publication fields' }, 400);
    }
    const ids = body.authors.map(() => crypto.randomUUID());
    const statements = body.authors.map((name, index) => env.DB.prepare(
      'INSERT INTO staff_publications (id, name, type, detail, year, month, index_name, psu) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(ids[index], name.trim(), body.type, body.detail.trim(), body.year, body.month, body.index.trim(), body.psu));
    for (const [facultyName, programmes] of Object.entries(programmeAssignments)) {
      statements.push(env.DB.prepare(`INSERT INTO staff_programmes (faculty_name, programmes_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(faculty_name) DO UPDATE SET programmes_json = excluded.programmes_json, updated_at = CURRENT_TIMESTAMP`)
        .bind(facultyName.trim(), JSON.stringify(programmes)));
    }
    await env.DB.batch(statements);
    return json({ ids }, 201);
  }

  if (request.method === 'DELETE' && url.pathname.startsWith('/api/staff/publications/')) {
    let id;
    try { id = decodeURIComponent(url.pathname.slice('/api/staff/publications/'.length)); } catch { return json({ detail: 'Invalid id' }, 400); }
    if (!/^(?:source-[a-f0-9-]{18,80}|[0-9a-f-]{36})$/i.test(id)) return json({ detail: 'Invalid id' }, 400);
    if (id.startsWith('source-')) {
      await env.DB.prepare('INSERT OR IGNORE INTO hidden_publications (id) VALUES (?)').bind(id).run();
    } else {
      await env.DB.prepare('DELETE FROM staff_publications WHERE id = ?').bind(id).run();
    }
    return json({ ok: true });
  }

  if (request.method === 'PUT' && url.pathname.startsWith('/api/staff/publications/') && url.pathname.endsWith('/restore')) {
    let id;
    try { id = decodeURIComponent(url.pathname.slice('/api/staff/publications/'.length, -'/restore'.length)); } catch { return json({ detail: 'Invalid id' }, 400); }
    if (!/^source-[a-f0-9-]{18,80}$/i.test(id)) return json({ detail: 'Invalid id' }, 400);
    await env.DB.prepare('DELETE FROM hidden_publications WHERE id = ?').bind(id).run();
    return json({ ok: true });
  }

  if (request.method === 'PUT' && url.pathname === '/api/staff/programmes') {
    let body;
    const text = await request.text();
    if (text.length > 64 * 1024) return json({ detail: 'Request is too large' }, 413);
    try { body = JSON.parse(text); } catch { return json({ detail: 'Invalid JSON' }, 400); }
    if (!body || typeof body.faculty !== 'string' || body.faculty.trim().length < 2 || body.faculty.length > 160
      || !Array.isArray(body.programmes) || body.programmes.length > PROGRAMMES.size
      || body.programmes.some(programme => !PROGRAMMES.has(programme))
      || new Set(body.programmes).size !== body.programmes.length) return json({ detail: 'Invalid programme mapping' }, 400);
    await env.DB.prepare(`INSERT INTO staff_programmes (faculty_name, programmes_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(faculty_name) DO UPDATE SET programmes_json = excluded.programmes_json, updated_at = CURRENT_TIMESTAMP`)
      .bind(body.faculty.trim(), JSON.stringify(body.programmes)).run();
    return json({ ok: true });
  }

  return json({ detail: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/publications' && request.method === 'GET') {
      try { return json(await readPublications(env.DB)); }
      catch { return json({ detail: 'Publication data unavailable' }, 503); }
    }
    if (url.pathname.startsWith('/api/staff/')) {
      if (!['POST', 'PUT', 'DELETE'].includes(request.method)) return json({ detail: 'Method not allowed' }, 405);
      if (Number(request.headers.get('Content-Length') || 0) > 64 * 1024) return json({ detail: 'Request is too large' }, 413);
      try { return await handleStaff(request, env, url); }
      catch { return json({ detail: 'Staff data operation failed' }, 503); }
    }
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
