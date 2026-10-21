"use client";
import { useLanguage } from "./language-provider";
import { useState } from "react";
import Link from "next/link";
import { normalize, type ResearchData } from "@/lib/analytics";
import { facultyHref, facultyRecords, type Portrait } from "@/lib/faculty";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import FacultyPortrait from "./faculty-portrait";
export default function FacultyDirectory({ data, portraits }: {
    data: ResearchData;
    portraits: Record<string, Portrait>;
}) {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState("");
    const names = data.staff.map(person => canonicalFacultyName(person.name)).filter(name => normalize(`${name} ${portraits[name]?.thaiName ?? ""}`).includes(normalize(query)));
    const card = (name: string) => {
        const count = facultyRecords(data, name).length;
        const original = data.staff.find(row => canonicalFacultyName(row.name) === name)?.name;
        return <Link href={facultyHref(name)} key={name} className="faculty-person"><FacultyPortrait name={name} src={portraits[name]?.image} small/><div><b>{name}</b>{original && original !== name && <small>{t("ชื่อใน Excel: ")}{original}</small>}<small>{t("มีผลงาน {0} ผลงาน", count)}</small></div><span aria-hidden="true">↗</span></Link>;
    };
    return <section className="card faculty-directory" id="faculty-directory"><div className="cardhead"><div><h2>{t("รายชื่ออาจารย์")}</h2></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("ค้นหาชื่ออาจารย์…")} aria-label={t("ค้นหาในรายชื่ออาจารย์")}/></div>
    <div className="faculty-grid">{names.map(card)}</div>
    {!names.length && <p>{t("ไม่พบอาจารย์ที่ตรงกับคำค้นหา")}</p>}
  </section>;
}
