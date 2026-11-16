import { canonicalFacultyName } from "./faculty-identity.ts";
import { matchesResearchQuery } from "./research-topics.ts";

export interface SourcePublication {
  name: string;
  type: string;
  detail: string;
  year: string;
  month: string;
  index: string;
  psu: string;
  /** Stable source row key. Added publications receive a key from D1. */
  recordKey?: string;
  /** Optional programme override for imported or staff-managed records. */
  programmes?: string[];
}
export interface ResearchData {
  staff: { name: string; programmes: string[]; original: string }[];
  publications: SourcePublication[];
}
export interface Publication extends Omit<SourcePublication, "year"> {
  id: number;
  recordKey: string;
  year: number;
  programmes: string[];
}
export interface Work extends Publication { authors: string[]; indexes?: string[] }
export type CountMode = "unique" | "records";
export type GroupMode = "total" | "type" | "programme";
export interface Filters {
  start: number;
  end: number;
  month: string;
  programme: string;
  type: string;
  index: string;
  psu: boolean;
  count: CountMode;
}
export const DEFAULT_FILTERS: Filters = {
  start: 2020, end: 2024, month: "", programme: "", type: "", index: "", psu: false, count: "unique",
};
export const COLORS = ["#33c0ca", "#003c71", "#b52324", "#729bc0"];
export const TYPE_LABELS: Record<string, string> = {
  "International Journal Articles": "วารสารนานาชาติ",
  "International Proceedings": "ประชุมวิชาการนานาชาติ",
  "National Journal Articles": "วารสารระดับชาติ",
  "National Proceedings": "ประชุมวิชาการระดับชาติ",
};
export const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export const yearLabel = (year: number) => `${year + 543} (${year})`;
export const unique = <T,>(values: T[]): T[] => [...new Set(values)];
export const PROGRAMMES = ["AISE", "DE", "COMP", "Dbiz"] as const;
export type Programme = typeof PROGRAMMES[number];
export const UNASSIGNED_PROGRAMME = "ยังไม่ระบุหลักสูตร";
export function canonicalProgramme(value: string): Programme | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "aise") return "AISE";
  if (normalized === "de") return "DE";
  if (normalized === "comp") return "COMP";
  if (normalized === "dbiz") return "Dbiz";
  return null;
}
export function canonicalProgrammes(values: string[]): Programme[] {
  return unique(values.map(canonicalProgramme).filter((value): value is Programme => value !== null));
}
export function assignedProgrammes(values: string[]): string[] {
  const programmes = canonicalProgrammes(values);
  return programmes.length ? programmes : [UNASSIGNED_PROGRAMME];
}
export const programmeLabel = (value: string) => canonicalProgramme(value) ?? value;

// SSR and browsers may use different default locales/ICU versions.
// Code-unit ordering is deterministic in both environments.
export const compareText = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;

function hashSourceRow(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function prepareRecords(data: ResearchData, programmeOverrides: Record<string, string[]> = {}): Publication[] {
  const mapping = new Map(data.staff.map(person => {
    const key = canonicalFacultyName(person.name);
    return [key, canonicalProgrammes(programmeOverrides[key] ?? person.programmes)] as const;
  }));
  return data.publications.map((row, id) => ({
    ...row, id, recordKey: `source-${id}-${hashSourceRow(`${row.name}|${row.type}|${row.detail}|${row.year}|${row.month}`)}`,
    year: Number(row.year), index: row.index.trim(),
    programmes: assignedProgrammes(row.programmes ?? programmeOverrides[canonicalFacultyName(row.name)] ?? mapping.get(canonicalFacultyName(row.name)) ?? []),
  }));
}

export function filterRecords(records: Publication[], filters: Filters, selected: Set<string>): Publication[] {
  return records.filter(row => row.year >= filters.start && row.year <= filters.end
    && selected.has(row.name)
    && (!filters.month || Number(row.month) === Number(filters.month))
    && (!filters.programme || row.programmes.includes(filters.programme))
    && (!filters.type || row.type === filters.type)
    && (!filters.index || row.index === (filters.index === "__empty__" ? "" : filters.index))
    && (!filters.psu || row.psu === "Y"));
}

export function countWorks(rows: Publication[], mode: CountMode): Work[] {
  if (mode === "records") return rows.map(row => ({ ...row, authors: [row.name], indexes: [row.index] }));
  const works = new Map<string, Work>();
  for (const row of rows) {
    const key = normalize(row.detail);
    const existing = works.get(key);
    if (existing) {
      existing.authors = unique([...existing.authors, row.name]);
      existing.programmes = unique([...existing.programmes, ...row.programmes]);
      existing.indexes = unique([...(existing.indexes ?? [existing.index]), row.index]);
    } else {
      works.set(key, { ...row, authors: [row.name], programmes: [...row.programmes], indexes: [row.index] });
    }
  }
  return [...works.values()];
}

export function searchWorks(works: Work[], query: string, sort: number): Work[] {
  return works.filter(row => matchesResearchQuery(row.detail, query, row.authors.join(" ")))
    .sort((a, b) => sort * (a.year - b.year) || compareText(a.detail, b.detail) || a.id - b.id);
}

export function groupedCounts(records: Publication[], group: "name" | "programme", mode: CountMode) {
  const keys = unique(group === "name" ? records.map(row => row.name) : [...PROGRAMMES, ...records.flatMap(row => row.programmes)]);
  return keys.map(key => ({ key, count: countWorks(records.filter(row =>
    group === "name" ? row.name === key : row.programmes.includes(key)), mode).length }))
    .sort((a, b) => b.count - a.count || compareText(a.key, b.key));
}

export function exportCsv(works: Work[]): string {
  const rows = [["ปี ค.ศ.", "ปี พ.ศ.", "อาจารย์", "หลักสูตร", "ประเภท", "รายละเอียด", "ฐานข้อมูลวิชาการ"],
    ...works.map(row => [row.year, row.year + 543, row.authors.join("; "), row.programmes.join("; "), row.type, row.detail, row.index])];
  return "\uFEFF" + rows.map(row => row.map(value => {
    const safe = String(value).replace(/^[\s]*[=+@-]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}
