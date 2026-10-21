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
  const card = (name: string) => {
    const count = facultyRecords(data, name).length;
    const original = data.staff.find(row => canonicalFacultyName(row.name) === name)?.name;
    return <Link href={facultyHref(name)} key={name} className="faculty-person"><FacultyPortrait name={name} src={portraits[name]?.image} small /><div><b>{name}</b>{original && original !== name && <small>ชื่อใน Excel: {original}</small>}<small>{count ? `${count} รายการจาก CSV` : "ไม่พบรายการในไฟล์ CSV นี้"}</small></div><span aria-hidden="true">↗</span></Link>;
  };
  return <section className="card faculty-directory" id="faculty-directory"><div className="cardhead"><div><h2>รายชื่ออาจารย์</h2></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่ออาจารย์…" aria-label="ค้นหาในรายชื่ออาจารย์" /></div>
    <div className="faculty-grid">{names.map(card)}</div>
    {!names.length && <p>ไม่พบอาจารย์ที่ตรงกับคำค้นหา</p>}
  </section>;
}
