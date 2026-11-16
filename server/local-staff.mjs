const STAFF_API = process.env.LOCAL_STAFF_API_URL || 'http://127.0.0.1:8000';

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function localStaff(request, response) {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path !== '/api/publications' && !path.startsWith('/api/staff/')) return false;

  try {
    const headers = new Headers();
    for (const name of ['content-type', 'cookie', 'origin']) {
      if (request.headers[name]) headers.set(name, request.headers[name]);
    }
    headers.set('x-forwarded-host', request.headers.host || 'localhost:3000');
    headers.set('x-forwarded-proto', 'http');
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await readBody(request);
    const upstream = await fetch(new URL(request.url, STAFF_API), {
      method: request.method,
      headers,
      body: body?.length ? body : undefined,
      redirect: 'manual',
    });
    response.statusCode = upstream.status;
    for (const name of ['content-type', 'cache-control', 'set-cookie']) {
      const value = name === 'set-cookie' ? upstream.headers.getSetCookie?.() : upstream.headers.get(name);
      if (Array.isArray(value) && value.length) response.setHeader(name, value);
      else if (typeof value === 'string') response.setHeader(name, value);
    }
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ detail: 'Local Python API unavailable. Start it on port 8000.' }));
  }
  return true;
}
