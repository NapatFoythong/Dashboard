"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { compareText, PROGRAMMES, TYPE_LABELS, canonicalProgrammes, prepareRecords, unique, type Programme, type ResearchData } from "@/lib/analytics";
import { canonicalFacultyName as normalizeFacultyName } from "@/lib/faculty-identity";
import { EMPTY_PUBLICATION_OVERLAY, parsePublicationOverlay, type PublicationOverlay } from "@/lib/publication-overlay";
import { useLanguage } from "./language-provider";

type Mode = "login" | "dashboard";
interface AdminRecord {
  id: string;
  source: "source" | "added";
  name: string;
  type: string;
  detail: string;
  year: number;
  month: number;
  index: string;
  psu: string;
  programmes: string[];
  hidden: boolean;
}

const MONTHS_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const TYPES = Object.keys(TYPE_LABELS);

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body;
}

export default function StaffPortal({ mode, data }: { mode: Mode; data: ResearchData }) {
  const { t, language } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [overlay, setOverlay] = useState<PublicationOverlay>(EMPTY_PUBLICATION_OVERLAY);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [type, setType] = useState(TYPES[0]);
  const [detail, setDetail] = useState("");
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(10);
  const [index, setIndex] = useState("");
  const [psu, setPsu] = useState("");
  const faculty = useMemo(() => unique([
    ...data.staff.map(person => normalizeFacultyName(person.name)),
    ...data.publications.map(row => normalizeFacultyName(row.name)),
  ]).sort(compareText), []);
  const [selectedFaculty, setSelectedFaculty] = useState(faculty[0] ?? "");
  const [programmeSelection, setProgrammeSelection] = useState<Programme[]>([]);
  useEffect(() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth() + 1); }, []);

  async function refreshOverlay() {
    const value = await jsonRequest("/api/publications");
    setOverlay(parsePublicationOverlay(value));
  }

  useEffect(() => {
    let alive = true;
    jsonRequest("/api/staff/session").then(session => {
      if (!alive) return;
      setAuthenticated(Boolean(session.authenticated));
      if (session.authenticated) return refreshOverlay().catch(cause => setError(cause instanceof Error ? cause.message : "โหลดข้อมูลไม่สำเร็จ"));
    }).catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : "เชื่อมต่อระบบไม่ได้"); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);

  const records = useMemo<AdminRecord[]>(() => {
    const hidden = new Set(overlay.hidden);
    const base = prepareRecords(data, overlay.programmes).map(row => ({
      id: row.recordKey, source: "source" as const, name: row.name, type: row.type, detail: row.detail,
      year: row.year, month: Number(row.month), index: row.index, psu: row.psu, programmes: row.programmes,
      hidden: hidden.has(row.recordKey),
    }));
    const added = overlay.added.map(row => ({
      id: row.id, source: "added" as const, name: row.name, type: row.type, detail: row.detail,
      year: Number(row.year), month: Number(row.month), index: row.index, psu: row.psu,
      programmes: canonicalProgrammes(overlay.programmes[normalizeFacultyName(row.name)] ?? data.staff.find(person => normalizeFacultyName(person.name) === normalizeFacultyName(row.name))?.programmes ?? []),
      hidden: false,
    }));
    return [...base, ...added].filter(row => showHidden || !row.hidden).sort((a, b) => b.year - a.year || b.month - a.month || compareText(a.name, b.name));
  }, [overlay, showHidden]);
  const visibleRecords = records.filter(row => !search.trim() || `${row.name} ${row.detail} ${row.index} ${row.year} ${row.month} ${MONTHS_TH[row.month - 1] ?? ""} ${MONTHS_EN[row.month - 1] ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 100);

  useEffect(() => {
    const defaultProgrammes = data.staff.find(person => normalizeFacultyName(person.name) === selectedFaculty)?.programmes ?? [];
    setProgrammeSelection(canonicalProgrammes(overlay.programmes[selectedFaculty] ?? defaultProgrammes));
  }, [selectedFaculty, overlay.programmes]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await jsonRequest("/api/staff/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      window.location.assign("/staff/");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เข้าสู่ระบบไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    try { await jsonRequest("/api/staff/logout", { method: "POST" }); window.location.assign("/staff/login/"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "ออกจากระบบไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function addPublication(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      const result = await jsonRequest("/api/staff/publications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authors, type, detail, year, month, index, psu }) });
      await refreshOverlay(); setDetail(""); setAuthors([]); setSuccess(`เพิ่มผลงานสำเร็จ (${result.ids?.length ?? authors.length} รายการผู้เขียน)`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เพิ่มผลงานไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function removeRecord(record: AdminRecord) {
    if (!window.confirm(record.source === "source" ? "ซ่อนรายการนี้จากเว็บสาธารณะหรือไม่? ข้อมูลต้นฉบับจะยังอยู่ในไฟล์หลัก" : "ลบรายการที่ staff เพิ่มนี้หรือไม่?")) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      await jsonRequest(`/api/staff/publications/${encodeURIComponent(record.id)}`, { method: "DELETE" });
      await refreshOverlay(); setSuccess(record.source === "source" ? "ซ่อนรายการแล้ว" : "ลบรายการแล้ว");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "ลบรายการไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function restoreRecord(record: AdminRecord) {
    setBusy(true); setError("");
    try { await jsonRequest(`/api/staff/publications/${encodeURIComponent(record.id)}/restore`, { method: "PUT" }); await refreshOverlay(); setSuccess("นำรายการกลับมาแสดงแล้ว"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "คืนรายการไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  async function saveProgrammes() {
    setBusy(true); setError(""); setSuccess("");
    try {
      await jsonRequest("/api/staff/programmes", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ faculty: selectedFaculty, programmes: programmeSelection }) });
      await refreshOverlay(); setSuccess("บันทึกสังกัดหลักสูตรแล้ว");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  if (mode === "login") return <main className="staff-page staff-login-page">
    <header className="staff-topbar"><a href="/">← {t("กลับหน้าเว็บสาธารณะ")}</a><span>CoC · Staff</span></header>
    <section className="staff-login-card"><p className="staff-eyebrow">COLLEGE OF COMPUTING</p><h1>{t("เข้าสู่ระบบเจ้าหน้าที่")}</h1><p>{t("สำหรับเจ้าหน้าที่ที่ได้รับบัญชีผู้ใช้เท่านั้น")}</p>
      {checking ? <div className="staff-notice">{t("กำลังตรวจสอบสถานะ…")}</div> : authenticated ? <div className="staff-notice">{t("เข้าสู่ระบบแล้ว")} <a href="/staff/">{t("ไปยังระบบจัดการผลงาน →")}</a></div> : <form className="staff-login-form" onSubmit={login}>
        <label>{t("ชื่อผู้ใช้")}<input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required /></label>
        <label>{t("รหัสผ่าน")}<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        {error && <div className="staff-error" role="alert">{error}</div>}
        <button className="staff-primary" disabled={busy}>{busy ? t("กำลังเข้าสู่ระบบ…") : t("เข้าสู่ระบบ")}</button>
      </form>}
    </section>
  </main>;

  if (checking) return <main className="staff-page"><div className="staff-notice">{t("กำลังตรวจสอบสิทธิ์…")}</div></main>;
  if (!authenticated) return <main className="staff-page"><section className="staff-notice staff-denied"><h1>{t("ต้องเข้าสู่ระบบเจ้าหน้าที่")}</h1><p>{t("หน้านี้ใช้จัดการข้อมูลสำหรับเจ้าหน้าที่เท่านั้น")}</p><a className="staff-primary" href="/staff/login/">{t("ไปหน้าเข้าสู่ระบบ")}</a><a href="/">{t("กลับหน้าเว็บสาธารณะ")}</a></section></main>;

  return <main className="staff-page">
    <header className="staff-topbar"><div><a href="/">← {t("กลับหน้าเว็บสาธารณะ")}</a><span className="staff-divider">/</span><b>{t("ระบบจัดการสำหรับเจ้าหน้าที่")}</b></div><button onClick={logout} disabled={busy}>{t("ออกจากระบบ")}</button></header>
    <section className="staff-heading"><div><p className="staff-eyebrow">STAFF WORKSPACE</p><h1>{t("จัดการผลงานทางวิชาการ")}</h1><p>{t("ข้อมูลที่บันทึกจะจัดเก็บใน Cloudflare D1 และแสดงบนหน้าเว็บสาธารณะโดยไม่ต้องแก้โค้ด")}</p></div><span className="staff-count">{overlay.added.length} {t("รายการที่ staff เพิ่ม")}</span></section>
    {(error || success) && <div className={error ? "staff-error staff-alert" : "staff-success staff-alert"} role="status">{error || success}</div>}
    <section className="staff-card">
      <div className="staff-card-head"><div><h2>{t("เพิ่มผลงานใหม่")}</h2><p>{t("เลือกผู้เขียนได้หลายคน ระบบจะบันทึกหนึ่งรายการต่อผู้เขียน")}</p></div><span className="staff-step">01</span></div>
      <form className="staff-form-grid" onSubmit={addPublication}>
        <div className="staff-authors-field"><span className="staff-field-title">{t("ผู้เขียน")}</span>
          <input value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} placeholder={t("ค้นหาชื่ออาจารย์…")}/>
          <div className="staff-author-list">{faculty.filter(name => name.toLowerCase().includes(authorSearch.trim().toLowerCase())).map(name => <label key={name} className="staff-author-choice"><input type="checkbox" checked={authors.includes(name)} onChange={event => setAuthors(current => event.target.checked ? [...current, name] : current.filter(item => item !== name))}/><span>{name}</span></label>)}</div>
          <small>{t("เลือกแล้ว")} {authors.length} {t("คน")}</small>
        </div>
        <label>{t("ประเภทผลงาน")}<select value={type} onChange={event => setType(event.target.value)}>{TYPES.map(value => <option key={value} value={value}>{t(TYPE_LABELS[value])}</option>)}</select></label>
        <label>{t("ปี ค.ศ.")}<input type="number" min={1900} max={2200} value={year} onChange={event => setYear(Number(event.target.value))} required/></label>
        <label>{t("เดือน")}<select value={month} onChange={event => setMonth(Number(event.target.value))}>{MONTHS_TH.map((label, i) => <option key={label} value={i + 1}>{language === "th" ? label : MONTHS_EN[i]}</option>)}</select></label>
        <label>{t("ฐานข้อมูลวิชาการ")}<input value={index} onChange={event => setIndex(event.target.value)} maxLength={160} placeholder="Scopus, TCI…"/></label>
        <label>{t("สังกัด PSU ตามข้อมูลต้นฉบับ")}<select value={psu} onChange={event => setPsu(event.target.value)}><option value="">{t("ไม่ระบุ")}</option><option value="Y">Y</option><option value="N">N</option></select></label>
        <label className="staff-detail-field">{t("รายละเอียดผลงาน")}<textarea value={detail} onChange={event => setDetail(event.target.value)} minLength={5} maxLength={5000} rows={4} required placeholder={t("ชื่อบทความ วารสาร/การประชุม เล่ม ฉบับ หน้า หรือ DOI")}/></label>
        <div className="staff-form-actions"><button className="staff-primary" disabled={busy || !authors.length}>{busy ? t("กำลังบันทึก…") : t("บันทึกผลงาน")}</button></div>
      </form>
    </section>

    <section className="staff-card">
      <div className="staff-card-head"><div><h2>{t("รายการผลงาน")}</h2><p>{t("ค้นหาเพื่อเลือกซ่อนรายการต้นฉบับ หรือลบรายการที่เพิ่มเข้ามา")}</p></div><span className="staff-step">02</span></div>
      <div className="staff-list-tools"><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("ค้นหาชื่อผลงาน อาจารย์ หรือเดือน…")}/><label className="staff-inline-check"><input type="checkbox" checked={showHidden} onChange={event => setShowHidden(event.target.checked)}/>{t("แสดงรายการที่ซ่อนไว้")}</label><span>{records.length.toLocaleString()} {t("รายการ")}</span></div>
      <div className="staff-record-list">{visibleRecords.map(record => <article className={`staff-record${record.hidden ? " is-hidden" : ""}`} key={record.id}>
        <div className="staff-record-date">{language === "th" ? record.year + 543 : record.year}<small>{(language === "th" ? MONTHS_TH : MONTHS_EN)[record.month - 1]} · {record.source === "source" ? t("ไฟล์ต้นฉบับ") : t("เพิ่มโดย staff")}</small></div>
        <div className="staff-record-content"><b>{record.detail}</b><small>{record.name} · {record.programmes.join(" / ") || t("ไม่ระบุหลักสูตร")} · {t(TYPE_LABELS[record.type]) || record.type}</small></div>
        {record.hidden ? <button disabled={busy} onClick={() => restoreRecord(record)}>{t("แสดงกลับ")}</button> : <button className="staff-delete" disabled={busy} onClick={() => removeRecord(record)}>{t("ลบ")}</button>}
      </article>)}{!visibleRecords.length && <div className="staff-empty">{t("ไม่พบรายการที่ตรงกับคำค้นหา")}</div>}{records.length > visibleRecords.length && !search.trim() && <p className="staff-list-hint">{t("แสดง 100 รายการแรก โปรดค้นหาด้วยชื่อหรือคำสำคัญเพื่อหาแถวอื่น")}</p>}</div>
    </section>

    <section className="staff-card">
      <div className="staff-card-head"><div><h2>{t("หลักสูตรของอาจารย์")}</h2><p>{t("กำหนดสังกัดที่ใช้จัดกลุ่มในกราฟและตัวกรอง · MsComp จะไม่แสดง")}</p></div><span className="staff-step">03</span></div>
      <div className="staff-programme-editor"><label>{t("อาจารย์")}<select value={selectedFaculty} onChange={event => setSelectedFaculty(event.target.value)}>{faculty.map(name => <option value={name} key={name}>{name}</option>)}</select></label>
        <div className="staff-programme-options">{PROGRAMMES.map(programme => <label key={programme}><input type="checkbox" checked={programmeSelection.includes(programme)} onChange={event => setProgrammeSelection(current => event.target.checked ? [...current, programme] : current.filter(value => value !== programme))}/>{programme}</label>)}</div>
        <button className="staff-primary" disabled={busy} onClick={saveProgrammes}>{t("บันทึกหลักสูตร")}</button>
      </div>
    </section>
    <footer className="staff-footer"><span>{t("ข้อมูลต้นฉบับยังคงแยกจากรายการที่ staff เพิ่ม")}</span><a href="/">CoC Academic Dashboard</a></footer>
  </main>;
}
