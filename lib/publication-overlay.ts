import { canonicalFacultyName } from "./faculty-identity.ts";
import { canonicalProgrammes, prepareRecords, type Publication, type ResearchData } from "./analytics.ts";

export interface StoredPublication {
  id: string;
  name: string;
  type: string;
  detail: string;
  year: number;
  month: number;
  index: string;
  psu: string;
}

export interface PublicationOverlay {
  added: StoredPublication[];
  hidden: string[];
  programmes: Record<string, string[]>;
}

export const EMPTY_PUBLICATION_OVERLAY: PublicationOverlay = { added: [], hidden: [], programmes: {} };

export function mergePublications(data: ResearchData, overlay: PublicationOverlay): Publication[] {
  const hidden = new Set(overlay.hidden);
  const base = prepareRecords(data, overlay.programmes).filter(row => !hidden.has(row.recordKey));
  const mapping = new Map(data.staff.map(person => [canonicalFacultyName(person.name), canonicalProgrammes(overlay.programmes[canonicalFacultyName(person.name)] ?? person.programmes)] as const));
  const added = overlay.added.map((row, index) => ({
    ...row,
    id: data.publications.length + index,
    recordKey: `added-${row.id}`,
    year: Number(row.year),
    month: String(row.month),
    index: row.index.trim(),
    programmes: mapping.get(canonicalFacultyName(row.name)) ?? canonicalProgrammes(overlay.programmes[canonicalFacultyName(row.name)] ?? []),
  } satisfies Publication));
  return [...base, ...added];
}

export function parsePublicationOverlay(value: unknown): PublicationOverlay {
  if (!value || typeof value !== "object") return EMPTY_PUBLICATION_OVERLAY;
  const source = value as Partial<PublicationOverlay>;
  return {
    added: Array.isArray(source.added) ? source.added.filter(row => row && typeof row.id === "string" && typeof row.name === "string" && typeof row.detail === "string") : [],
    hidden: Array.isArray(source.hidden) ? source.hidden.filter((id): id is string => typeof id === "string") : [],
    programmes: source.programmes && typeof source.programmes === "object" ? source.programmes : {},
  };
}
