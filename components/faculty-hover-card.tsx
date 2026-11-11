"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Publication } from "@/lib/analytics";
import { TYPE_LABELS } from "@/lib/analytics";
import type { Portrait } from "@/lib/faculty";
import FacultyPortrait from "./faculty-portrait";
import { useLanguage } from "./language-provider";

export default function FacultyHoverCard({ name, original, portrait, records, programmes, href }: {
  name: string; original?: string; portrait?: Portrait; records: Publication[]; programmes: string[]; href: string;
}) {
  const { t, yearLabel, programmeLabel } = useLanguage();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const trigger = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect(), popup = panel.current.getBoundingClientRect();
    let left = anchor.right + 12;
    if (left + popup.width > window.innerWidth - 12) left = anchor.left - popup.width - 12;
    left = Math.max(12, Math.min(left, window.innerWidth - popup.width - 12));
    const top = Math.max(12, Math.min(anchor.top, window.innerHeight - popup.height - 12));
    setPosition({ left, top });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", dismiss); };
  }, [open]);
  const types = Object.keys(TYPE_LABELS).map(type => ({ type, count: records.filter(row => row.type === type).length })).filter(row => row.count);
  return <>
    <Link ref={trigger} href={href} className="faculty-person" aria-describedby={open ? id : undefined}
      onMouseEnter={() => setOpen(true)} onMouseMove={() => { if (!open) setOpen(true); }} onMouseLeave={() => setOpen(false)}
      onPointerEnter={event => { if (event.pointerType !== "touch") setOpen(true); }} onPointerLeave={() => setOpen(false)}>
      <FacultyPortrait name={name} src={portrait?.image} small/><div><b>{name}</b>{original && original !== name && <small>{t("ชื่อใน Excel: ")}{original}</small>}<small>{t("มีผลงาน {0} ผลงาน", records.length)}</small></div><span aria-hidden="true">↗</span>
    </Link>
    {open && createPortal(<div ref={panel} id={id} role="tooltip" className="faculty-preview-popup" style={position}>
      <div className="preview-person"><FacultyPortrait name={name} src={portrait?.image}/><div><h3 id={`${id}-title`}>{name}</h3>{portrait?.thaiName && <p>{portrait.thaiName}</p>}<p>{programmes.map(programmeLabel).join(", ")}</p><strong>{t("มีผลงาน {0} ผลงาน", records.length)}</strong></div></div>
      <p className="preview-scope">{t("สรุปจาก CSV ทุกปี ไม่ขึ้นกับตัวกรองภาพรวม")}</p>
      {!!types.length && <div className="preview-type-counts">{types.map(row => <span key={row.type}>{t(TYPE_LABELS[row.type])} <b>{row.count}</b></span>)}</div>}
      <h4>{t("ตัวอย่างผลงานล่าสุด")}</h4>
      {records.length ? <ol className="preview-works">{records.slice(0, 3).map(row => <li key={row.id}><small>{yearLabel(row.year)}</small><p>{row.detail}</p></li>)}</ol> : <p className="preview-empty">{t("ไม่พบรายการในไฟล์ CSV นี้")}</p>}
    </div>, document.body)}
  </>;
}
