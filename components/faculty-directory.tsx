"use client";

import { useState } from "react";
import Link from "next/link";
import { normalize, type ResearchData } from "@/lib/analytics";
import { facultyHref, facultyNames, facultyRecords, type Portrait } from "@/lib/faculty";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import FacultyPortrait from "./faculty-portrait";

export default function FacultyDirectory({ data, portraits }: { data: ResearchData; portraits: Record<string, Portrait> }) {
  const [query, setQuery] = useState("");
  const names = facultyNames(data).filter(name => normalize(`${name} ${portraits[name]?.thaiName ?? ""}`).includes(normalize(query)));
  const roster = new Set(data.staff.map(row => canonicalFacultyName(row.name)));
  const primary = names.filter(name => roster.has(name));
  const additional = names.filter(name => !roster.has(name));
  const card = (name: string) => {
    const count = facultyRecords(data, name).length;
    const original = data.staff.find(row => canonicalFacultyName(row.name) === name)?.name;
    return <Link href={facultyHref(name)} key={name} className="faculty-person"><FacultyPortrait name={name} src={portraits[name]?.image} small /><div><b>{name}</b>{original && original !== name && <small>ชื่อใน Excel: {original}</small>}<small>{count ? `${count} รายการจาก CSV` : "ไม่พบรายการในไฟล์ CSV นี้"}</small></div><span aria-hidden="true">↗</span></Link>;
  };
  return <section className="card faculty-directory" id="faculty-directory"><div className="cardhead"><div><h2>อาจารย์ตามรายชื่อ Excel · {roster.size} คน</h2><p>มีรูปครบทั้ง 34 คน · กดชื่อเพื่อดูผลงานทุกปีจาก CSV โดยไม่ขึ้นกับตัวกรองภาพรวม</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่ออาจารย์…" aria-label="ค้นหาในรายชื่ออาจารย์" /></div>
    <div className="faculty-grid">{primary.map(card)}</div>
    {!primary.length && <p>ไม่พบอาจารย์ใน Excel ที่ตรงกับคำค้นหา</p>}
    <details className="additional-faculty"><summary>รายชื่อเพิ่มเติมใน CSV ที่ไม่มีใน Excel ({additional.length} คน)</summary><p>ยังไม่มีรูปที่ยืนยันได้จากหน้าบุคลากรปัจจุบัน และไม่ได้ระบุหลักสูตรแทนโดยคาดเดา</p><div className="faculty-grid">{additional.map(card)}</div></details>
  </section>;
}
