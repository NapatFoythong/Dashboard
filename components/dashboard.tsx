"use client";

import { useMemo, useState } from "react";
import Filters from "./filters";
import { RankedBars, TrendChart, TypeChart } from "./charts";
import PublicationTable from "./publication-table";
import SidebarNav from "./sidebar-nav";
import FacultyDirectory from "./faculty-directory";
import portraits from "@/data/staff-portraits.json";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import { countWorks, DEFAULT_FILTERS, exportCsv, filterRecords, Filters as FilterValues, groupedCounts, GroupMode, prepareRecords, ResearchData, searchWorks, unique } from "@/lib/analytics";

export default function Dashboard({ data }: { data: ResearchData }) {
  const records = useMemo(() => prepareRecords(data), [data]);
  const staff = useMemo(() => unique([...data.staff.map(person => canonicalFacultyName(person.name)), ...records.map(row => row.name)]).sort(), [data, records]);
  const programmes = useMemo(() => unique(records.flatMap(row => row.programmes)).sort(), [records]);
  const indexes = useMemo(() => unique(records.map(row => row.index)).sort(), [records]);
  const years = useMemo(() => { const values = records.map(row => row.year); const first = Math.min(...values); return Array.from({ length: Math.max(...values) - first + 1 }, (_, i) => first + i); }, [records]);
  const unmatched = useMemo(() => { const names = new Set(data.staff.map(person => canonicalFacultyName(person.name))); return unique(records.filter(row => !names.has(canonicalFacultyName(row.name))).map(row => row.name)); }, [data, records]);
  const [filters, setFilters] = useState<FilterValues>({ ...DEFAULT_FILTERS });
  const [selected, setSelected] = useState(() => new Set(staff));
  const [group, setGroup] = useState<GroupMode>("total");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(-1);
  const raw = useMemo(() => filterRecords(records, filters, selected), [records, filters, selected]);
  const works = useMemo(() => countWorks(raw, filters.count), [raw, filters.count]);
  const visible = useMemo(() => searchWorks(works, query, sort), [works, query, sort]);
  const scopus = countWorks(raw.filter(row => /scopus/i.test(row.index)), filters.count).length;
  const statistics = [
    { title: "ผลงานทางวิชาการ", value: works.length, note: filters.count === "unique" ? "ผลงานไม่ซ้ำตามข้อความรายละเอียด" : "รายการที่บันทึกแยกตามอาจารย์" },
    { title: "อาจารย์ที่มีผลงาน", value: unique(raw.map(row => row.name)).length, note: `จากรายชื่อที่เลือก ${selected.size} คน` },
    { title: "ผลงานในฐาน Scopus", value: scopus, note: `${works.length ? Math.round(scopus / works.length * 100) : 0}% ของผลงานที่แสดง` },
    { title: "ประเภทผลงาน", value: unique(raw.map(row => row.type)).length, note: "วารสารและการประชุมวิชาการ" },
  ];
  function reset() { setFilters({ ...DEFAULT_FILTERS }); setSelected(new Set(staff)); setGroup("total"); setQuery(""); setSort(-1); }
  function download() {
    const url = URL.createObjectURL(new Blob([exportCsv(visible)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `coc-publications-${filters.start}-${filters.end}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <aside><div className="brand"><b className="logo">C<span>o</span>C</b><div>COLLEGE OF COMPUTING<small>Research intelligence</small></div></div><div className="navlabel">WORKSPACE</div><SidebarNav /><div className="asidefoot"><span className="dot" />ข้อมูลจากไฟล์ที่นำเข้า<small>Publications CV · ตุลาคม 2025</small></div></aside>
    <main id="overview"><header><div>วิทยาลัยการคอมพิวเตอร์ <span>/</span> ภาพรวมผลงานวิจัย</div><span className="tag">RESEARCH ANALYTICS</span></header>
      <section className="heading"><div><p className="eyebrow">ACADEMIC PERFORMANCE</p><h1>ผลงานทางวิชาการของอาจารย์</h1><p>สำรวจผลงานวิจัย เชื่อมโยงข้อมูล และติดตามแนวโน้มของวิทยาลัยการคอมพิวเตอร์</p></div><button id="export" onClick={download}>↓ ส่งออก CSV</button></section>
      <Filters filters={filters} years={years} programmes={programmes} indexes={indexes} staff={staff} selected={selected} onChange={setFilters} onSelect={setSelected} onReset={reset} />
      <div className="stats" aria-live="polite">{statistics.map(stat => <div className="stat" key={stat.title}><label>{stat.title}</label><strong>{stat.value.toLocaleString("en-US")}</strong><small>{stat.note}</small></div>)}</div>
      <div className="charts"><section className="card trend"><div className="cardhead"><div><h2>แนวโน้มผลงานทางวิชาการ</h2><p>จำนวนผลงานในแต่ละปีตามตัวกรองที่เลือก</p></div><select value={group} onChange={e => setGroup(e.target.value as GroupMode)} aria-label="แยกกราฟตาม"><option value="total">ผลงานรวม</option><option value="type">แยกตามประเภท</option><option value="programme">แยกตามหลักสูตร</option></select></div><TrendChart records={raw} start={filters.start} end={filters.end} mode={filters.count} group={group} /></section>
        <section className="card"><div className="cardhead"><div><h2>สัดส่วนประเภทผลงาน</h2><p>ภาพรวมการเผยแพร่ทางวิชาการ</p></div></div><TypeChart works={works} /></section></div>
      <div className="lower"><section className="card" id="faculty"><div className="cardhead"><div><h2>อาจารย์ที่มีผลงานสูงสุด</h2><p>จำนวนผลงานของแต่ละคนในช่วงที่เลือก</p></div><span className="tag">TOP 8</span></div><RankedBars values={groupedCounts(raw, "name", filters.count).slice(0, 8)} faculty /></section>
        <section className="card"><div className="cardhead"><div><h2>ผลงานตามหลักสูตร</h2><p>ผลงานหนึ่งชิ้นอาจเกี่ยวข้องกับหลายหลักสูตร</p></div></div><RankedBars values={groupedCounts(raw, "programme", filters.count)} /></section></div>
      <PublicationTable works={visible} query={query} onSearch={setQuery} sort={sort} onSort={() => setSort(value => -value)} />
      <FacultyDirectory data={data} portraits={portraits} />
      <section className="source" id="sources"><b>เกี่ยวกับข้อมูลและวิธีนับ</b><p>ข้อมูลต้นฉบับ {records.length} รายการ · อาจารย์ในไฟล์หลักสูตร {data.staff.length} คน · ชื่อในไฟล์ผลงานที่ยังจับคู่หลักสูตรไม่ได้ {unmatched.length} ชื่อ: {unmatched.join(", ")} โดยคงชื่อเดิมไว้และไม่จับคู่ชื่อที่ไม่ครบโดยอัตโนมัติ</p><p>แหล่งข้อมูล: Publications CV-10-2025.csv และ รายละเอียดอาจารย์แต่ละหลักสูตร.xlsx · ปีที่แสดงเป็น พ.ศ. (ค.ศ.) · DE แสดงเป็น DE / AISE ตามหมายเหตุในไฟล์หลักสูตร</p><p>ผลงานไม่ซ้ำใช้ข้อความรายละเอียดที่ปรับช่องว่างและตัวพิมพ์ให้ตรงกัน จึงอาจยังมีผลงานเดียวกันที่เขียนต่างรูปแบบ การนับแยกหลักสูตรให้เครดิตทุกหลักสูตรของผู้เขียน และไม่ควรนำผลรวมหลักสูตรมารวมซ้ำ ข้อมูลปี 2025 เป็นข้อมูลตามไฟล์เดือนตุลาคม ไม่ใช่ทั้งปี</p></section>
      <footer>CoC Research <span>Academic publications dashboard</span></footer>
    </main>
  </>;
}
