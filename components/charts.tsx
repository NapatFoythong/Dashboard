import { Fragment } from "react";
import Link from "next/link";
import { facultyHref } from "@/lib/faculty";
import { COLORS, CountMode, countWorks, GroupMode, programmeLabel, Publication, TYPE_LABELS, unique, Work } from "@/lib/analytics";

interface TrendProps { records: Publication[]; start: number; end: number; mode: CountMode; group: GroupMode }
export function TrendChart({ records, start, end, mode, group }: TrendProps) {
  const years = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  const groups = group === "total" ? ["ผลงานรวม"] : group === "type" ? unique(records.map(r => r.type)) : unique(records.flatMap(r => r.programmes));
  const series = groups.map(key => years.map(year => countWorks(records.filter(r => r.year === year && (group === "total" || (group === "type" ? r.type === key : r.programmes.includes(key)))), mode).length));
  const top = Math.ceil(Math.max(1, ...years.map((_, i) => series.reduce((sum, values) => sum + values[i], 0))) / 5) * 5;
  const step = 652 / Math.max(1, years.length), barWidth = Math.min(40, step * .55), height = 213;
  return <>
    <div className="legend">{groups.map((key, i) => <span key={key}><i style={{ background: COLORS[i % COLORS.length] }} />{TYPE_LABELS[key] || programmeLabel(key)}</span>)}</div>
    <div id="chart">{!records.length ? <div className="empty">ไม่พบผลงานในเงื่อนไขที่เลือก</div> : <svg viewBox="0 0 700 260" role="img" aria-label="กราฟจำนวนผลงานรายปี">
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="36" x2="688" y1={15 + height * i / 4} y2={15 + height * i / 4} stroke="#edf1ed" /><text x="28" y={19 + height * i / 4} textAnchor="end">{Math.round(top * (1 - i / 4))}</text></g>)}
      {years.map((year, i) => {
        let bottom = 228;
        return <g key={year}>{series.map((values, k) => {
          const h = values[i] / top * height; bottom -= h;
          return <rect key={groups[k]} x={36 + i * step + (step - barWidth) / 2} y={bottom} width={barWidth} height={h} rx="2" fill={COLORS[k % COLORS.length]}><title>{`${year + 543} (${year}) · ${TYPE_LABELS[groups[k]] || programmeLabel(groups[k])}: ${values[i]}`}</title></rect>;
        })}{(years.length < 13 || i % Math.ceil(years.length / 10) === 0) && <text x={36 + (i + .5) * step} y="250" textAnchor="middle">{year + 543}</text>}</g>;
      })}
    </svg>}</div>
    {group === "programme" && <p>แต่ละหลักสูตรได้รับเครดิตเต็ม ผลรวมแท่งอาจสูงกว่าจำนวนผลงานไม่ซ้ำ</p>}
  </>;
}

export function TypeChart({ works }: { works: Work[] }) {
  const types = Object.keys(TYPE_LABELS), counts = types.map(type => works.filter(work => work.type === type).length);
  let angle = 0;
  const segments = counts.map((value, i) => { const from = angle; angle += works.length ? value / works.length * 100 : 0; return `${COLORS[i]} ${from}% ${angle}%`; });
  return <><div id="donut"><div className="ring" role="img" aria-label={`สัดส่วนผลงาน ${works.length} ผลงาน ดูรายละเอียดด้านล่าง`} style={{ background: works.length ? `conic-gradient(${segments.join(",")})` : "#edf1ed" }}><div className="ringcenter"><b>{works.length}</b><small>ผลงานทั้งหมด</small></div></div></div>
    <div id="types">{types.map((type, i) => <div className="typeitem" key={type}><span><i style={{ background: COLORS[i] }} />{TYPE_LABELS[type]}</span><b>{counts[i]} <span className="percentage">({works.length ? Math.round(counts[i] / works.length * 100) : 0}%)</span></b></div>)}</div></>;
}

export function RankedBars({ values, faculty = false }: { values: { key: string; count: number }[]; faculty?: boolean }) {
  if (!values.length) return <p>ไม่พบข้อมูล</p>;
  return values.map(({ key, count }, i) => faculty ? <div className="rank" key={key}><span className="ranknum">{String(i + 1).padStart(2, "0")}</span><div className="ranklabel"><Link className="faculty-link" href={facultyHref(key)}>{key}</Link><div className="bar"><i style={{ width: `${count / values[0].count * 100}%` }} /></div></div><b>{count}</b></div> : <Fragment key={key}><div className="programrow"><div><span>{programmeLabel(key)}</span><b>{count} <small>ผลงาน</small></b></div><div className="bar"><i style={{ width: `${count / values[0].count * 100}%`, background: COLORS[i % COLORS.length] }} /></div></div></Fragment>);
}
