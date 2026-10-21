"use client";
import { useLanguage } from "./language-provider";
import { useState } from "react";
import { normalize } from "@/lib/analytics";
export default function FacultyPicker({ staff, selected, onSelect }: {
    staff: string[];
    selected: Set<string>;
    onSelect: (names: Set<string>) => void;
}) {
    const { t, language } = useLanguage();
    const [query, setQuery] = useState("");
    const matching = staff.filter(name => normalize(name).includes(normalize(query)));
    return <details className="table-faculty-picker"><summary>{t("เลือกอาจารย์ ")}<span>{selected.size === staff.length ? t("ทุกคน") : t("{0} คน", selected.size)}</span> ▾</summary>
    <div className="table-picker-panel"><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("ค้นหาชื่ออาจารย์…")} aria-label={t("ค้นหาชื่ออาจารย์เพื่อกรองผลงาน")}/>
      <div className="staffactions"><button onClick={() => onSelect(new Set(staff))}>{t("เลือกทั้งหมด")}</button><button onClick={() => onSelect(new Set())}>{t("ยกเลิกทั้งหมด")}</button></div>
      <div className="table-picker-list">{matching.map(name => <label key={name}><input type="checkbox" checked={selected.has(name)} onChange={e => { const next = new Set(selected); if (e.target.checked)
        next.add(name);
    else
        next.delete(name); onSelect(next); }}/>{name}</label>)}{!matching.length && <p>{t("ไม่พบอาจารย์ที่ตรงกับคำค้นหา")}</p>}</div>
      <p>{t("ใช้รายชื่อที่เลือกเดียวกับตัวกรองภาพรวม")}</p>
    </div>
  </details>;
}
