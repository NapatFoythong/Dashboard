export async function handleVisitors(request, store) {
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
  const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return reply({ error: 'Invalid origin' }, 403);
    if (Number(request.headers.get('Content-Length') || 0) > 256) return reply({ error: 'Too large' }, 413);
    let body;
    try { body = await request.text(); if (body.length > 256) return reply({ error: 'Too large' }, 413); body = JSON.parse(body); } catch { return reply({ error: 'Invalid JSON' }, 400); }
    if (typeof body?.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) return reply({ error: 'Invalid identifier' }, 400);
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.id));
    const hash = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
    await store.record(hash);
  }
  return reply({ total: await store.count() });
}

export function d1Store(db) {
  return {
    async record(id) { await db.prepare('INSERT OR IGNORE INTO visitor_browsers (id) VALUES (?)').bind(id).run(); },
    async count() { return Number((await db.prepare('SELECT COUNT(*) AS total FROM visitor_browsers').first()).total); },
  };
}
