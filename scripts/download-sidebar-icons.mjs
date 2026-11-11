import { mkdirSync, writeFileSync } from 'node:fs';
const icons = [
  ['overview', 'https://www.flaticon.com/free-icon/line-chart_170389'],
  ['publications', 'https://www.flaticon.com/free-icon/documents_217936'],
  ['faculty', 'https://www.flaticon.com/free-icon/teacher_2784572'],
  ['sources', 'https://www.flaticon.com/free-icon/information_1301531'],
];
mkdirSync('public/icons', { recursive: true });
for (const [name, source] of icons) {
  const id = source.split('_').at(-1);
  const image = `https://cdn-icons-png.flaticon.com/512/${Math.floor(Number(id) / 1000)}/${id}.png`;
  const response = await fetch(image);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw new Error(`${name}: invalid PNG`);
  writeFileSync(`public/icons/${name}.png`, Buffer.from(await response.arrayBuffer()));
  console.log(`${name}: saved official PNG from ${image}`);
}
