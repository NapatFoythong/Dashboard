"use client";
import DataGuide from "./data-guide";
import VisitorCounter from "./visitor-counter";
import { researchTopics } from "@/lib/research-topics";
import { useLanguage } from "./language-provider";
import { useMemo, useState } from "react";
import Filters from "./filters";
import { RankedBars, TrendChart, TypeChart } from "./charts";
import PublicationTable from "./publication-table";
import SidebarNav from "./sidebar-nav";
import CocBrand from "./coc-brand";
import LanguageSwitcher from "./language-switcher";
import FacultyDirectory from "./faculty-directory";
import portraits from "@/data/staff-portraits.json";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import { orderWorks, type PublicationSort } from "@/lib/publication-sort";
import { countWorks, DEFAULT_FILTERS, filterRecords, Filters as FilterValues, groupedCounts, GroupMode, prepareRecords, ResearchData, searchWorks, unique, TYPE_LABELS } from "@/lib/analytics";
export default function Dashboard({ data }: {
    data: ResearchData;
}) {
    const { t, language, yearLabel, programmeLabel } = useLanguage();
    const records = useMemo(() => prepareRecords(data), [data]);
    const staff = useMemo(() => unique([...data.staff.map(person => canonicalFacultyName(person.name)), ...records.map(row => row.name)]).sort(), [data, records]);
    const roster = useMemo(() => data.staff.map(person => canonicalFacultyName(person.name)), [data]);
    const programmes = useMemo(() => unique(records.flatMap(row => row.programmes)).sort(), [records]);
    const indexes = useMemo(() => unique(records.map(row => row.index)).sort(), [records]);
    const years = useMemo(() => { const values = records.map(row => row.year); const first = Math.min(...values); return Array.from({ length: Math.max(...values) - first + 1 }, (_, i) => first + i); }, [records]);
    const unmatched = useMemo(() => { const names = new Set(data.staff.map(person => canonicalFacultyName(person.name))); return unique(records.filter(row => !names.has(canonicalFacultyName(row.name))).map(row => row.name)); }, [data, records]);
    const [filters, setFilters] = useState<FilterValues>({ ...DEFAULT_FILTERS });
    const [selected, setSelected] = useState(() => new Set(roster));
    const [group, setGroup] = useState<GroupMode>("total");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<PublicationSort>("newest");
    const [topic, setTopic] = useState("");
    const [chartFilter, setChartFilter] = useState<{ year?: number; type?: string; programme?: string; author?: string }>({});
    function focusTable() { document.getElementById("publications")?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }
    function selectChart(year?: number, type?: string, programme?: string, author?: string) { setChartFilter({ year, type, programme, author }); focusTable(); }
    const raw = useMemo(() => filterRecords(records, filters, selected), [records, filters, selected]);
    const works = useMemo(() => countWorks(raw, filters.count), [raw, filters.count]);
    const visible = useMemo(() => orderWorks(searchWorks(works.filter(work => (!topic || (topic === "unclassified" ? !researchTopics(work.detail).length : researchTopics(work.detail).includes(topic))) && (!chartFilter.author || work.authors.includes(chartFilter.author)) && (!chartFilter.year || work.year === chartFilter.year) && (!chartFilter.type || work.type === chartFilter.type) && (!chartFilter.programme || work.programmes.includes(chartFilter.programme))), query, -1), sort), [works, query, sort, chartFilter, topic]);
    const scopus = countWorks(raw.filter(row => /scopus/i.test(row.index)), filters.count).length;
    const statistics = [
        { title: t("ผลงานทางวิชาการ"), value: works.length, note: filters.count === "unique" ? t("ผลงานไม่ซ้ำตามข้อความรายละเอียด") : t("รายการที่บันทึกแยกตามอาจารย์") },
        { title: t("อาจารย์ที่มีผลงาน"), value: unique(raw.map(row => row.name)).length, note: t("จากรายชื่อที่เลือก {0} คน", selected.size) },
        { title: t("ผลงานในฐาน Scopus"), value: scopus, note: t("{0}% ของผลงานที่แสดง", works.length ? Math.round(scopus / works.length * 100) : 0) },
        { title: t("ประเภทผลงาน"), value: unique(raw.map(row => row.type)).length, note: t("วารสารและการประชุมวิชาการ") },
    ];
    function reset() { setFilters({ ...DEFAULT_FILTERS }); setSelected(new Set(roster)); setGroup("total"); setQuery(""); setSort("newest"); setTopic(""); setChartFilter({}); }
    return <>
    <aside><CocBrand /><div className="navlabel">RESEARCH WORKSPACE</div><SidebarNav /><div className="asidefoot"><span className="dot"/>{t("ข้อมูลจากไฟล์ที่นำเข้า")}<small>{t("Publications CV · ตุลาคม 2025")}</small><VisitorCounter /></div></aside>
    <main id="overview"><header><div className="desktop-breadcrumb">{t("วิทยาลัยการคอมพิวเตอร์ ")}<span>/</span>{t(" ภาพรวมผลงานวิจัย")}</div><CocBrand className="mobile-brand"/><div className="header-actions"><span className="tag">RESEARCH ANALYTICS</span><LanguageSwitcher /></div></header>
      <section className="heading"><div><p className="eyebrow">ACADEMIC PERFORMANCE</p><h1>{t("ผลงานทางวิชาการของอาจารย์")}</h1><p>{t("สำรวจผลงานวิจัย เชื่อมโยงข้อมูล และติดตามแนวโน้มของวิทยาลัยการคอมพิวเตอร์")}</p></div></section>
      <Filters filters={filters} years={years} programmes={programmes} indexes={indexes} staff={staff} selected={selected} onChange={next => { setFilters(next); setChartFilter({}); }} onSelect={setSelected} onReset={reset}/>
      <DataGuide /><div className="stats" aria-live="polite">{statistics.map(stat => <div className="stat" key={stat.title}><label>{stat.title}</label><strong>{stat.value.toLocaleString("en-US")}</strong><small>{stat.note}</small></div>)}</div>
      <p className="chart-hint">{t("กดแท่งกราฟหรือส่วนของกราฟวงกลมเพื่อกรองรายการผลงานด้านล่าง")}</p>
      <div className="charts"><section className="card trend"><div className="cardhead"><div><h2>{t("แนวโน้มผลงานทางวิชาการ")}</h2><p>{t("จำนวนผลงานในแต่ละปีตามตัวกรองที่เลือก")}</p></div><select value={group} onChange={e => setGroup(e.target.value as GroupMode)} aria-label={t("แยกกราฟตาม")}><option value="total">{t("ผลงานรวม")}</option><option value="type">{t("แยกตามประเภท")}</option><option value="programme">{t("แยกตามหลักสูตร")}</option></select></div><TrendChart records={raw} start={filters.start} end={filters.end} mode={filters.count} group={group} onSelect={(year, type, programme) => selectChart(year, type, programme)}/></section>
        <section className="card"><div className="cardhead"><div><h2>{t("สัดส่วนประเภทผลงาน")}</h2><p>{t("ภาพรวมการเผยแพร่ทางวิชาการ")}</p></div></div><TypeChart works={works} onSelect={type => selectChart(undefined, type)}/></section></div>
      <div className="lower"><section className="card" id="faculty"><div className="cardhead"><div><h2>{t("อาจารย์ที่มีผลงานสูงสุด")}</h2><p>{t("จำนวนผลงานของแต่ละคนในช่วงที่เลือก")}</p></div><span className="tag">TOP 8</span></div><RankedBars values={groupedCounts(raw, "name", filters.count).slice(0, 8)} faculty onSelect={author => selectChart(undefined, undefined, undefined, author)}/></section>
        <section className="card"><div className="cardhead"><div><h2>{t("ผลงานตามหลักสูตร")}</h2><p>{t("ผลงานหนึ่งชิ้นอาจเกี่ยวข้องกับหลายหลักสูตร")}</p></div></div><RankedBars values={groupedCounts(raw, "programme", filters.count)} onSelect={programme => selectChart(undefined, undefined, programme)}/></section></div>
      <FacultyDirectory data={data} portraits={portraits}/>
      {Object.keys(chartFilter).some(key => chartFilter[key as keyof typeof chartFilter]) && <div className="chart-filter" role="status"><span>{t("ตารางกรองจากกราฟ:")} {[chartFilter.year && yearLabel(chartFilter.year), chartFilter.type && t(TYPE_LABELS[chartFilter.type]), chartFilter.programme && programmeLabel(chartFilter.programme), chartFilter.author].filter(Boolean).join(" · ")}</span><button onClick={() => setChartFilter({})}>{t("ล้างตัวกรองจากกราฟ")}</button></div>}
      <PublicationTable topic={topic} onTopicChange={setTopic} type={filters.type} onTypeChange={type => { setFilters(current => ({ ...current, type })); setChartFilter({}); }} works={visible} query={query} onSearch={setQuery} sort={sort} onSort={setSort} staff={staff} selected={selected} onSelect={setSelected}/>
      <section className="source" id="sources"><b>{t("เกี่ยวกับข้อมูลและวิธีนับ")}</b><p>{t("ข้อมูลต้นฉบับ ")}{records.length}{t(" รายการ · อาจารย์ในไฟล์หลักสูตร ")}{data.staff.length}{t(" คน · ชื่อในไฟล์ผลงานที่ยังจับคู่หลักสูตรไม่ได้ ")}{unmatched.length}{t(" ชื่อ: ")}{unmatched.join(", ")}{t(" โดยคงชื่อเดิมไว้และไม่จับคู่ชื่อที่ไม่ครบโดยอัตโนมัติ")}</p><p>{t("แหล่งข้อมูล: Publications CV-10-2025.csv และ รายละเอียดอาจารย์แต่ละหลักสูตร.xlsx · ปีที่แสดงเป็น พ.ศ. (ค.ศ.) · DE แสดงเป็น DE / AISE ตามหมายเหตุในไฟล์หลักสูตร")}</p><p>{t("ผลงานไม่ซ้ำใช้ข้อความรายละเอียดที่ปรับช่องว่างและตัวพิมพ์ให้ตรงกัน จึงอาจยังมีผลงานเดียวกันที่เขียนต่างรูปแบบ การนับแยกหลักสูตรให้เครดิตทุกหลักสูตรของผู้เขียน และไม่ควรนำผลรวมหลักสูตรมารวมซ้ำ ข้อมูลปี 2025 เป็นข้อมูลตามไฟล์เดือนตุลาคม ไม่ใช่ทั้งปี")}</p></section>
      <footer>CoC Research <span>Academic publications dashboard</span><span className="icon-credit">Icons designed by <a href="https://www.flaticon.com/authors/freepik" target="_blank" rel="noopener noreferrer">Freepik / Magnific</a> from <a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a></span></footer>
    </main>
  </>;
}
