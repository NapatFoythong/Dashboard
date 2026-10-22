/** Extract only explicit HTTP(S) URLs and DOI identifiers from the source text. */
export function publicationLinks(detail: string): string[] {
  const found: string[] = [];
  function add(candidate: string) {
    let value = candidate.replace(/[.,;:!?]+$/, "");
    while (value.endsWith(")") && (value.match(/\)/g)?.length ?? 0) > (value.match(/\(/g)?.length ?? 0)) value = value.slice(0, -1);
    value = value.replace(/[\]}]+$/, "");
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) return;
      if (/^(?:dx\.)?doi\.org$/i.test(url.hostname)) {
        if (!/^\/10\.\d{4,9}\/\S+$/i.test(url.pathname)) return;
        value = `https://doi.org${url.pathname}`;
      }
      if (!found.includes(value)) found.push(value);
    } catch { /* Incomplete references remain plain source text. */ }
  }
  for (const match of detail.matchAll(/https?:\/\/[^\s<>"']+/gi)) add(match[0]);
  for (const match of detail.matchAll(/\b10\.\d{4,9}\/[^\s<>"']+/gi)) add(`https://doi.org/${match[0]}`);
  return found;
}
