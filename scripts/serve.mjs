import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

const root = resolve("out");
if (!existsSync(resolve(root, "index.html"))) {
  console.error("Run npm run build before npm start.");
  process.exit(1);
}
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let path;
  try { path = resolve(root, "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname)); }
  catch { res.writeHead(400).end("Bad request"); return; }
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end("Forbidden"); return; }
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, "index.html");
  if (!existsSync(path) || !statSync(path).isFile()) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); createReadStream(resolve(root, "404.html")).pipe(res); return; }
  res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
  if (req.method === "HEAD") { res.end(); return; }
  createReadStream(path).pipe(res);
});
server.listen(Number(process.env.PORT || 3000), "127.0.0.1", () => console.log(`Local: http://localhost:${server.address().port}`));
