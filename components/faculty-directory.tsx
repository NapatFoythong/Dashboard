"use client";

import { useState } from "react";
import Link from "next/link";
import { normalize, type ResearchData } from "@/lib/analytics";
import { facultyHref, facultyNames, type Portrait } from "@/lib/faculty";
import FacultyPortrait from "./faculty-portrait";

export default function FacultyDirectory({ data, portraits }: { data: ResearchData; portraits: Record<string, Portrait> }) {
  const [query, setQuery] = useState("");
  const names = facultyNames(data).filter(name => normalize(`${name} ${portraits[name]?.thaiName ?? ""}`).includes(normalize(query)));
  return <section className="card faculty-directory" id="faculty-directory"><div className="cardhead"><div><h2>รายชื่ออาจารย์และผลงาน</h2><p>กดชื่อเพื่อดูประวัติและรายการผลงานทั้งหมดตาม CSV โดยไม่ขึ้นกับตัวกรองภาพรวม</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่ออาจารย์…" aria-label="ค้นหาในรายชื่ออาจารย์" /></div>
    <div className="faculty-grid">{names.map(name => <Link href={facultyHref(name)} key={name} className="faculty-person"><FacultyPortrait name={name} src={portraits[name]?.image} small /><div><b>{name}</b><small>{data.publications.filter(row => row.name === name).length} รายการจาก CSV</small></div><span aria-hidden="true">↗</span></Link>)}</div>
    {!names.length && <p className="empty">ไม่พบอาจารย์ที่ตรงกับคำค้นหา</p>}
  </section>;
}
