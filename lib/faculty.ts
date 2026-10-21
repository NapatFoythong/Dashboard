import { compareText, prepareRecords, type ResearchData } from "./analytics.ts";
import { canonicalFacultyName } from "./faculty-identity.ts";

export const facultySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const facultyHref = (name: string) => `/faculty/${facultySlug(canonicalFacultyName(name))}/`;

export function facultyNames(data: ResearchData): string[] {
  return [...new Set([...data.staff.map(row => canonicalFacultyName(row.name)), ...data.publications.map(row => canonicalFacultyName(row.name))])].sort(compareText);
}

// Retain the previous short-name URL so existing bookmarks keep working.
export function facultyRouteNames(data: ResearchData): string[] {
  return [...new Set([...facultyNames(data), ...data.staff.map(row => row.name)])].sort(compareText);
}

export function facultyRecords(data: ResearchData, name: string) {
  return prepareRecords(data).filter(row => canonicalFacultyName(row.name) === canonicalFacultyName(name))
    .sort((a, b) => b.year - a.year || a.id - b.id);
}

export interface Portrait {
  image: string;
  thaiName: string;
  source: string;
  cv: string;
  originalImage: string;
  verifiedName: string;
}
