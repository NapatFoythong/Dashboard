"use client";
import DataGuide from "./data-guide";
import VisitorCounter from "./visitor-counter";
import { researchTopics } from "@/lib/research-topics";
import { useLanguage } from "./language-provider";
import { useEffect, useMemo, useState } from "react";
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
import { canonicalProgrammes, countWorks, DEFAULT_FILTERS, filterRecords, Filters as FilterValues, groupedCounts, GroupMode, PROGRAMMES, ResearchData, searchWorks, unique, TYPE_LABELS } from "@/lib/analytics";
import { EMPTY_PUBLICATION_OVERLAY, mergePublications, parsePublicationOverlay, type PublicationOverlay } from "@/lib/publication-overlay";
import { groupedProgrammeCounts, programmeChartGroup } from "@/lib/programme-shares";
export default function Dashboard({ data }: {
    data: ResearchData;
}) {
    const { t, language, yearLabel, programmeLabel } = useLanguage();
    const [overlay, setOverlay] = useState<PublicationOverlay>(EMPTY_PUBLICATION_OVERLAY);
    useEffect(() => {
      let alive = true;
      let lastRefresh = 0;
      const refreshOverlay = () => {
        if (!alive || Date.now() - lastRefresh < 1000) return;
        lastRefresh = Date.now();
        fetch("/api/publications", { cache: "no-store" }).then(response => response.ok ? response.json() : null)
          .then(value => { if (alive && value) setOverlay(parsePublicationOverlay(value)); })
          .catch(() => { /* Static CSV data remains available when D1 has not been configured. */ });
      };
      refreshOverlay();
      window.addEventListener("focus", refreshOverlay);
      document.addEventListener("visibilitychange", refreshOverlay);
      return () => {
        alive = false;
        window.removeEventListener("focus", refreshOverlay);
        document.removeEventListener("visibilitychange", refreshOverlay);
      };
    }, []);
    const records = useMemo(() => mergePublications(data, overlay), [data, overlay]);
    const staff = useMemo(() => unique([...data.staff.map(person => canonicalFacultyName(person.name)), ...records.map(row => row.name)]).sort(), [data, records]);
    const roster = useMemo(() => data.staff.map(person => canonicalFacultyName(person.name)), [data]);
    const effectiveData = useMemo<ResearchData>(() => ({
      staff: data.staff.map(person => {
        const name = canonicalFacultyName(person.name);
        return { ...person, programmes: canonicalProgrammes(overlay.programmes[name] ?? person.programmes) };
      }),
      publications: records.map(({ id: _id, year, ...row }) => ({ ...row, year: String(year) })),
    }), [data, records, overlay.programmes]);
    const programmes = useMemo(() => [...PROGRAMMES], []);
    const indexes = useMemo(() => unique(records.map(row => row.index)).sort(), [records]);
    const years = useMemo(() => { const values = records.map(row => row.year); const first = Math.min(...values); return Array.from({ length: Math.max(...values) - first + 1 }, (_, i) => first + i); }, [records]);
    const [filters, setFilters] = useState<FilterValues>({ ...DEFAULT_FILTERS });
    const [selected, setSelected] = useState(() => new Set(roster));
    useEffect(() => {
      const addedAuthors = records.filter(row => row.recordKey.startsWith("added-")).map(row => row.name);
      if (addedAuthors.length) setSelected(current => new Set([...current, ...addedAuthors]));
    }, [records, data.publications.length]);
    const [group, setGroup] = useState<GroupMode>("total");
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState<PublicationSort>("newest");
    const [topic, setTopic] = useState("");
    const [chartFilter, setChartFilter] = useState<{ year?: number; type?: string; programme?: string; author?: string }>({});
    function focusTable() { document.getElementById("publications")?.scrollIntoView?.({ behavior: "smooth", block: "start" }); }
    function selectChart(year?: number, type?: string, programme?: string, author?: string) { setChartFilter({ year, type, programme, author }); focusTable(); }
    function selectFaculty(names: Set<string>) { setSelected(names); setChartFilter({}); }
    const raw = useMemo(() => filterRecords(records, filters, selected), [records, filters, selected]);
    const works = useMemo(() => countWorks(raw, filters.count), [raw, filters.count]);
    const visible = useMemo(() => orderWorks(searchWorks(works.filter(work => (!topic || (topic === "unclassified" ? !researchTopics(work.detail).length : researchTopics(work.detail).includes(topic))) && (!chartFilter.author || work.authors.includes(chartFilter.author)) && (!chartFilter.year || work.year === chartFilter.year) && (!chartFilter.type || work.type === chartFilter.type) && (!chartFilter.programme || work.programmes.some(programme => programmeChartGroup(programme) === chartFilter.programme))), query, -1), sort), [works, query, sort, chartFilter, topic]);
    const scopus = works.filter(work => (work.indexes ?? [work.index]).some(index => /scopus/i.test(index))).length;
    const statistics = [
        { title: t("ผลงานทางวิชาการ"), value: works.length, note: filters.count === "unique" ? t("ผลงานไม่ซ้ำตามข้อความรายละเอียด") : t("รายการที่บันทึกแยกตามอาจารย์") },
        { title: t("อาจารย์ที่มีผลงาน"), value: unique(raw.map(row => row.name)).length, note: t("จากรายชื่อที่เลือก {0} คน", selected.size) },
        { title: t("ผลงานในฐาน Scopus"), value: scopus, note: t("{0}% ของผลงานที่แสดง", works.length ? Math.round(scopus / works.length * 100) : 0) },
        { title: t("ประเภทผลงาน"), value: unique(raw.map(row => row.type)).length, note: t("วารสารและการประชุมวิชาการ") },
    ];
    function reset() { setFilters({ ...DEFAULT_FILTERS }); setSelected(new Set(roster)); setGroup("total"); setQuery(""); setSort("newest"); setTopic(""); setChartFilter({}); }
    return <>
    <aside><CocBrand /><div className="navlabel">RESEARCH WORKSPACE</div><SidebarNav /><div className="asidefoot"><span className="dot"/>{t("ข้อมูลจากไฟล์ที่นำเข้า")}<small>{t("Publications CV · ตุลาคม 2025")}</small><VisitorCounter /></div></aside>
    <main id="overview"><header><div className="desktop-breadcrumb">{t("วิทยาลัยการคอมพิวเตอร์ ")}<span>/</span>{t(" ภาพรวมผลงานวิจัย")}</div><CocBrand className="mobile-brand"/><div className="header-actions"><LanguageSwitcher /></div></header>
      <section className="heading"><div><p className="eyebrow">ACADEMIC PERFORMANCE</p><h1>{t("ผลงานทางวิชาการของอาจารย์")}</h1><p>{t("สำรวจผลงานวิจัย เชื่อมโยงข้อมูล และติดตามแนวโน้มของวิทยาลัยการคอมพิวเตอร์")}</p><div className="heading-context"><span>{t("ช่วงปีที่แสดง")} <b>{yearLabel(filters.start)} – {yearLabel(filters.end)}</b></span><span>{t("อาจารย์ที่เลือก")} <b>{selected.size}</b></span></div></div><svg className="research-art" viewBox="0 0 380 210" fill="none" aria-hidden="true" focusable="false">
        <circle cx="212" cy="106" r="88" stroke="#48b9c4" strokeOpacity=".2" strokeDasharray="4 8"/>
        <circle cx="212" cy="106" r="64" fill="#e0f2f4"/>
        <path d="M94 61L210 104L306 48M210 104L315 158M210 104L111 168" stroke="#7bb9c7" strokeWidth="2"/>
        <rect x="158" y="44" width="104" height="128" rx="16" fill="#123f59"/>
        <path d="M180 72H221M180 85H237M180 98H222" stroke="#b5dee7" strokeWidth="5" strokeLinecap="round"/>
        <path d="M180 146L195 130L209 137L238 111" stroke="#50d4d4" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="94" cy="61" r="26" fill="white" stroke="#cae4e9"/>
        <path d="M83 66V57L94 51L105 57V66M88 71V62H100V71" stroke="#258b9d" strokeWidth="2" strokeLinejoin="round"/>
        <rect x="282" y="24" width="48" height="48" rx="14" fill="#d7edf1"/>
        <path d="M296 39H316M296 48H310M296 57H314" stroke="#32889d" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="315" cy="158" r="24" fill="white" stroke="#cce5e9"/>
        <circle cx="315" cy="152" r="6" stroke="#258b9d" strokeWidth="2"/>
        <path d="M304 170C304 159 326 159 326 170" stroke="#258b9d" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="111" cy="168" r="8" fill="#35b8c3"/>
        <circle cx="274" cy="102" r="5" fill="#c63141"/>
        <circle cx="143" cy="28" r="4" fill="#84bccd"/>
      </svg></section>
      <Filters filters={filters} years={years} programmes={programmes} indexes={indexes} staff={staff} selected={selected} onChange={next => { setFilters(next); setChartFilter({}); }} onSelect={selectFaculty} onReset={reset}/>
      <DataGuide /><div className="stats" aria-live="polite">{statistics.map(stat => <div className="stat" key={stat.title}><label>{stat.title}</label><strong>{stat.value.toLocaleString("en-US")}</strong><small>{stat.note}</small></div>)}</div>
      <p className="chart-hint">{t("กดแท่งกราฟหรือส่วนของกราฟวงกลมเพื่อกรองรายการผลงานด้านล่าง")}</p>
      <div className="charts"><section className="card trend"><div className="cardhead"><div><h2>{t("แนวโน้มผลงานทางวิชาการ")}</h2><p>{t("จำนวนผลงานในแต่ละปีตามตัวกรองที่เลือก")}</p></div><select value={group} onChange={e => setGroup(e.target.value as GroupMode)} aria-label={t("แยกกราฟตาม")}><option value="total">{t("ผลงานรวม")}</option><option value="type">{t("แยกตามประเภท")}</option><option value="programme">{t("แยกตามหลักสูตร")}</option></select></div><TrendChart records={raw} start={filters.start} end={filters.end} mode={filters.count} group={group} onSelect={(year, type, programme) => selectChart(year, type, programme)}/></section>
        <section className="card type-chart-card"><div className="cardhead"><div><h2>{t("สัดส่วนประเภทผลงาน")}</h2><p>{t("ภาพรวมการเผยแพร่ทางวิชาการ")}</p></div></div><TypeChart works={works} onSelect={type => selectChart(undefined, type)}/></section></div>
      <div className="lower"><section className="card" id="faculty"><div className="cardhead"><div><h2>{t("อาจารย์ที่มีผลงานสูงสุด")}</h2><p>{t("จำนวนผลงานของแต่ละคนในช่วงที่เลือก")}</p></div><span className="tag">TOP 8</span></div><RankedBars values={groupedCounts(raw, "name", filters.count).slice(0, 8)} faculty onSelect={author => selectChart(undefined, undefined, undefined, author)}/></section>
        <section className="card"><div className="cardhead"><div><h2>{t("ผลงานตามหลักสูตร")}</h2><p>{t("ผลงานหนึ่งชิ้นอาจเกี่ยวข้องกับหลายหลักสูตร")}</p></div></div><RankedBars values={groupedProgrammeCounts(raw, filters.count)} onSelect={programme => selectChart(undefined, undefined, programme)}/></section></div>
      <FacultyDirectory data={effectiveData} portraits={portraits}/>
      {Object.keys(chartFilter).some(key => chartFilter[key as keyof typeof chartFilter]) && <div className="chart-filter" role="status"><span>{t("ตารางกรองจากกราฟ:")} {[chartFilter.year && yearLabel(chartFilter.year), chartFilter.type && t(TYPE_LABELS[chartFilter.type]), chartFilter.programme && programmeLabel(chartFilter.programme), chartFilter.author].filter(Boolean).join(" · ")}</span><button onClick={() => setChartFilter({})}>{t("ล้างตัวกรองจากกราฟ")}</button></div>}
      <PublicationTable topic={topic} onTopicChange={setTopic} type={filters.type} onTypeChange={type => { setFilters(current => ({ ...current, type })); setChartFilter({}); }} works={visible} query={query} onSearch={setQuery} sort={sort} onSort={setSort} staff={staff} selected={selected} onSelect={selectFaculty}/>
      <section className="source" id="sources">
        <b>{t("เกี่ยวกับข้อมูลและวิธีนับ")}</b>
        <p>{t("ข้อมูลจากไฟล์ผลงานและรายชื่อหลักสูตร ณ ตุลาคม 2025 รวม {0} รายการ และอาจารย์ในรายชื่อหลัก {1} คน", data.publications.length, data.staff.length)}</p>
        <p>{t("นับผลงานไม่ซ้ำจากรายละเอียดที่ตรงกัน ผลงานหนึ่งชิ้นอาจอยู่ได้หลายหลักสูตร ดูวิธีนับเพิ่มเติมในหัวข้อ “วิธีนับและขอบเขตข้อมูล”")}</p>
      </section>
      <div className="mobile-visitor"><VisitorCounter /></div>
      <footer>CoC Research <span>Academic publications dashboard</span><a className="staff-entry-link" href="/staff/login/">{t("เข้าสู่ระบบเจ้าหน้าที่")}</a><span className="icon-credit">Icons designed by <a href="https://www.flaticon.com/authors/freepik" target="_blank" rel="noopener noreferrer">Freepik / Magnific</a> from <a href="https://www.flaticon.com/" target="_blank" rel="noopener noreferrer">Flaticon</a></span></footer>
    </main>
  </>;
}
