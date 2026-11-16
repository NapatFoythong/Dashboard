"use client";
import DataGuide from "./data-guide";
import { useLanguage } from "./language-provider";
import Link from "next/link";
import type { Publication, ResearchData } from "@/lib/analytics";

import type { Portrait } from "@/lib/faculty";
import FacultyPortrait from "./faculty-portrait";
import FacultyPublications from "./faculty-publications";
import CocBrand from "./coc-brand";
import LanguageSwitcher from "./language-switcher";
import { useEffect, useState } from "react";
import { canonicalProgrammes } from "@/lib/analytics";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import { parsePublicationOverlay } from "@/lib/publication-overlay";
export default function FacultyProfile({ name, records, portrait, staff }: {
    name: string;
    records: Publication[];
    portrait?: Portrait;
    staff?: ResearchData["staff"][number];
}) {
    const { t, language, programmeLabel: displayProgramme } = useLanguage();
    const [visibleRecords, setVisibleRecords] = useState(records);
    const [visibleProgrammes, setVisibleProgrammes] = useState(canonicalProgrammes(staff?.programmes ?? []));
    useEffect(() => {
      let alive = true;
      setVisibleRecords(records);
      fetch("/api/publications", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(value => {
        if (!alive || !value) return;
        const overlay = parsePublicationOverlay(value);
        const hidden = new Set(overlay.hidden);
        const base = records.filter(row => !hidden.has(row.recordKey));
        const mapping = canonicalProgrammes(overlay.programmes[name] ?? staff?.programmes ?? []);
        setVisibleProgrammes(mapping);
        const added: Publication[] = overlay.added.filter(row => canonicalFacultyName(row.name) === name).map((row, index) => ({
          ...row, id: records.length + index, recordKey: `added-${row.id}`, year: Number(row.year), month: String(row.month), index: row.index,
          programmes: mapping,
        }));
        setVisibleRecords([...base, ...added]);
      }).catch(() => { /* Keep the static faculty publication snapshot. */ });
      return () => { alive = false; };
    }, [records, name, staff]);
    return <main className="faculty-page"><header><Link href="/#faculty-directory" className="back-link">{t("← กลับแดชบอร์ด")}</Link><CocBrand className="faculty-header-brand"/><LanguageSwitcher /></header>
    <section className="card faculty-hero"><FacultyPortrait name={name} src={portrait?.image}/><div className="faculty-bio"><p className="eyebrow">ACADEMIC PROFILE</p><h1>{name}</h1><p>{t("ชื่ออาจารย์ตามข้อมูล CSV")}{!visibleRecords.length ? " / Excel" : ""}</p>{staff && <p>{t("หลักสูตรตาม Excel: ")}{visibleProgrammes.map(displayProgramme).join(", ")}</p>}{staff && staff.name !== name && <p>{t("ชื่อใน Excel: ")}{staff.name}{t(" · จับคู่ชื่อเต็มจาก CSV และ CV ทางการแล้ว")}</p>}
      <div className="faculty-summary"><div><strong>{visibleRecords.length}</strong><span>{t("รายการผลงานที่แสดง")}</span></div><div><strong>{new Set(visibleRecords.map(row => row.type)).size}</strong><span>{t("ประเภทผลงาน")}</span></div><div><strong>{visibleRecords.length ? `${Math.min(...visibleRecords.map(row => row.year)) + 543}–${Math.max(...visibleRecords.map(row => row.year)) + 543}` : "—"}</strong><span>{t("ช่วงปี พ.ศ. ที่มีข้อมูล")}</span></div></div>
      {portrait && <a className="profile-source" href={portrait.cv} target="_blank" rel="noreferrer">{t("ดู CV และแหล่งที่มาของรูปจากวิทยาลัยฯ ↗")}</a>}
    </div></section>
    <DataGuide faculty /><FacultyPublications records={visibleRecords} name={name}/>
    <section className="source"><b>{t("แหล่งข้อมูล")}</b><p>{t("ข้อมูลตั้งต้นจาก Publications CV-10-2025.csv พร้อมรายการที่เจ้าหน้าที่เพิ่มในระบบ; แถวที่เจ้าหน้าที่ซ่อนจะไม่แสดง")}</p><p>{t("มีการปรับช่องว่างและตัวพิมพ์ชื่อระหว่างนำเข้า แต่ไม่จับคู่หรือรวมผู้เขียนที่ชื่อไม่ตรงกันโดยอัตโนมัติ ")}{portrait && <a href={portrait.source} target="_blank" rel="noreferrer">{t("รูปจากหน้าบุคลากรสายวิชาการของวิทยาลัยการคอมพิวเตอร์")}</a>}</p></section>
  </main>;
}
