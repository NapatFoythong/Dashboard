import { readFile, writeFile, mkdir } from "node:fs/promises";

const source = "https://computing.psu.ac.th/th/academic-staff/";
const html = await readFile("outputs/academic-staff.html", "utf8");
const data = JSON.parse(await readFile("data/research.json", "utf8"));
const names = new Set([...data.staff.map(s => s.name), ...data.publications.map(s => s.name)]);
const decode = value => value.replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const normalize = value => decode(value).replace(/\s+/g, " ").trim().toUpperCase();
const headings = [...html.matchAll(/<h6\b[^>]*>([\s\S]*?)<\/h6>/g)];
const cards = headings.flatMap((match, i) => {
  const end = headings[i + 1]?.index ?? html.length;
  const after = html.slice(match.index, end);
  const cv = after.match(/href="(https:\/\/computing\.psu\.ac\.th\/cv\/index\?encode_id=[^"]+)"/);
  const images = [...html.slice(0, match.index).matchAll(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/g)];
  if (!cv || !images.length) return [];
  return [{ thaiName: decode(match[1].replace(/<[^>]*>/g, "")).trim(), cv: decode(cv[1]), image: decode(images.at(-1)[1]) }];
});
await mkdir("public/portraits", { recursive: true });
const output = {}, report = [];
let next = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < cards.length) {
    const card = cards[next++];
    try {
      const response = await fetch(card.cv);
      if (!response.ok) throw Error(`CV HTTP ${response.status}`);
      const cvHtml = await response.text();
      const name = normalize(cvHtml.match(/<title>About - ([\s\S]*?)<\/title>/)?.[1] ?? "");
      if (!names.has(name)) { report.push({ name, status: "no exact CSV/Excel name match", cv: card.cv }); continue; }
      const photo = await fetch(card.image);
      if (!photo.ok || !photo.headers.get("content-type")?.startsWith("image/")) throw Error(`Photo HTTP ${photo.status}`);
      const extension = photo.headers.get("content-type").includes("png") ? "png" : "jpg";
      const path = `/portraits/${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${extension}`;
      await writeFile(`public${path}`, Buffer.from(await photo.arrayBuffer()));
      output[name] = { image: path, thaiName: card.thaiName, source, cv: card.cv, originalImage: card.image, verifiedName: name };
      report.push({ name, status: "verified" });
    } catch (error) { report.push({ ...card, status: String(error) }); }
  }
}));
await writeFile("data/staff-portraits.json", JSON.stringify(Object.fromEntries(Object.entries(output).sort()), null, 2) + "\n");
await writeFile("outputs/portrait-import-report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify({ cards: cards.length, verified: Object.keys(output).length, unmatched: [...names].filter(name => !output[name]), failures: report.filter(r => r.status !== "verified") }, null, 2));
