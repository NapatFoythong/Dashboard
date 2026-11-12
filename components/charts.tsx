"use client";
import { useLanguage } from "./language-provider";
import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { programmeShares, programmeColor } from "@/lib/programme-shares";
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
    const shares = programmeShares(records, years, mode);
    const works = countWorks(records, mode);
    const groups = group === "total" ? shares.groups : group === "type" ? unique(records.map(r => r.type)) : shares.groups;
    const series = group === "total" ? shares.series : groups.map(key => years.map(year => works.filter(work => work.year === year && (group === "type" ? work.type === key : work.programmes.includes(key))).length));
    const totals = group === "total" ? shares.totals : years.map((_, i) => series.reduce((sum, values) => sum + values[i], 0));
    const top = Math.ceil(Math.max(1, ...totals) / 5) * 5;
    const step = 652 / Math.max(1, years.length), barWidth = Math.min(40, step * .55), height = 213;
    const color = (index: number) => group === "type" ? COLORS[index % COLORS.length] : programmeColor(groups[index]);
    return <>
    <div className="legend">{groups.map((key, i) => <span key={key}><i style={{ background: color(i) }}/>{t(TYPE_LABELS[key]) || displayProgramme(key)}</span>)}</div>
    <div id="chart">{!records.length ? <div className="empty">{t("ไม่พบผลงานในเงื่อนไขที่เลือก")}</div> : <svg viewBox="0 0 700 260" role="group" aria-label={t("กราฟจำนวนผลงานรายปี")}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="36" x2="688" y1={15 + height * i / 4} y2={15 + height * i / 4} stroke="#edf1ed"/><text x="28" y={19 + height * i / 4} textAnchor="end">{Math.round(top * (1 - i / 4))}</text></g>)}
      {years.map((year, i) => {
                let bottom = 228;
                return <g key={year}>{series.map((values, k) => {
                        const h = values[i] / top * height;
                        bottom -= h;
                        const value = group === "total" ? Number(values[i].toFixed(2)) : values[i];
                        const label = `${formatYear(year)} · ${t(TYPE_LABELS[groups[k]]) || displayProgramme(groups[k])}: ${value}${group === "total" ? ` · ${t("ส่วนแบ่งผลงาน")} · ${t("ผลงานรวม")}: ${totals[i]}` : ""}`;
                        const select = () => onSelect?.(year, group === "type" ? groups[k] : undefined, group !== "type" ? groups[k] : undefined);
                        const geometry = { "--bar-x": `${36 + i * step + (step - barWidth) / 2}px`, "--bar-y": `${bottom}px`, "--bar-width": `${barWidth}px`, "--bar-height": `${h}px`, animationDelay: `${Math.min(i, 10) * 24}ms` } as CSSProperties;
                        return <rect key={groups[k]} className="chart-select trend-bar" style={geometry} role="button" tabIndex={values[i] ? 0 : -1} aria-label={label} onClick={select} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }} x={36 + i * step + (step - barWidth) / 2} y={bottom} width={barWidth} height={h} rx="2" fill={color(k)}><title>{label}</title></rect>;
                    })}{(years.length < 13 || i % Math.ceil(years.length / 10) === 0) && <text x={36 + (i + .5) * step} y="250" textAnchor="middle">{language === "th" ? year + 543 : year}</text>}</g>;
            })}
    </svg>}</div>
    {group === "total" && <p className="chart-hint">{t("สีแสดงสัดส่วนของแต่ละสาขา งานที่เกี่ยวข้องหลายสาขาแบ่งสัดส่วนเท่ากัน ความสูงรวมของแท่งยังเท่ากับจำนวนผลงานรวม กดสีเพื่อดูรายการของสาขานั้น")}</p>}
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
    return <><div id="donut"><div className="ring interactive-ring pie-chart"><svg viewBox="0 0 100 100" aria-label={t("สัดส่วนผลงาน {0} ผลงาน ดูรายละเอียดด้านล่าง", works.length)}><circle cx="50" cy="50" r="50" fill="#edf2f6" />{types.map((type, i) => { const length = works.length ? counts[i] / works.length * 100 : 0; const start = offset; offset += length;
      const point = (percentage: number) => {
        const angle = (percentage / 100 * 360 - 90) * Math.PI / 180;
        return [50 + 50 * Math.cos(angle), 50 + 50 * Math.sin(angle)].join(' ');
      };
      const path = `M 50 50 L ${point(start)} A 50 50 0 0 1 ${point(start + length / 2)} A 50 50 0 0 1 ${point(start + length)} Z`;
      return <path key={type} className="chart-select pie-segment" d={path} style={{ d: `path("${path}")`, opacity: length > 0 ? 1 : 0, pointerEvents: length > 0 ? "auto" : "none" }} aria-hidden={length === 0} fill={COLORS[i]} role="button" tabIndex={length > 0 ? 0 : -1} aria-label={`${t(TYPE_LABELS[type])}: ${counts[i]}`} onClick={() => onSelect?.(type)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(type); } }} />; })}</svg></div><div className="pie-total"><b>{works.length}</b><small>{t("ผลงานทั้งหมด")}</small></div></div>
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
