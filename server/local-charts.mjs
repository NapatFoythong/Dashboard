const chartPaths = new Set(['/api/charts/trend', '/api/charts/pie']);
const maximumBodyBytes = 256 * 1024;

async function readLimitedBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maximumBodyBytes) throw new Error('too-large');
  }
  return body;
}

export async function localCharts(request, response) {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (!chartPaths.has(pathname)) return false;
  if (request.method !== 'POST') {
    response.writeHead(405, { 'Allow': 'POST', 'Content-Type': 'application/json' }).end(JSON.stringify({ detail: 'Method not allowed' }));
    return true;
  }

  try {
    if (Number(request.headers['content-length'] || 0) > maximumBodyBytes) throw new Error('too-large');
    const body = await readLimitedBody(request);
    const base = (process.env.MATPLOTLIB_API || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (process.env.MATPLOTLIB_API_TOKEN) headers.Authorization = `Bearer ${process.env.MATPLOTLIB_API_TOKEN}`;
    const upstream = await fetch(`${base}${pathname}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(15000),
    });
    const contentType = upstream.headers.get('content-type') || 'application/json';
    response.writeHead(upstream.status, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    const tooLarge = error?.message === 'too-large';
    response.writeHead(tooLarge ? 413 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ detail: tooLarge ? 'Chart request is too large' : 'Matplotlib API unavailable' }));
  }
  return true;
}
