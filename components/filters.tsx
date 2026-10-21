"use client";
import { useLanguage } from "./language-provider";
import { useState } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { CountMode, Filters as FilterValues, normalize, TYPE_LABELS } from "@/lib/analytics";
interface Props {
    filters: FilterValues;
    years: number[];
    programmes: string[];
    indexes: string[];
    staff: string[];
    selected: Set<string>;
    onChange: (filters: FilterValues) => void;
    onSelect: (names: Set<string>) => void;
    onReset: () => void;
}
export default function Filters({ filters, years, programmes, indexes, staff, selected, onChange, onSelect, onReset }: Props) {
    const { t, language, yearLabel: formatYear, programmeLabel: displayProgramme } = useLanguage();
    const [staffSearch, setStaffSearch] = useState("");
    function update<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
        onChange({ ...filters, [key]: value });
    }
    return <section className="filters" aria-label={t("ตัวกรองข้อมูล")}>
    <div className="filtertitle"><b>{t("ตัวกรองข้อมูล")}</b><button className="textbtn" onClick={() => { setStaffSearch(""); onReset(); }}>{t("ล้างตัวกรอง ↺")}</button></div>
    <div className="filtergrid">
      <label>{t("ปีเริ่มต้น")}<select value={filters.start} onChange={e => update("start", Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{formatYear(y)}</option>)}</select></label>
      <label>{t("ปีสิ้นสุด")}<select value={filters.end} onChange={e => update("end", Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{formatYear(y)}</option>)}</select></label>
      <label>{t("หลักสูตร")}<select value={filters.programme} onChange={e => update("programme", e.target.value)}><option value="">{t("ทุกหลักสูตร")}</option>{programmes.map(p => <option key={p} value={p}>{displayProgramme(p)}</option>)}</select></label>
      <label>{t("ประเภทผลงาน")}<select value={filters.type} onChange={e => update("type", e.target.value)}><option value="">{t("ทุกประเภท")}</option>{Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label>
      <label>{t("ฐานดัชนี")}<select value={filters.index} onChange={e => update("index", e.target.value)}><option value="">{t("ทุกฐานดัชนี")}</option>{indexes.map(index => <option key={index} value={index || "__empty__"}>{index || t("ไม่ระบุ")}</option>)}</select></label>
      <label>{t("วิธีนับ")}<select value={filters.count} onChange={e => update("count", e.target.value as CountMode)}><option value="unique">{t("ผลงานไม่ซ้ำ")}</option><option value="records">{t("รายการตามอาจารย์")}</option></select></label>
    </div>
    <div className="filterbottom">
      <details id="staffpicker"><summary>{t("เลือกอาจารย์ ")}<span>{selected.size === staff.length ? t("ทุกคน") : t("{0} คน", selected.size)}</span> ▾</summary><div className="staffpopup">
        <input id="staffsearch" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder={t("ค้นหาชื่ออาจารย์…")} aria-label={t("ค้นหาอาจารย์")}/>
        <div className="staffactions"><button onClick={() => onSelect(new Set(staff))}>{t("เลือกทั้งหมด")}</button><button onClick={() => onSelect(new Set())}>{t("ยกเลิกทั้งหมด")}</button></div>
        <div id="stafflist">{staff.filter(name => normalize(name).includes(normalize(staffSearch))).map(name => <div className="staff-option" key={name}><label><input type="checkbox" checked={selected.has(name)} onChange={e => { const next = new Set(selected); if (e.target.checked)
        next.add(name);
    else
        next.delete(name); onSelect(next); }}/>{name}</label><Link href={facultyHref(name)} className="faculty-link" aria-label={t("ดูผลงานของ {0}", name)}>{t("ดูผลงาน ↗")}</Link></div>)}</div>
      </div></details>
      <label className="check"><input type="checkbox" checked={filters.psu} onChange={e => update("psu", e.target.checked)}/>{t("เฉพาะผลงานที่ระบุสังกัด PSU")}</label>
      <span className="period">{t("พ.ศ. ")}{filters.start + 543} – {filters.end + 543}</span>
    </div>
    {filters.start > filters.end && <div id="validation" role="alert">{t("กรุณาเลือกปีเริ่มต้นไม่เกินปีสิ้นสุด")}</div>}
  </section>;
}
