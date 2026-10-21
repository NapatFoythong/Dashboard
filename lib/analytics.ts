export interface SourcePublication {
  name: string;
  type: string;
  detail: string;
  year: string;
  month: string;
  index: string;
  psu: string;
}
export interface ResearchData {
  staff: { name: string; programmes: string[]; original: string }[];
  publications: SourcePublication[];
}
export interface Publication extends Omit<SourcePublication, "year"> {
  id: number;
  year: number;
  programmes: string[];
}
export interface Work extends Publication { authors: string[] }
export type CountMode = "unique" | "records";
export type GroupMode = "total" | "type" | "programme";
export interface Filters {
  start: number;
  end: number;
  programme: string;
  type: string;
  index: string;
  psu: boolean;
  count: CountMode;
}
export const DEFAULT_FILTERS: Filters = {
  start: 2020, end: 2024, programme: "", type: "", index: "", psu: false, count: "unique",
};
export const COLORS = ["#238367", "#92bda1", "#b2c77c", "#dfb770", "#88a9bc", "#b79dc4"];
export const TYPE_LABELS: Record<string, string> = {
  "International Journal Articles": "วารสารนานาชาติ",
  "International Proceedings": "ประชุมวิชาการนานาชาติ",
  "National Journal Articles": "วารสารระดับชาติ",
  "National Proceedings": "ประชุมวิชาการระดับชาติ",
};
export const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export const yearLabel = (year: number) => `${year + 543} (${year})`;
export const programmeLabel = (value: string) => value === "DE" ? "DE / AISE" : value;
export const unique = <T,>(values: T[]): T[] => [...new Set(values)];

export function prepareRecords(data: ResearchData): Publication[] {
  const mapping = new Map(data.staff.map(person => [person.name, person.programmes]));
  return data.publications.map((row, id) => ({
    ...row, id, year: Number(row.year), index: row.index.trim(),
    programmes: mapping.get(row.name) ?? ["ยังไม่ระบุหลักสูตร"],
  }));
}

export function filterRecords(records: Publication[], filters: Filters, selected: Set<string>): Publication[] {
  return records.filter(row => row.year >= filters.start && row.year <= filters.end
    && selected.has(row.name)
    && (!filters.programme || row.programmes.includes(filters.programme))
    && (!filters.type || row.type === filters.type)
    && (!filters.index || row.index === (filters.index === "__empty__" ? "" : filters.index))
    && (!filters.psu || row.psu === "Y"));
}

export function countWorks(rows: Publication[], mode: CountMode): Work[] {
  if (mode === "records") return rows.map(row => ({ ...row, authors: [row.name] }));
  const works = new Map<string, Work>();
  for (const row of rows) {
    const key = normalize(row.detail);
    const existing = works.get(key);
    if (existing) {
      existing.authors = unique([...existing.authors, row.name]);
      existing.programmes = unique([...existing.programmes, ...row.programmes]);
    } else {
      works.set(key, { ...row, authors: [row.name], programmes: [...row.programmes] });
    }
  }
  return [...works.values()];
}

export function searchWorks(works: Work[], query: string, sort: number): Work[] {
  const q = normalize(query);
  return works.filter(row => normalize(`${row.detail} ${row.authors.join(" ")}`).includes(q))
    .sort((a, b) => sort * (a.year - b.year) || a.detail.localeCompare(b.detail));
}

export function groupedCounts(records: Publication[], group: "name" | "programme", mode: CountMode) {
  const keys = unique(records.flatMap(row => group === "name" ? [row.name] : row.programmes));
  return keys.map(key => ({ key, count: countWorks(records.filter(row =>
    group === "name" ? row.name === key : row.programmes.includes(key)), mode).length }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function exportCsv(works: Work[]): string {
  const rows = [["ปี ค.ศ.", "ปี พ.ศ.", "อาจารย์", "หลักสูตร", "ประเภท", "รายละเอียด", "ฐานดัชนี"],
    ...works.map(row => [row.year, row.year + 543, row.authors.join("; "), row.programmes.join("; "), row.type, row.detail, row.index])];
  return "\uFEFF" + rows.map(row => row.map(value => {
    const safe = String(value).replace(/^[\s]*[=+@-]/, "'$&");
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(",")).join("\r\n");
}
