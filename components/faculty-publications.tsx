"use client";
import ArticleLinks from "./article-links";
import ReferenceText from "./reference-text";
import { TopicSelect, TopicTags, TopicNote } from "./topic-controls";
import { researchTopics, matchesResearchQuery } from "@/lib/research-topics";
import { useLanguage } from "./language-provider";
import { useEffect, useMemo, useState } from "react";
import { normalize, TYPE_LABELS, unique, type Publication } from "@/lib/analytics";
const MONTHS_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export default function FacultyPublications({ records, name }: {
    records: Publication[];
    name: string;
}) {
    const { t, language, yearLabel: formatYear } = useLanguage();
    const [query, setQuery] = useState("");
    useEffect(() => { setQuery(new URLSearchParams(window.location.search).get("q") ?? ""); setPage(1); }, [name]);
    const [year, setYear] = useState("");
    const [month, setMonth] = useState("");
    const [dateOrder, setDateOrder] = useState<"newest" | "oldest">("newest");
    const [type, setType] = useState("");
    const [topic, setTopic] = useState("");
    const [page, setPage] = useState(1);
    const years = unique(records.map(row => row.year)).sort((a, b) => b - a);
    const types = unique(records.map(row => row.type));
    const visible = useMemo(() => records.filter(row => (!year || row.year === Number(year)) && (!month || Number(row.month) === Number(month)) && (!type || row.type === type) && (!topic || (topic === "unclassified" ? !researchTopics(row.detail).length : researchTopics(row.detail).includes(topic))) && matchesResearchQuery(row.detail, query, name)).sort((a, b) => dateOrder === "newest" ? b.year - a.year || (Number(b.month) || 0) - (Number(a.month) || 0) || a.id - b.id : a.year - b.year || (Number(a.month) || 0) - (Number(b.month) || 0) || a.id - b.id), [records, year, month, dateOrder, type, query, topic, name]);
    const pages = Math.max(1, Math.ceil(visible.length / 10));
    const current = Math.min(page, pages);
    return <section className="card faculty-works"><div className="cardhead"><div><h2>{t("รายการผลงานของ ")}{name}</h2><p>{t("แสดงทุกรายการตามผู้เขียน ไม่รวมแถวเข้าด้วยกัน · เริ่มต้นแสดงทุกปี")}</p></div></div>
    <TopicNote /><div className="faculty-controls"><label>{t("ปีเผยแพร่")}<select value={year} onChange={e => { setYear(e.target.value); setPage(1); }}><option value="">{t("ทุกปี")}</option>{years.map(y => <option key={y} value={y}>{formatYear(y)}</option>)}</select></label><label>{t("เดือน")}<select value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}><option value="">{t("ทุกเดือน")}</option>{MONTHS_TH.map((label, i) => <option key={label} value={i + 1}>{language === "th" ? label : MONTHS_EN[i]}</option>)}</select></label><label>{t("เรียงตามวันที่")}<select value={dateOrder} onChange={e => { setDateOrder(e.target.value as "newest" | "oldest"); setPage(1); }}><option value="newest">{t("เดือนล่าสุดก่อน")}</option><option value="oldest">{t("เดือนเก่าสุดก่อน")}</option></select></label><label>{t("ประเภทผลงาน")}<select value={type} onChange={e => { setType(e.target.value); setPage(1); }}><option value="">{t("ทุกประเภท")}</option>{types.map(typeKey => <option key={typeKey} value={typeKey}>{t(TYPE_LABELS[typeKey]) || typeKey}</option>)}</select></label><label>{t("ค้นหาในรายละเอียด")}<input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder={t("ชื่อผลงานหรือคำสำคัญ…")}/></label><TopicSelect value={topic} onChange={value => { setTopic(value); setPage(1); }}/><button onClick={() => { setTopic(""); setQuery(""); setYear(""); setMonth(""); setType(""); setDateOrder("newest"); setPage(1); }}>{t("ล้างตัวกรอง")}</button></div>
    <p className="faculty-results" aria-live="polite">{t("พบ ")}{visible.length}{t(" จากทั้งหมด ")}{records.length}{t(" รายการ")}</p>
    <ol className="faculty-publications" start={(current - 1) * 10 + 1}>{visible.slice((current - 1) * 10, current * 10).map(row => <li key={row.id}><div className="work-meta"><b>{formatYear(row.year)}</b><span className="badge">{t(TYPE_LABELS[row.type]) || row.type}</span></div><p className="work-detail"><ReferenceText text={row.detail} /></p><TopicTags detail={row.detail} /><ArticleLinks detail={row.detail} showMissing /><dl><div><dt>Type</dt><dd>{row.type}</dd></div><div><dt>Month / Year</dt><dd>{row.month || t("ไม่ระบุ")} / {row.year}</dd></div><div><dt>Indexing</dt><dd>{row.index || t("ไม่ระบุ")}</dd></div><div><dt>PSU affiliation</dt><dd>{row.psu || t("ไม่ระบุ")}</dd></div></dl></li>)}</ol>
    {!visible.length && <div className="empty">{records.length ? t("ไม่พบผลงานที่ตรงกับตัวกรอง") : t("ไม่พบรายการของอาจารย์ในไฟล์ Publications CV-10-2025.csv ที่แนบมา จึงยังไม่สามารถแสดงผลงานได้จากชุดข้อมูลนี้")}</div>}
    <div className="pagination"><span>{t("หน้า ")}{current} / {pages}</span><div><button disabled={current === 1} onClick={() => setPage(current - 1)}>{t("← ก่อนหน้า")}</button><button disabled={current === pages} onClick={() => setPage(current + 1)}>{t("ถัดไป →")}</button></div></div>
  </section>;
}
