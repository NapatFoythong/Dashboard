"use client";
import { useLanguage } from "./language-provider";
import Link from "next/link";
import type { Publication, ResearchData } from "@/lib/analytics";

import type { Portrait } from "@/lib/faculty";
import FacultyPortrait from "./faculty-portrait";
import FacultyPublications from "./faculty-publications";
import CocBrand from "./coc-brand";
import LanguageSwitcher from "./language-switcher";
export default function FacultyProfile({ name, records, portrait, staff }: {
    name: string;
    records: Publication[];
    portrait?: Portrait;
    staff?: ResearchData["staff"][number];
}) {
    const { t, language, programmeLabel: displayProgramme } = useLanguage();
    return <main className="faculty-page"><header><Link href="/#faculty-directory" className="back-link">{t("← กลับแดชบอร์ด")}</Link><CocBrand className="faculty-header-brand"/><LanguageSwitcher /></header>
    <section className="card faculty-hero"><FacultyPortrait name={name} src={portrait?.image}/><div className="faculty-bio"><p className="eyebrow">ACADEMIC PROFILE</p><h1>{name}</h1><p>{t("ชื่ออาจารย์ตามข้อมูล CSV")}{!records.length ? " / Excel" : ""}</p>{staff && <p>{t("หลักสูตรตาม Excel: ")}{staff.programmes.map(displayProgramme).join(", ")}</p>}{staff && staff.name !== name && <p>{t("ชื่อใน Excel: ")}{staff.name}{t(" · จับคู่ชื่อเต็มจาก CSV และ CV ทางการแล้ว")}</p>}
      <div className="faculty-summary"><div><strong>{records.length}</strong><span>{t("รายการผลงานตาม CSV")}</span></div><div><strong>{new Set(records.map(row => row.type)).size}</strong><span>{t("ประเภทผลงาน")}</span></div><div><strong>{records.length ? `${Math.min(...records.map(row => row.year)) + 543}–${Math.max(...records.map(row => row.year)) + 543}` : "—"}</strong><span>{t("ช่วงปี พ.ศ. ที่มีข้อมูล")}</span></div></div>
      {portrait && <a className="profile-source" href={portrait.cv} target="_blank" rel="noreferrer">{t("ดู CV และแหล่งที่มาของรูปจากวิทยาลัยฯ ↗")}</a>}
    </div></section>
    <FacultyPublications records={records} name={name}/>
    <section className="source"><b>{t("แหล่งข้อมูล")}</b><p>{t("ชื่อและรายการผลงานจาก Publications CV-10-2025.csv คงข้อความรายละเอียด ประเภท เดือน ปี ฐานข้อมูลวิชาการ และสถานะสังกัด PSU ตามไฟล์ ไม่เพิ่มผลงานจาก CV ออนไลน์ ข้อมูลเป็น snapshot เดือนตุลาคม 2025")}</p><p>{t("มีการปรับช่องว่างและตัวพิมพ์ชื่อระหว่างนำเข้า แต่ไม่จับคู่หรือรวมผู้เขียนที่ชื่อไม่ตรงกันโดยอัตโนมัติ ")}{portrait && <a href={portrait.source} target="_blank" rel="noreferrer">{t("รูปจากหน้าบุคลากรสายวิชาการของวิทยาลัยการคอมพิวเตอร์")}</a>}</p></section>
  </main>;
}
