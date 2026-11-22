"use client";
import ArticleLinks from "./article-links";
import ReferenceText from "./reference-text";
import { TopicSelect, TopicTags, TopicNote } from "./topic-controls";
import { useLanguage } from "./language-provider";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { TYPE_LABELS, Work } from "@/lib/analytics";
import type { PublicationSort } from "@/lib/publication-sort";
import FacultyPicker from "./faculty-picker";
const MONTHS_TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_EN_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
interface Props {
    works: Work[];
    years: number[];
    yearRange: { start: number; end: number };
    onYearRangeChange: (range: { start: number; end: number }) => void;
    query: string;
    onSearch: (query: string) => void;
    sort: PublicationSort;
    onSort: (sort: PublicationSort) => void;
    staff: string[];
    selected: Set<string>;
    onSelect: (names: Set<string>) => void;
    type: string;
    onTypeChange: (type: string) => void;
    topic: string;
    onTopicChange: (topic: string) => void;
}
export default function PublicationTable({ works, years, yearRange, onYearRangeChange, query, onSearch, sort, onSort, staff, selected, onSelect, type, onTypeChange, topic, onTopicChange }: Props) {
    const { t, language, yearLabel: formatYear, programmeLabel: displayProgramme } = useLanguage();
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState<Work | null>(null);
    const dialog = useRef<HTMLDialogElement>(null);
    const pages = Math.max(1, Math.ceil(works.length / 10));
    const currentPage = Math.min(page, pages);
    useEffect(() => { setPage(1); }, [works]);
    useEffect(() => { if (detail && !dialog.current?.open)
        dialog.current?.showModal(); }, [detail]);
    function close() { dialog.current?.close(); setDetail(null); }
    return <>
    <section className="card publications" id="publications"><div className="cardhead"><div><h2>{t("สำรวจรายการผลงาน ")}<span>({works.length.toLocaleString("en-US")})</span></h2><p>{t("คลิกรายการเพื่ออ่านรายละเอียดและดูผู้เขียนที่เกี่ยวข้อง")}</p><p>{t("ตัวกรองปีของรายการนี้แยกจากช่วงปีกราฟ")}</p></div><input value={query} onChange={e => onSearch(e.target.value)} placeholder={t("ค้นหาผลงาน หรือชื่ออาจารย์…")} aria-label={t("ค้นหารายการผลงาน")}/></div>
      <div className="publication-toolbar"><FacultyPicker staff={staff} selected={selected} onSelect={onSelect}/><label className="type-control">{t("ประเภทผลงาน")}<select value={type} onChange={e => onTypeChange(e.target.value)}><option value="">{t("ทุกประเภท")}</option>{Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</select></label><TopicSelect value={topic} onChange={onTopicChange}/><label className="sort-control">{t("เรียงลำดับ")}<select value={sort} onChange={e => onSort(e.target.value as PublicationSort)}><option value="newest">{t("ปีล่าสุดก่อน")}</option><option value="oldest">{t("ปีเก่าสุดก่อน")}</option><option value="month-newest">{t("เดือนล่าสุดก่อน")}</option><option value="month-oldest">{t("เดือนเก่าสุดก่อน")}</option><option value="title-asc">{t("ชื่อผลงาน A–Z")}</option><option value="title-desc">{t("ชื่อผลงาน Z–A")}</option><option value="author-asc">{t("ชื่ออาจารย์ A–Z")}</option><option value="author-desc">{t("ชื่ออาจารย์ Z–A")}</option><option value="type-asc">{t("ประเภทผลงาน A–Z")}</option><option value="type-desc">{t("ประเภทผลงาน Z–A")}</option></select></label><div className="publication-year-range" aria-label={t("ช่วงปีของรายการผลงาน")}><label>{t("ปีเริ่มต้น")}<select value={yearRange.start} onChange={e => { const start = Number(e.target.value); onYearRangeChange({ start, end: Math.max(start, yearRange.end) }); }}>{years.map(year => <option key={year} value={year}>{formatYear(year)}</option>)}</select></label><span>–</span><label>{t("ปีสิ้นสุด")}<select value={yearRange.end} onChange={e => { const end = Number(e.target.value); onYearRangeChange({ start: Math.min(yearRange.start, end), end }); }}>{years.map(year => <option key={year} value={year}>{formatYear(year)}</option>)}</select></label></div></div>
      <TopicNote /><div className="tablewrap"><table><thead><tr><th aria-sort={sort === "newest" ? "descending" : sort === "oldest" ? "ascending" : "none"}><button className="textbtn" onClick={() => onSort(sort === "newest" ? "oldest" : "newest")}>{t("ปีเผยแพร่ ")}{sort === "newest" ? "↓" : sort === "oldest" ? "↑" : "↕"}</button></th><th>{t("รายละเอียดผลงาน")}</th><th>{t("อาจารย์ / หลักสูตร")}</th><th>{t("ประเภท / ฐานข้อมูลวิชาการ")}</th></tr></thead><tbody>
        {works.slice((currentPage - 1) * 10, currentPage * 10).map(work => { const monthIndex = Number(work.month) - 1; const monthLabel = monthIndex >= 0 && monthIndex < 12 ? (language === "th" ? MONTHS_TH_SHORT[monthIndex] : MONTHS_EN_SHORT[monthIndex]) : t("ไม่ระบุ"); return <tr key={work.id}><td><b>{language === "th" ? work.year + 543 : work.year}</b><small>{monthLabel} · {language === "th" ? work.year : `BE ${work.year + 543}`}</small></td><td><button className="pubtitle" onClick={() => setDetail(work)}>{work.detail}</button><TopicTags detail={work.detail} /><ArticleLinks detail={work.detail} /></td><td>{work.authors.map(author => <div key={author}><Link className="faculty-link" href={facultyHref(author)}>{author}</Link></div>)}<small>{work.programmes.map(displayProgramme).join(", ")}</small></td><td>{t(TYPE_LABELS[work.type]) || work.type}<small><span className="badge">{(work.indexes ?? [work.index]).filter(Boolean).join(" / ") || t("ไม่ระบุ")}</span></small></td></tr>; })}
        {!works.length && <tr><td colSpan={4} className="empty">{t("ไม่พบรายการที่ตรงกับตัวกรอง")}</td></tr>}
      </tbody></table></div><div className="pagination"><span aria-live="polite">{t("หน้า ")}{currentPage} / {pages} · {works.length}{t(" รายการ")}</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t("← ก่อนหน้า")}</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>{t("ถัดไป →")}</button></div></div>
    </section>
    <dialog ref={dialog} aria-labelledby="detail-title" onCancel={() => setDetail(null)} onClose={() => setDetail(null)}><button className="textbtn close-detail" onClick={close}>{t("ปิด ✕")}</button>{detail && <><h2 id="detail-title">{t(TYPE_LABELS[detail.type]) || detail.type} · {formatYear(detail.year)}</h2><p><ReferenceText text={detail.detail} /></p><TopicTags detail={detail.detail} /><ArticleLinks detail={detail.detail} showMissing /><p><b>{t("อาจารย์:")}</b> {detail.authors.map((author, i) => <span key={author}>{i > 0 && ", "}<Link className="faculty-link" href={facultyHref(author)}>{author}</Link></span>)}<br /><b>{t("หลักสูตร:")}</b> {detail.programmes.map(displayProgramme).join(", ")}<br /><b>{t("ฐานข้อมูลวิชาการ:")}</b> {(detail.indexes ?? [detail.index]).filter(Boolean).join(" / ") || t("ไม่ระบุ")}<br /><b>{t("สังกัด PSU ตามรายการต้นฉบับ:")}</b> {detail.psu || t("ไม่ระบุ")}</p></>}</dialog>
  </>;
}
