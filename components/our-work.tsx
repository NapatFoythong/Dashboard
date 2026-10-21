"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { countWorks, DEFAULT_FILTERS, exportCsv, filterRecords, prepareRecords, searchWorks, TYPE_LABELS, unique, type Filters as FilterValues, type ResearchData } from "@/lib/analytics";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import { orderWorks, type PublicationSort } from "@/lib/publication-sort";
import CocBrand from "./coc-brand";
import SidebarNav from "./sidebar-nav";
import LanguageSwitcher from "./language-switcher";
import Filters from "./filters";
import PublicationTable from "./publication-table";
import { useLanguage } from "./language-provider";

export default function OurWork({ data }: { data: ResearchData }) {
  const { t } = useLanguage();
  const records = useMemo(() => prepareRecords(data), [data]);
  const roster = useMemo(() => data.staff.map(person => canonicalFacultyName(person.name)), [data]);
  const staff = useMemo(() => unique([...roster, ...records.map(row => row.name)]).sort(), [roster, records]);
  const years = useMemo(() => { const min = Math.min(...records.map(row => row.year)), max = Math.max(...records.map(row => row.year)); return Array.from({ length: max - min + 1 }, (_, i) => min + i); }, [records]);
  const initialFilters: FilterValues = { ...DEFAULT_FILTERS, start: years[0], end: years.at(-1)! };
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [selected, setSelected] = useState(() => new Set(roster));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PublicationSort>("newest");
  const programmes = useMemo(() => unique(records.flatMap(row => row.programmes)).sort(), [records]);
  const indexes = useMemo(() => unique(records.map(row => row.index)).sort(), [records]);
  const raw = useMemo(() => filterRecords(records, filters, selected), [records, filters, selected]);
  const works = useMemo(() => countWorks(raw, filters.count), [raw, filters.count]);
  const visible = useMemo(() => orderWorks(searchWorks(works, query, -1), sort), [works, query, sort]);
  const categories = useMemo(() => {
    const base = filterRecords(records, { ...filters, type: "" }, selected);
    return Object.keys(TYPE_LABELS).map(type => ({ type, count: countWorks(base.filter(row => row.type === type), filters.count).length }));
  }, [records, filters, selected]);
  function reset() { setFilters(initialFilters); setSelected(new Set(roster)); setQuery(""); setSort("newest"); }
  function download() {
    const url = URL.createObjectURL(new Blob([exportCsv(visible)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `coc-our-work-${filters.start}-${filters.end}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <aside><CocBrand /><div className="navlabel">RESEARCH WORKSPACE</div><SidebarNav page="our-work" /><div className="asidefoot"><span className="dot" />{t("ข้อมูลจากไฟล์ที่นำเข้า")}<small>{t("Publications CV · ตุลาคม 2025")}</small></div></aside>
    <main id="our-work"><header><div className="desktop-breadcrumb">{t("วิทยาลัยการคอมพิวเตอร์ ")}<span>/</span>{t("ผลงานของเรา")}</div><CocBrand className="mobile-brand" /><div className="header-actions"><span className="tag">OUR PUBLICATIONS</span><LanguageSwitcher /></div></header>
      <section className="heading"><div><p className="eyebrow">CoC RESEARCH COLLECTION</p><h1>{t("ผลงานของเรา")}</h1><p>{t("รวมผลงานทุกปีจาก CSV เลือกประเภทเพื่อสำรวจและกดรายการเพื่ออ่านรายละเอียด")}</p></div><div className="heading-actions"><Link href="/" className="button-link">{t("← กลับแดชบอร์ด")}</Link><button id="export" onClick={download}>{t("↓ ส่งออก CSV")}</button></div></section>
      <Filters filters={filters} years={years} programmes={programmes} indexes={indexes} staff={staff} selected={selected} onChange={setFilters} onSelect={setSelected} onReset={reset} />
      <section className="work-categories" aria-label={t("เลือกประเภทผลงาน")}><button className={!filters.type ? "selected" : ""} aria-pressed={!filters.type} onClick={() => setFilters({ ...filters, type: "" })}><span>{t("ทุกประเภท")}</span><strong>{countWorks(filterRecords(records, { ...filters, type: "" }, selected), filters.count).length}</strong></button>{categories.map(({ type, count }) => <button key={type} className={filters.type === type ? "selected" : ""} aria-pressed={filters.type === type} onClick={() => setFilters({ ...filters, type })}><span>{t(TYPE_LABELS[type])}</span><strong>{count}</strong></button>)}</section>
      <p className="collection-note">{t("เริ่มต้นจากรายชื่อ Excel 34 คน เลือกอาจารย์เพิ่มเติมจาก CSV ได้ในตัวกรอง")}</p>
      <PublicationTable works={visible} query={query} onSearch={setQuery} sort={sort} onSort={setSort} staff={staff} selected={selected} onSelect={setSelected} />
      <footer>CoC Research <span>{t("ข้อมูลผลงานจากไฟล์ CSV เดือนตุลาคม 2025")}</span></footer>
    </main>
  </>;
}
