import { Fragment } from "react";
import { publicationLinks } from "@/lib/publication-links";

/** Preserve the original citation text while making explicit references clickable. */
export default function ReferenceText({ text }: { text: string }) {
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'“”]+|\b10\.\d{4,9}\/[^\s<>"'“”]+/gi)) {
    const start = match.index;
    const href = publicationLinks(match[0])[0];
    if (!href) continue;
    parts.push(<Fragment key={start}>{text.slice(cursor, start)}<a className="reference-link" href={href} target="_blank" rel="noopener noreferrer">{match[0]}</a></Fragment>);
    cursor = start + match[0].length;
  }
  return <>{parts}{text.slice(cursor)}</>;
}
