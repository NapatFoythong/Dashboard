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
const RECORDS_PER_PAGE = 20;

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
  const [page, setPage] = useState(1);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [type, setType] = useState(TYPES[0]);
  const [detail, setDetail] = useState("");
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(10);
  const [index, setIndex] = useState("");
  const [psu, setPsu] = useState("");
  const faculty = useMemo(() => unique([
    ...data.staff.map(person => normalizeFacultyName(person.name)),
    ...data.publications.map(row => normalizeFacultyName(row.name)),
  ]).sort(compareText), []);
  const [selectedFaculty, setSelectedFaculty] = useState(faculty[0] ?? "");
  const [programmeSelection, setProgrammeSelection] = useState<Programme[]>([]);
  useEffect(() => { setMonth(new Date().getMonth() + 1); }, []);

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
  const filteredRecords = records.filter(row => !search.trim() || `${row.name} ${row.detail} ${row.index} ${row.year} ${row.month} ${MONTHS_TH[row.month - 1] ?? ""} ${MONTHS_EN[row.month - 1] ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = filteredRecords.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);
  const pageNumbers: (number | "ellipsis")[] = pageCount <= 7
    ? Array.from({ length: pageCount }, (_, i) => i + 1)
    : currentPage <= 3
      ? [1, 2, 3, 4, 5, "ellipsis", pageCount]
      : currentPage >= pageCount - 2
        ? [1, "ellipsis", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount]
        : [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", pageCount];
  const rangeStart = filteredRecords.length ? (currentPage - 1) * RECORDS_PER_PAGE + 1 : 0;
  const rangeEnd = Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length);
  const matchingFaculty = faculty.filter(name => name.toLowerCase().includes(authorSearch.trim().toLowerCase()));
  const allMatchingFacultySelected = matchingFaculty.length > 0 && matchingFaculty.every(name => authors.includes(name));

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
    const enteredYear = Number(yearInput);
    const yearCE = enteredYear >= 2400 ? enteredYear - 543 : enteredYear;
    if (!authors.length) { setError(t("กรุณาเลือกอาจารย์อย่างน้อย 1 คน")); setBusy(false); return; }
    if (!Number.isInteger(enteredYear) || yearCE < 1900 || yearCE > 2200) { setError(t("กรุณาระบุปี ค.ศ. หรือ พ.ศ. ให้ถูกต้อง")); setBusy(false); return; }
    if (detail.trim().length < 5) { setError(t("กรุณากรอกรายละเอียดผลงานอย่างน้อย 5 ตัวอักษร")); setBusy(false); return; }
    try {
      const result = await jsonRequest("/api/staff/publications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authors, type, detail: detail.trim(), year: yearCE, month, index: index.trim(), psu }) });
      await refreshOverlay(); setDetail(""); setAuthors([]); setAuthorSearch(""); setPage(1); setSuccess(t("เพิ่มผลงานสำเร็จ {0} รายการ", result.ids?.length ?? authors.length));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เพิ่มผลงานไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  function clearPublicationForm() {
    setAuthors([]);
    setAuthorSearch("");
    setType(TYPES[0]);
    setDetail("");
    setYearInput(String(new Date().getFullYear()));
    setMonth(new Date().getMonth() + 1);
    setIndex("");
    setPsu("");
    setError("");
    setSuccess("");
  }

  function toggleMatchingFaculty() {
    const matching = new Set(matchingFaculty);
    setAuthors(current => allMatchingFacultySelected
      ? current.filter(name => !matching.has(name))
      : unique([...current, ...matchingFaculty]));
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
    <section className="staff-card staff-add-publication">
      <div className="staff-card-head"><div><h2>{t("เพิ่มผลงานใหม่")}</h2><p>{t("กรอกข้อมูลหลัก เลือกผู้เขียน ระบุรายละเอียดผลงาน แล้วบันทึก")}</p></div><span className="staff-step">01</span></div>
      <form className="staff-publication-form" onSubmit={addPublication}>
        <section className="staff-entry-section" aria-labelledby="staff-author-heading">
          <div className="staff-entry-heading"><span className="staff-entry-number">1</span><div><h3 id="staff-author-heading">{t("เลือกผู้เขียน")}</h3><p>{t("ผลงานหนึ่งชิ้นจะถูกเพิ่มให้ผู้เขียนที่เลือกแต่ละคน")}</p></div><span className="staff-selection-count">{authors.length} {t("คนที่เลือก")}</span></div>
          <div className="staff-author-picker">
            <div className="staff-author-toolbar"><input type="search" value={authorSearch} onChange={event => setAuthorSearch(event.target.value)} aria-label={t("ค้นหาชื่ออาจารย์…")} placeholder={t("ค้นหาชื่ออาจารย์…")}/><button type="button" className="staff-text-button" onClick={toggleMatchingFaculty} disabled={!matchingFaculty.length}>{allMatchingFacultySelected ? t("ยกเลิกเลือกผลลัพธ์") : t("เลือกผลลัพธ์ทั้งหมด")}</button></div>
            {authors.length > 0 && <div className="staff-selected-authors" aria-label={t("ผู้เขียนที่เลือก")}>{authors.map(name => <span className="staff-author-chip" key={name}>{name}<button type="button" aria-label={`${t("นำออก")} ${name}`} onClick={() => setAuthors(current => current.filter(item => item !== name))}>×</button></span>)}</div>}
            <div className="staff-author-list">{matchingFaculty.map(name => <label key={name} className={`staff-author-choice${authors.includes(name) ? " is-selected" : ""}`}><input type="checkbox" checked={authors.includes(name)} onChange={event => setAuthors(current => event.target.checked ? unique([...current, name]) : current.filter(item => item !== name))}/><span>{name}</span></label>)}{!matchingFaculty.length && <p className="staff-author-empty">{t("ไม่พบชื่ออาจารย์")}</p>}</div>
            <small className="staff-help-text">{t("เลือกผู้เขียนตามที่ระบุในผลงาน หากเลือกหลายคนระบบจะบันทึกรายการแยกตามผู้เขียน")}</small>
          </div>
        </section>

        <section className="staff-entry-section" aria-labelledby="staff-publication-heading">
          <div className="staff-entry-heading"><span className="staff-entry-number">2</span><div><h3 id="staff-publication-heading">{t("กรอกข้อมูลผลงาน")}</h3><p>{t("ใส่ข้อมูลอ้างอิงที่มี ใช้ DOI หรือ URL ได้ถ้ามี")}</p></div></div>
          <div className="staff-core-fields">
            <label className="staff-detail-field">{t("ชื่อผลงานและรายละเอียดอ้างอิง")}<textarea value={detail} onChange={event => setDetail(event.target.value)} minLength={5} maxLength={5000} rows={5} required placeholder={t("ชื่อบทความ วารสาร/การประชุม เล่ม ฉบับ หน้า หรือ DOI")}/><small className="staff-help-text">{t("วาง DOI หรือ URL ไว้ในรายละเอียดได้ ระบบจะแสดงเป็นลิงก์ผลงานบนเว็บ")}</small></label>
            <div className="staff-core-metadata">
              <label>{t("ประเภทผลงาน")}<select value={type} onChange={event => setType(event.target.value)} required>{TYPES.map(value => <option key={value} value={value}>{t(TYPE_LABELS[value])}</option>)}</select></label>
              <label>{t("ปี ค.ศ. หรือ พ.ศ.")}<input type="number" min={1900} max={2743} value={yearInput} onChange={event => setYearInput(event.target.value)} required/><small className="staff-help-text">{t("กรอกได้ทั้งปี ค.ศ. และ พ.ศ. เช่น 2024 หรือ 2567")}</small></label>
              <label>{t("เดือน")}<select value={month} onChange={event => setMonth(Number(event.target.value))} required>{MONTHS_TH.map((label, i) => <option key={label} value={i + 1}>{language === "th" ? label : MONTHS_EN[i]}</option>)}</select></label>
            </div>
          </div>
        </section>

        <details className="staff-optional-fields">
          <summary>{t("ข้อมูลเพิ่มเติม (ไม่จำเป็น)")}</summary>
          <div className="staff-optional-grid">
            <label>{t("ฐานข้อมูลที่จัดทำดัชนี")}<input value={index} onChange={event => setIndex(event.target.value)} maxLength={160} list="staff-index-options" placeholder="Scopus, Web of Science, TCI…"/><datalist id="staff-index-options"><option value="Scopus"/><option value="Web of Science"/><option value="SCIE (Web of Science)"/><option value="SSCI (Web of Science)"/><option value="TCI"/><option value="Others"/></datalist><small className="staff-help-text">{t("ระบุฐานที่ค้นพบผลงานนี้ ไม่ใช่ประเภทผลงาน")}</small></label>
            <label>{t("สังกัด PSU ในผลงาน")}<select value={psu} onChange={event => setPsu(event.target.value)}><option value="">{t("ไม่ระบุ")}</option><option value="Y">Y</option><option value="N">N</option></select><small className="staff-help-text">{t("เลือก Y หรือ N เมื่อทราบข้อมูลสังกัด")}</small></label>
          </div>
        </details>

        <div className="staff-form-actions"><button type="button" className="staff-secondary" onClick={clearPublicationForm} disabled={busy}>{t("ล้างแบบฟอร์ม")}</button><button className="staff-primary" disabled={busy}>{busy ? t("กำลังบันทึก…") : t("เพิ่มผลงาน")}</button></div>
      </form>
    </section>

    <section className="staff-card">
      <div className="staff-card-head"><div><h2>{t("หลักสูตรของอาจารย์")}</h2><p>{t("กำหนดสังกัดที่ใช้จัดกลุ่มในกราฟและตัวกรอง · MsComp จะไม่แสดง")}</p></div><span className="staff-step">02</span></div>
      <div className="staff-programme-editor"><label>{t("อาจารย์")}<select value={selectedFaculty} onChange={event => setSelectedFaculty(event.target.value)}>{faculty.map(name => <option value={name} key={name}>{name}</option>)}</select></label>
        <div className="staff-programme-options">{PROGRAMMES.map(programme => <label key={programme}><input type="checkbox" checked={programmeSelection.includes(programme)} onChange={event => setProgrammeSelection(current => event.target.checked ? [...current, programme] : current.filter(value => value !== programme))}/>{programme}</label>)}</div>
        <button className="staff-primary" disabled={busy} onClick={saveProgrammes}>{t("บันทึกหลักสูตร")}</button>
      </div>
    </section>

    <section className="staff-card">
      <div className="staff-card-head"><div><h2>{t("รายการผลงาน")}</h2><p>{t("ค้นหาเพื่อเลือกซ่อนรายการต้นฉบับ หรือลบรายการที่เพิ่มเข้ามา")}</p></div><span className="staff-step">03</span></div>
      <div className="staff-list-tools"><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder={t("ค้นหาชื่อผลงาน อาจารย์ หรือเดือน…")}/><label className="staff-inline-check"><input type="checkbox" checked={showHidden} onChange={event => { setShowHidden(event.target.checked); setPage(1); }}/>{t("แสดงรายการที่ซ่อนไว้")}</label><span>{filteredRecords.length.toLocaleString()} {t("รายการ")}</span></div>
      <div className="staff-record-list">{visibleRecords.map(record => <article className={`staff-record${record.hidden ? " is-hidden" : ""}`} key={record.id}>
        <div className="staff-record-date">{language === "th" ? record.year + 543 : record.year}<small>{(language === "th" ? MONTHS_TH : MONTHS_EN)[record.month - 1]} · {record.source === "source" ? t("ไฟล์ต้นฉบับ") : t("เพิ่มโดย staff")}</small></div>
        <div className="staff-record-content"><b>{record.detail}</b><small>{record.name} · {record.programmes.join(" / ") || t("ไม่ระบุหลักสูตร")} · {t(TYPE_LABELS[record.type]) || record.type}</small></div>
        {record.hidden ? <button disabled={busy} onClick={() => restoreRecord(record)}>{t("แสดงกลับ")}</button> : <button className="staff-delete" disabled={busy} onClick={() => removeRecord(record)}>{t("ลบ")}</button>}
      </article>)}{!visibleRecords.length && <div className="staff-empty">{t("ไม่พบรายการที่ตรงกับคำค้นหา")}</div>}</div>
      {filteredRecords.length > 0 && <div className="staff-pagination">
        <span className="staff-page-range">{t("แสดง {0}–{1} จาก {2} รายการ", rangeStart, rangeEnd, filteredRecords.length)}</span>
        {pageCount > 1 && <nav className="staff-page-controls" aria-label={t("หน้ารายการผลงาน")}>
          <button type="button" className="staff-page-arrow" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label={t("หน้าก่อนหน้า")}>‹</button>
          {pageNumbers.map((item, i) => item === "ellipsis"
            ? <span className="staff-page-ellipsis" key={`ellipsis-${i}`} aria-hidden="true">…</span>
            : <button type="button" className={`staff-page-number${item === currentPage ? " is-active" : ""}`} key={item} onClick={() => setPage(item)} aria-label={t("หน้า {0}", item)} aria-current={item === currentPage ? "page" : undefined}>{item}</button>)}
          <button type="button" className="staff-page-arrow" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label={t("หน้าถัดไป")}>›</button>
        </nav>}
      </div>}
    </section>
    <footer className="staff-footer"><span>{t("ข้อมูลต้นฉบับยังคงแยกจากรายการที่ staff เพิ่ม")}</span><a href="/">CoC Academic Dashboard</a></footer>
  </main>;
}
