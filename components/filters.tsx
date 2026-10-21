"use client";

import { useState } from "react";
import { CountMode, Filters as FilterValues, normalize, programmeLabel, TYPE_LABELS, yearLabel } from "@/lib/analytics";

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
  const [staffSearch, setStaffSearch] = useState("");
  function update<K extends keyof FilterValues>(key: K, value: FilterValues[K]) {
    onChange({ ...filters, [key]: value });
  }
  return <section className="filters" aria-label="ตัวกรองข้อมูล">
    <div className="filtertitle"><b>ตัวกรองข้อมูล</b><button className="textbtn" onClick={() => { setStaffSearch(""); onReset(); }}>ล้างตัวกรอง ↺</button></div>
    <div className="filtergrid">
      <label>ปีเริ่มต้น<select value={filters.start} onChange={e => update("start", Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}</select></label>
      <label>ปีสิ้นสุด<select value={filters.end} onChange={e => update("end", Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}</select></label>
      <label>หลักสูตร<select value={filters.programme} onChange={e => update("programme", e.target.value)}><option value="">ทุกหลักสูตร</option>{programmes.map(p => <option key={p} value={p}>{programmeLabel(p)}</option>)}</select></label>
      <label>ประเภทผลงาน<select value={filters.type} onChange={e => update("type", e.target.value)}><option value="">ทุกประเภท</option>{Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>ฐานดัชนี<select value={filters.index} onChange={e => update("index", e.target.value)}><option value="">ทุกฐานดัชนี</option>{indexes.map(index => <option key={index} value={index || "__empty__"}>{index || "ไม่ระบุ"}</option>)}</select></label>
      <label>วิธีนับ<select value={filters.count} onChange={e => update("count", e.target.value as CountMode)}><option value="unique">ผลงานไม่ซ้ำ</option><option value="records">รายการตามอาจารย์</option></select></label>
    </div>
    <div className="filterbottom">
      <details id="staffpicker"><summary>เลือกอาจารย์ <span>{selected.size === staff.length ? "ทุกคน" : `${selected.size} คน`}</span> ▾</summary><div className="staffpopup">
        <input id="staffsearch" value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="ค้นหาชื่ออาจารย์…" aria-label="ค้นหาอาจารย์" />
        <div className="staffactions"><button onClick={() => onSelect(new Set(staff))}>เลือกทั้งหมด</button><button onClick={() => onSelect(new Set())}>ยกเลิกทั้งหมด</button></div>
        <div id="stafflist">{staff.filter(name => normalize(name).includes(normalize(staffSearch))).map(name => <label key={name}><input type="checkbox" checked={selected.has(name)} onChange={e => { const next = new Set(selected); if (e.target.checked) next.add(name); else next.delete(name); onSelect(next); }} />{name}</label>)}</div>
      </div></details>
      <label className="check"><input type="checkbox" checked={filters.psu} onChange={e => update("psu", e.target.checked)} />เฉพาะผลงานที่ระบุสังกัด PSU</label>
      <span className="period">พ.ศ. {filters.start + 543} – {filters.end + 543}</span>
    </div>
    {filters.start > filters.end && <div id="validation" role="alert">กรุณาเลือกปีเริ่มต้นไม่เกินปีสิ้นสุด</div>}
  </section>;
}
