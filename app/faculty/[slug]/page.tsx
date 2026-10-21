import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import data from "@/data/research.json";
import portraitData from "@/data/staff-portraits.json";
import { facultyRouteNames, facultyRecords, facultySlug, type Portrait } from "@/lib/faculty";
import { canonicalFacultyName } from "@/lib/faculty-identity";
import { programmeLabel } from "@/lib/analytics";
import FacultyPortrait from "@/components/faculty-portrait";
import FacultyPublications from "@/components/faculty-publications";

const portraits: Record<string, Portrait> = portraitData;
export function generateStaticParams() { return facultyRouteNames(data).map(name => ({ slug: facultySlug(name) })); }
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const matched = facultyRouteNames(data).find(value => facultySlug(value) === slug);
  const name = matched ? canonicalFacultyName(matched) : undefined;
  return { title: `${name || "อาจารย์"} | CoC Research` };
}

export default async function FacultyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const matched = facultyRouteNames(data).find(value => facultySlug(value) === slug);
  if (!matched) notFound();
  const name = canonicalFacultyName(matched);
  const records = facultyRecords(data, name);
  const portrait = portraits[name];
  const staff = data.staff.find(row => canonicalFacultyName(row.name) === name);
  return <main className="faculty-page"><header><Link href="/#faculty-directory" className="back-link">← กลับแดชบอร์ด</Link><span className="tag">CoC RESEARCH</span></header>
    <section className="card faculty-hero"><FacultyPortrait name={name} src={portrait?.image} /><div className="faculty-bio"><p className="eyebrow">ACADEMIC PROFILE</p><h1>{name}</h1><p>ชื่ออาจารย์ตามข้อมูล CSV{!records.length ? " / Excel" : ""}</p>{staff && <p>หลักสูตรตาม Excel: {staff.programmes.map(programmeLabel).join(", ")}</p>}{staff && staff.name !== name && <p>ชื่อใน Excel: {staff.name} · จับคู่ชื่อเต็มจาก CSV และ CV ทางการแล้ว</p>}
      <div className="faculty-summary"><div><strong>{records.length}</strong><span>รายการผลงานตาม CSV</span></div><div><strong>{new Set(records.map(row => row.type)).size}</strong><span>ประเภทผลงาน</span></div><div><strong>{records.length ? `${Math.min(...records.map(row => row.year)) + 543}–${Math.max(...records.map(row => row.year)) + 543}` : "—"}</strong><span>ช่วงปี พ.ศ. ที่มีข้อมูล</span></div></div>
      {portrait && <a className="profile-source" href={portrait.cv} target="_blank" rel="noreferrer">ดู CV และแหล่งที่มาของรูปจากวิทยาลัยฯ ↗</a>}
    </div></section>
    <FacultyPublications records={records} name={name} />
    <section className="source"><b>แหล่งข้อมูล</b><p>ชื่อและรายการผลงานจาก Publications CV-10-2025.csv คงข้อความรายละเอียด ประเภท เดือน ปี ฐานดัชนี และสถานะสังกัด PSU ตามไฟล์ ไม่เพิ่มผลงานจาก CV ออนไลน์ ข้อมูลเป็น snapshot เดือนตุลาคม 2025</p><p>มีการปรับช่องว่างและตัวพิมพ์ชื่อระหว่างนำเข้า แต่ไม่จับคู่หรือรวมผู้เขียนที่ชื่อไม่ตรงกันโดยอัตโนมัติ {portrait && <a href={portrait.source} target="_blank" rel="noreferrer">รูปจากหน้าบุคลากรสายวิชาการของวิทยาลัยการคอมพิวเตอร์</a>}</p></section>
  </main>;
}
