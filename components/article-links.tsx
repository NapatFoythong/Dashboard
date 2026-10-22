"use client";
import { publicationLinks } from "@/lib/publication-links";
import { useLanguage } from "./language-provider";
export default function ArticleLinks({ detail, showMissing = false }: { detail: string; showMissing?: boolean }) {
  const { t } = useLanguage();
  const links = publicationLinks(detail);
  return links.length ? <div className="article-links">{links.map((href, i) => <a href={href} key={href} target="_blank" rel="noopener noreferrer">{t("อ่านบทความต้นฉบับ")}{links.length > 1 ? ` ${i + 1}` : ""} ↗</a>)}</div> : showMissing ? <p className="link-note">{t("ไม่มี DOI หรือลิงก์บทความในข้อมูลต้นฉบับ")}</p> : null;
}
