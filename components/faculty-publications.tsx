"use client";

import { useMemo, useState } from "react";
import { normalize, TYPE_LABELS, unique, yearLabel, type Publication } from "@/lib/analytics";

export default function FacultyPublications({ records, name }: { records: Publication[]; name: string }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const years = unique(records.map(row => row.year)).sort((a, b) => b - a);
  const types = unique(records.map(row => row.type));
  const visible = useMemo(() => records.filter(row => (!year || row.year === Number(year)) && (!type || row.type === type) && normalize(row.detail).includes(normalize(query))), [records, year, type, query]);
  const pages = Math.max(1, Math.ceil(visible.length / 10));
  const current = Math.min(page, pages);
  function download() {
    const rows = [["Staff name", "Type", "Detail", "Month", "Year", "Indexing", "Is the author's affiliation with PSU?"], ...visible.map(row => [row.name, row.type, row.detail, row.month, row.year, row.index, row.psu])];
    const csv = "\uFEFF" + rows.map(row => row.map(value => `"${String(value).replace(/^[\s]*[=+@-]/, "'$&").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${name.toLowerCase().replace(/\s+/g, "-")}-publications.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="card faculty-works"><div className="cardhead"><div><h2>รายการผลงานของ {name}</h2><p>นับทุกแถวตาม CSV โดยไม่รวมแถวเข้าด้วยกัน · เริ่มต้นแสดงทุกปี</p></div><button onClick={download}>↓ ส่งออก CSV</button></div>
    <div className="faculty-controls"><label>ปีเผยแพร่<select value={year} onChange={e => { setYear(e.target.value); setPage(1); }}><option value="">ทุกปี</option>{years.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}</select></label><label>ประเภทผลงาน<select value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">ทุกประเภท</option>{types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}</select></label><label>ค้นหาในรายละเอียด<input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="ชื่อผลงานหรือคำสำคัญ…" /></label><button onClick={() => { setQuery(""); setYear(""); setType(""); setPage(1); }}>ล้างตัวกรอง</button></div>
    <p className="faculty-results" aria-live="polite">พบ {visible.length} จากทั้งหมด {records.length} รายการ</p>
    <ol className="faculty-publications" start={(current - 1) * 10 + 1}>{visible.slice((current - 1) * 10, current * 10).map(row => <li key={row.id}><div className="work-meta"><b>{yearLabel(row.year)}</b><span className="badge">{TYPE_LABELS[row.type] || row.type}</span></div><p className="work-detail">{row.detail}</p><dl><div><dt>Type</dt><dd>{row.type}</dd></div><div><dt>Month / Year</dt><dd>{row.month || "ไม่ระบุ"} / {row.year}</dd></div><div><dt>Indexing</dt><dd>{row.index || "ไม่ระบุ"}</dd></div><div><dt>PSU affiliation</dt><dd>{row.psu || "ไม่ระบุ"}</dd></div></dl></li>)}</ol>
    {!visible.length && <div className="empty">{records.length ? "ไม่พบผลงานที่ตรงกับตัวกรอง" : "ไม่พบรายการภายใต้ชื่อนี้ใน CSV และไม่ได้รวมกับชื่ออื่นโดยอัตโนมัติ"}</div>}
    <div className="pagination"><span>หน้า {current} / {pages}</span><div><button disabled={current === 1} onClick={() => setPage(current - 1)}>← ก่อนหน้า</button><button disabled={current === pages} onClick={() => setPage(current + 1)}>ถัดไป →</button></div></div>
  </section>;
}
