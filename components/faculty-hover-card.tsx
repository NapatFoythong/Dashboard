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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringFocus = useRef(false);
  const id = useId();
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  function dismiss(restore = false) {
    clearTimer();
    if (restore && panel.current?.contains(document.activeElement)) {
      restoringFocus.current = true;
      trigger.current?.focus({ preventScroll: true });
      queueMicrotask(() => { restoringFocus.current = false; });
    }
    setOpen(false);
  }
  function enter(immediate = false) {
    clearTimer();
    if (restoringFocus.current) return;
    if (immediate) setOpen(true);
    else timer.current = setTimeout(() => setOpen(true), 200);
  }
  function leave() {
    clearTimer();
    timer.current = setTimeout(() => {
      if (document.activeElement === trigger.current || panel.current?.contains(document.activeElement)) return;
      setOpen(false);
    }, 180);
  }
  function blur(next: EventTarget | null) {
    if (next instanceof Node && (panel.current?.contains(next) || trigger.current === next)) return;
    clearTimer(); setOpen(false);
  }
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
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); dismiss(true); } };
    const scroll = (event: Event) => { if (event.target instanceof Node && panel.current?.contains(event.target)) return; dismiss(); };
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) dismiss(); };
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", scroll); window.removeEventListener("pointerdown", outside); };
  }, [open]);
  useEffect(() => () => clearTimer(), []);
  const types = Object.keys(TYPE_LABELS).map(type => ({ type, count: records.filter(row => row.type === type).length })).filter(row => row.count);
  return <>
    <Link ref={trigger} href={href} className="faculty-person" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onMouseEnter={() => enter()} onMouseLeave={leave} onFocus={() => enter(true)} onBlur={event => blur(event.relatedTarget)}
      onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); enter(true); setTimeout(() => panel.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0); } }}>
      <FacultyPortrait name={name} src={portrait?.image} small/><div><b>{name}</b>{original && original !== name && <small>{t("ชื่อใน Excel: ")}{original}</small>}<small>{t("มีผลงาน {0} ผลงาน", records.length)}</small></div><span aria-hidden="true">↗</span>
    </Link>
    {open && createPortal(<div ref={panel} id={id} role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} className="faculty-preview-popup" style={position}
      onMouseEnter={clearTimer} onMouseLeave={leave} onFocusCapture={clearTimer} onBlurCapture={event => blur(event.relatedTarget)}>
      <button className="preview-close" aria-label={t("ปิดตัวอย่างอาจารย์")} onClick={() => dismiss(true)}>✕</button>
      <div className="preview-person"><FacultyPortrait name={name} src={portrait?.image}/><div><h3 id={`${id}-title`}>{name}</h3>{portrait?.thaiName && <p>{portrait.thaiName}</p>}<p>{programmes.map(programmeLabel).join(", ")}</p><strong>{t("มีผลงาน {0} ผลงาน", records.length)}</strong></div></div>
      <p className="preview-scope">{t("สรุปจาก CSV ทุกปี ไม่ขึ้นกับตัวกรองภาพรวม")}</p>
      {!!types.length && <div className="preview-type-counts">{types.map(row => <span key={row.type}>{t(TYPE_LABELS[row.type])} <b>{row.count}</b></span>)}</div>}
      <h4>{t("ตัวอย่างผลงานล่าสุด")}</h4>
      {records.length ? <ol className="preview-works">{records.slice(0, 3).map(row => <li key={row.id}><small>{yearLabel(row.year)}</small><p>{row.detail}</p></li>)}</ol> : <p className="preview-empty">{t("ไม่พบรายการในไฟล์ CSV นี้")}</p>}
      <Link className="preview-all" href={href}>{t("ดูผลงานทั้งหมดของอาจารย์")} ↗</Link>
    </div>, document.body)}
  </>;
}
