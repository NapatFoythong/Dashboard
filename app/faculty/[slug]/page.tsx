import FacultyProfile from "@/components/faculty-profile";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import data from "@/data/research.json";
import portraitData from "@/data/staff-portraits.json";
import { facultyRouteNames, facultyRecords, facultySlug, type Portrait } from "@/lib/faculty";
import { canonicalFacultyName } from "@/lib/faculty-identity";

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
  return <FacultyProfile name={name} records={records} portrait={portrait} staff={staff} />;
}
