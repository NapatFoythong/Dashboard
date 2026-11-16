import { COLORS, countWorks, unique, compareText, type Publication, type CountMode } from "./analytics.ts";

export function programmeColor(programme: string) {
  const index = ["COMP", "Dbiz", "DE", "AISE"].indexOf(programme);
  return COLORS[index < 0 ? 0 : index];
}

/** Split each counted work equally across its programmes, conserving the total. */
export function programmeShares(records: Publication[], years: number[], mode: CountMode) {
  const groups = unique(records.flatMap(row => row.programmes)).sort(compareText);
  const works = countWorks(records, mode);
  const yearlyWorks = years.map(year => works.filter(work => work.year === year));
  const series = groups.map(programme => yearlyWorks.map(works => works.reduce((sum, work) =>
    sum + (work.programmes.includes(programme) ? 1 / work.programmes.length : 0), 0)));
  return { groups, series, totals: yearlyWorks.map(works => works.length) };
}
