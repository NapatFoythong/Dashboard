import { COLORS, countWorks, unique, compareText, PROGRAMMES, type Publication, type CountMode } from "./analytics.ts";

export const DE_AISE_GROUP = "DE / AISE";

export function programmeChartGroup(programme: string) {
  return programme === "DE" || programme === "AISE" ? DE_AISE_GROUP : programme;
}

export function groupedProgrammeCounts(records: Publication[], mode: CountMode) {
  const groups = unique([
    ...PROGRAMMES.map(programmeChartGroup),
    ...records.flatMap(row => row.programmes.map(programmeChartGroup)),
  ]).sort(compareText);
  return groups.map(key => ({
    key,
    count: countWorks(records.filter(row => row.programmes.some(programme => programmeChartGroup(programme) === key)), mode).length,
  })).sort((a, b) => b.count - a.count || compareText(a.key, b.key));
}

export function programmeColor(programme: string) {
  const index = ["COMP", "Dbiz", DE_AISE_GROUP].indexOf(programme);
  return index < 0 ? "#8b9aad" : COLORS[index];
}

/** Split each counted work equally across its programmes, conserving the total. */
export function programmeShares(records: Publication[], years: number[], mode: CountMode) {
  const groups = unique([
    ...PROGRAMMES.map(programmeChartGroup),
    ...records.flatMap(row => row.programmes.map(programmeChartGroup)),
  ]).sort(compareText);
  const works = countWorks(records, mode);
  const yearlyWorks = years.map(year => works.filter(work => work.year === year));
  const series = groups.map(programme => yearlyWorks.map(works => works.reduce((sum, work) =>
    sum + (unique(work.programmes.map(programmeChartGroup)).includes(programme)
      ? 1 / unique(work.programmes.map(programmeChartGroup)).length
      : 0), 0)));
  return { groups, series, totals: yearlyWorks.map(works => works.length) };
}
