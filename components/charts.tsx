"use client";
import { useLanguage } from "./language-provider";
import { Fragment, useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
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

type ChartSelection = { year?: number; type?: string; programme?: string };
type ChartPayload = Record<string, unknown>;

function MatplotlibChart({ endpoint, payload, onSelect }: {
    endpoint: string;
    payload: ChartPayload;
    onSelect: (selection: ChartSelection) => void;
}) {
    const { t } = useLanguage();
    const body = JSON.stringify(payload);
    const [svg, setSvg] = useState("");
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setSvg("");
        setError(false);
        fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            cache: "no-store",
            signal: controller.signal,
        }).then(async response => {
            if (controller.signal.aborted) return;
            if (!response.ok) throw new Error("Chart API unavailable");
            const result: { svg?: unknown } = await response.json();
            if (controller.signal.aborted) return;
            if (typeof result.svg !== "string" || !result.svg.trimStart().startsWith("<svg")) throw new Error("Invalid chart response");
            setSvg(result.svg);
            setError(false);
        }).catch(reason => {
            if (reason?.name !== "AbortError") setError(true);
        });
        return () => controller.abort();
    }, [endpoint, body, attempt]);

    function select(event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
        if (event.type === "keydown") {
            const keyEvent = event as KeyboardEvent<HTMLDivElement>;
            if (keyEvent.key !== "Enter" && keyEvent.key !== " ") return;
            keyEvent.preventDefault();
        }
        const target = event.target instanceof Element ? event.target.closest<SVGGElement | SVGPathElement>(".matplotlib-selectable") : null;
        if (!target) return;
        const yearValue = target.getAttribute("data-year");
        const type = target.getAttribute("data-type") || undefined;
        const programme = target.getAttribute("data-programme") || undefined;
        onSelect({ year: yearValue ? Number(yearValue) : undefined, type, programme });
    }

    if (error) return <div className="chart-api-error" role="alert"><span>{t("โหลดกราฟไม่สำเร็จ ตรวจสอบว่า Python API กำลังทำงานอยู่")}</span><button type="button" onClick={() => setAttempt(value => value + 1)}>{t("ลองอีกครั้ง")}</button></div>;
    if (!svg) return <div className="chart-api-loading" role="status" aria-live="polite">{t("กำลังสร้างกราฟด้วย Matplotlib…")}</div>;
    return <div className="matplotlib-output" onClick={select} onKeyDown={select} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function TrendChart({ records, start, end, mode, group, onSelect }: TrendProps) {
    const { t, language, programmeLabel: displayProgramme } = useLanguage();
    const years = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
    const shares = programmeShares(records, years, mode);
    const works = countWorks(records, mode);
    const groups = group === "total" ? shares.groups : group === "type" ? unique(records.map(r => r.type)) : shares.groups;
    const series = group === "total" ? shares.series : groups.map(key => years.map(year => works.filter(work => work.year === year && (group === "type" ? work.type === key : work.programmes.includes(key))).length));
    const totals = group === "total" ? shares.totals : years.map((_, i) => series.reduce((sum, values) => sum + values[i], 0));
    const color = (index: number) => group === "type" ? COLORS[index % COLORS.length] : programmeColor(groups[index]);
    const payload = {
        years,
        year_labels: years.map(year => language === "th" ? String(year + 543) : String(year)),
        totals,
        group,
        total_label: t("ผลงานรวม"),
        aria_label: t("กราฟจำนวนผลงานรายปี"),
        series: groups.map((key, index) => ({
            key,
            label: t(TYPE_LABELS[key]) || displayProgramme(key),
            color: color(index),
            values: series[index],
        })),
    };
    return <>
    <div className="legend">{groups.map((key, i) => <span key={key}><i style={{ background: color(i) }}/>{t(TYPE_LABELS[key]) || displayProgramme(key)}</span>)}</div>
    <div id="chart">{!records.length ? <div className="empty">{t("ไม่พบผลงานในเงื่อนไขที่เลือก")}</div> : <MatplotlibChart endpoint="/api/charts/trend" payload={payload} onSelect={({ year, type, programme }) => { if (year) onSelect?.(year, type, programme); }}/>}</div>
    {group === "total" && <p className="chart-hint">{t("สีแสดงสัดส่วนของแต่ละสาขา งานที่เกี่ยวข้องหลายสาขาแบ่งสัดส่วนเท่ากัน ความสูงรวมของแท่งยังเท่ากับจำนวนผลงานรวม กดสีเพื่อดูรายการของสาขานั้น")}</p>}
    {group === "programme" && <p>{t("แต่ละหลักสูตรได้รับเครดิตเต็ม ผลรวมแท่งอาจสูงกว่าจำนวนผลงานไม่ซ้ำ")}</p>}
  </>;
}
export function TypeChart({ works, onSelect }: {
    works: Work[];
    onSelect?: (type: string) => void;
}) {
    const { t } = useLanguage();
    const types = Object.keys(TYPE_LABELS), counts = types.map(type => works.filter(work => work.type === type).length);
    const payload = { total: works.length, aria_label: t("สัดส่วนผลงาน {0} ผลงาน ดูรายละเอียดด้านล่าง", works.length), items: types.map((type, index) => ({ key: type, label: t(TYPE_LABELS[type]), color: COLORS[index], value: counts[index] })) };
    return <><div id="donut"><MatplotlibChart endpoint="/api/charts/pie" payload={payload} onSelect={({ type }) => { if (type) onSelect?.(type); }}/><div className="pie-total"><b>{works.length}</b><small>{t("ผลงานทั้งหมด")}</small></div></div>
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
