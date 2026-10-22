"use client";
import { useLanguage } from "./language-provider";
import { Fragment } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { COLORS, CountMode, countWorks, GroupMode, Publication, TYPE_LABELS, unique, Work } from "@/lib/analytics";
interface TrendProps {
    records: Publication[];
    start: number;
    end: number;
    mode: CountMode;
    group: GroupMode;
    onSelect?: (year: number, type?: string, programme?: string) => void;
}
export function TrendChart({ records, start, end, mode, group, onSelect }: TrendProps) {
    const { t, language, yearLabel: formatYear, programmeLabel: displayProgramme } = useLanguage();
    const years = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
    const groups = group === "total" ? [t("ผลงานรวม")] : group === "type" ? unique(records.map(r => r.type)) : unique(records.flatMap(r => r.programmes));
    const series = groups.map(key => years.map(year => countWorks(records.filter(r => r.year === year && (group === "total" || (group === "type" ? r.type === key : r.programmes.includes(key)))), mode).length));
    const top = Math.ceil(Math.max(1, ...years.map((_, i) => series.reduce((sum, values) => sum + values[i], 0))) / 5) * 5;
    const step = 652 / Math.max(1, years.length), barWidth = Math.min(40, step * .55), height = 213;
    return <>
    <div className="legend">{groups.map((key, i) => <span key={key}><i style={{ background: COLORS[i % COLORS.length] }}/>{t(TYPE_LABELS[key]) || displayProgramme(key)}</span>)}</div>
    <div id="chart">{!records.length ? <div className="empty">{t("ไม่พบผลงานในเงื่อนไขที่เลือก")}</div> : <svg viewBox="0 0 700 260" role="group" aria-label={t("กราฟจำนวนผลงานรายปี")}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="36" x2="688" y1={15 + height * i / 4} y2={15 + height * i / 4} stroke="#edf1ed"/><text x="28" y={19 + height * i / 4} textAnchor="end">{Math.round(top * (1 - i / 4))}</text></g>)}
      {years.map((year, i) => {
                let bottom = 228;
                return <g key={year}>{series.map((values, k) => {
                        const h = values[i] / top * height;
                        bottom -= h;
                        const label = `${formatYear(year)} · ${t(TYPE_LABELS[groups[k]]) || displayProgramme(groups[k])}: ${values[i]}`;
                        const select = () => onSelect?.(year, group === "type" ? groups[k] : undefined, group === "programme" ? groups[k] : undefined);
                        return <rect key={groups[k]} className="chart-select" role="button" tabIndex={values[i] ? 0 : -1} aria-label={label} onClick={select} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }} x={36 + i * step + (step - barWidth) / 2} y={bottom} width={barWidth} height={h} rx="2" fill={COLORS[k % COLORS.length]}><title>{label}</title></rect>;
                    })}{(years.length < 13 || i % Math.ceil(years.length / 10) === 0) && <text x={36 + (i + .5) * step} y="250" textAnchor="middle">{language === "th" ? year + 543 : year}</text>}</g>;
            })}
    </svg>}</div>
    {group === "programme" && <p>{t("แต่ละหลักสูตรได้รับเครดิตเต็ม ผลรวมแท่งอาจสูงกว่าจำนวนผลงานไม่ซ้ำ")}</p>}
  </>;
}
export function TypeChart({ works, onSelect }: {
    works: Work[];
    onSelect?: (type: string) => void;
}) {
    const { t, language, yearLabel: formatYear, programmeLabel: displayProgramme } = useLanguage();
    const types = Object.keys(TYPE_LABELS), counts = types.map(type => works.filter(work => work.type === type).length);
    let offset = 0;
    return <><div id="donut"><div className="ring interactive-ring"><svg viewBox="0 0 100 100" aria-label={t("สัดส่วนผลงาน {0} ผลงาน ดูรายละเอียดด้านล่าง", works.length)}><circle cx="50" cy="50" r="40" fill="none" stroke="#edf1ed" strokeWidth="20" />{types.map((type, i) => { const length = works.length ? counts[i] / works.length * 100 : 0; const start = offset; offset += length; return length > 0 && <circle key={type} className="chart-select" cx="50" cy="50" r="40" fill="none" stroke={COLORS[i]} strokeWidth="20" pathLength="100" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-start} transform="rotate(-90 50 50)" role="button" tabIndex={0} aria-label={`${t(TYPE_LABELS[type])}: ${counts[i]}`} onClick={() => onSelect?.(type)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(type); } }} />; })}</svg><div className="ringcenter"><b>{works.length}</b><small>{t("ผลงานทั้งหมด")}</small></div></div></div>
    <div id="types">{types.map((type, i) => <button type="button" className="typeitem" key={type} onClick={() => onSelect?.(type)} disabled={!counts[i]}><span><i style={{ background: COLORS[i] }}/>{t(TYPE_LABELS[type])}</span><b>{counts[i]} <span className="percentage">({works.length ? Math.round(counts[i] / works.length * 100) : 0}%)</span></b></button>)}</div></>;
}
export function RankedBars({ values, faculty = false, onSelect }: {
    values: {
        key: string;
        count: number;
    }[];
    faculty?: boolean;
    onSelect?: (key: string) => void;
}) {
    const { t, language, yearLabel: formatYear, programmeLabel: displayProgramme } = useLanguage();
    if (!values.length)
        return <p>{t("ไม่พบข้อมูล")}</p>;
    return values.map(({ key, count }, i) => faculty ? <div className="rank" key={key}><span className="ranknum">{String(i + 1).padStart(2, "0")}</span><div className="ranklabel"><Link className="faculty-link" href={facultyHref(key)}>{key}</Link><button className="bar rank-filter" aria-label={`${key}: ${count}`} onClick={() => onSelect?.(key)}><i style={{ width: `${count / values[0].count * 100}%` }}/></button></div><b>{count}</b></div> : <Fragment key={key}><button className="programrow programme-filter" onClick={() => onSelect?.(key)}><span className="programme-label"><span>{displayProgramme(key)}</span><b>{count} <small>{t("ผลงาน")}</small></b></span><span className="bar"><i style={{ width: `${count / values[0].count * 100}%`, background: COLORS[i % COLORS.length] }}/></span></button></Fragment>);
}
