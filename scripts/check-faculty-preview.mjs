import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalFacultyName } from "../lib/faculty-identity.ts";

const base = process.argv[2] || "http://localhost:3100";
const data = JSON.parse(await readFile("data/research.json", "utf8"));
const portraits = JSON.parse(await readFile("data/staff-portraits.json", "utf8"));
const names = [...new Set([...data.staff.map(row => row.name), ...data.publications.map(row => row.name)])];
const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const originalName of names) {
  const name = canonicalFacultyName(originalName);
  const response = await fetch(`${base}/faculty/${slug(originalName)}/`);
  assert.equal(response.status, 200, name);
  const html = await response.text();
  assert(html.includes(`<h1>${name}</h1>`), name);
  assert(html.includes("รายการผลงานของ"), name);
  if (portraits[name]) {
    assert(html.includes(portraits[name].image), name);
    const image = await fetch(`${base}${portraits[name].image}`);
    assert.equal(image.status, 200, name);
    assert(image.headers.get("content-type").startsWith("image/"));
  } else assert(html.includes("ยังไม่มีรูปที่ยืนยันได้"), name);
}
assert.equal((await fetch(`${base}/faculty/unknown-author/`)).status, 404);
console.log(`PASS: ${names.length} profile routes, ${Object.keys(portraits).length} local portraits, missing-photo states, unknown-author 404`);
