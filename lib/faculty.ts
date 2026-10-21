import { compareText, prepareRecords, type ResearchData } from "./analytics.ts";

export const facultySlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const facultyHref = (name: string) => `/faculty/${facultySlug(name)}/`;

export function facultyNames(data: ResearchData): string[] {
  return [...new Set([...data.staff.map(row => row.name), ...data.publications.map(row => row.name)])].sort(compareText);
}

export function facultyRecords(data: ResearchData, name: string) {
  // Match the complete CSV name exactly; do not infer identity from first names.
  return prepareRecords(data).filter(row => row.name === name)
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
