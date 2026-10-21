"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { programmeLabel, TYPE_LABELS, Work, yearLabel } from "@/lib/analytics";

interface Props { works: Work[]; query: string; onSearch: (query: string) => void; sort: number; onSort: () => void }

export default function PublicationTable({ works, query, onSearch, sort, onSort }: Props) {
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Work | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pages = Math.max(1, Math.ceil(works.length / 10));
  const currentPage = Math.min(page, pages);
  useEffect(() => { setPage(1); }, [works]);
  useEffect(() => { if (detail && !dialog.current?.open) dialog.current?.showModal(); }, [detail]);
  function close() { dialog.current?.close(); setDetail(null); }
  return <>
    <section className="card publications" id="publications"><div className="cardhead"><div><h2>สำรวจรายการผลงาน <span>({works.length.toLocaleString("en-US")})</span></h2><p>คลิกรายการเพื่ออ่านรายละเอียดและดูผู้เขียนที่เกี่ยวข้อง</p></div><input value={query} onChange={e => onSearch(e.target.value)} placeholder="ค้นหาผลงาน หรือชื่ออาจารย์…" aria-label="ค้นหารายการผลงาน" /></div>
      <div className="tablewrap"><table><thead><tr><th aria-sort={sort === -1 ? "descending" : "ascending"}><button className="textbtn" onClick={onSort}>ปีเผยแพร่ {sort === -1 ? "↓" : "↑"}</button></th><th>รายละเอียดผลงาน</th><th>อาจารย์ / หลักสูตร</th><th>ประเภท / ฐานดัชนี</th></tr></thead><tbody>
        {works.slice((currentPage - 1) * 10, currentPage * 10).map(work => <tr key={work.id}><td><b>{work.year + 543}</b><small>{work.year}</small></td><td><button className="pubtitle" onClick={() => setDetail(work)}>{work.detail}</button></td><td>{work.authors.map(author => <div key={author}><Link className="faculty-link" href={facultyHref(author)}>{author}</Link></div>)}<small>{work.programmes.map(programmeLabel).join(", ")}</small></td><td>{TYPE_LABELS[work.type] || work.type}<small><span className="badge">{work.index || "ไม่ระบุ"}</span></small></td></tr>)}
        {!works.length && <tr><td colSpan={4} className="empty">ไม่พบรายการที่ตรงกับตัวกรอง</td></tr>}
      </tbody></table></div><div className="pagination"><span aria-live="polite">หน้า {currentPage} / {pages} · {works.length} รายการ</span><div><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← ก่อนหน้า</button><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>ถัดไป →</button></div></div>
    </section>
    <dialog ref={dialog} aria-labelledby="detail-title" onCancel={() => setDetail(null)} onClose={() => setDetail(null)}><button className="textbtn close-detail" onClick={close}>ปิด ✕</button>{detail && <><h2 id="detail-title">{TYPE_LABELS[detail.type] || detail.type} · {yearLabel(detail.year)}</h2><p>{detail.detail}</p><p><b>อาจารย์:</b> {detail.authors.map((author, i) => <span key={author}>{i > 0 && ", "}<Link className="faculty-link" href={facultyHref(author)}>{author}</Link></span>)}<br /><b>หลักสูตร:</b> {detail.programmes.map(programmeLabel).join(", ")}<br /><b>ฐานดัชนี:</b> {detail.index || "ไม่ระบุ"}<br /><b>สังกัด PSU ตามรายการต้นฉบับ:</b> {detail.psu || "ไม่ระบุ"}</p></>}</dialog>
  </>;
}
