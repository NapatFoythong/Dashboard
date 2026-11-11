"use client";
import DataGuide from "./data-guide";
import { useLanguage } from "./language-provider";
import { useState } from "react";
import { normalize, type ResearchData } from "@/lib/analytics";
import { facultyHref, facultyRecords, type Portrait } from "@/lib/faculty";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import FacultyHoverCard from "./faculty-hover-card";
import { matchesResearchQuery, isTopicQuery } from "@/lib/research-topics";
import { TopicNote } from "./topic-controls";
export default function FacultyDirectory({ data, portraits }: {
    data: ResearchData;
    portraits: Record<string, Portrait>;
}) {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState("");
    const names = data.staff.map(person => canonicalFacultyName(person.name)).filter(name => {
        const text = `${name} ${portraits[name]?.thaiName ?? ""}`;
        return !query.trim() || (!isTopicQuery(query) && normalize(text).includes(normalize(query))) || facultyRecords(data, name).some(row => matchesResearchQuery(row.detail, query, text));
    });
    const card = (name: string) => {
        const staff = data.staff.find(row => canonicalFacultyName(row.name) === name);
        return <FacultyHoverCard key={name} name={name} original={staff?.name} portrait={portraits[name]} records={facultyRecords(data, name)} programmes={staff?.programmes ?? []} href={facultyHref(name) + (query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "")} />;
    };
    return <section className="card faculty-directory" id="faculty-directory"><div className="cardhead"><div><h2>{t("รายชื่ออาจารย์")}</h2></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("ค้นหาชื่ออาจารย์…")} aria-label={t("ค้นหาในรายชื่ออาจารย์")}/></div>
    <TopicNote /><DataGuide faculty /><div className="faculty-grid">{names.map(card)}</div>
    {!names.length && <p>{t("ไม่พบอาจารย์ที่ตรงกับคำค้นหา")}</p>}
  </section>;
}
