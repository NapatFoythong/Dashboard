import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prepareRecords, countWorks, groupedCounts, PROGRAMMES, type ResearchData } from "../lib/analytics.ts";
import { DE_AISE_GROUP, groupedProgrammeCounts, programmeChartGroup, programmeShares } from "../lib/programme-shares.ts";

test("programme colour shares conserve annual totals for both counting modes", () => {
  const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));
  const records = prepareRecords(data);
  const years = [2020, 2021, 2022, 2023, 2024];
  for (const mode of ["unique", "records"] as const) {
    const result = programmeShares(records, years, mode);
    const chartGroups = [...new Set(PROGRAMMES.map(programmeChartGroup))].sort();
    assert.deepEqual(result.groups.filter(group => chartGroups.includes(group)).sort(), chartGroups);
    assert(result.groups.includes(DE_AISE_GROUP), "DE and AISE appear as one chart group");
    assert(!result.groups.includes("DE") && !result.groups.includes("AISE"));
    const deAiseIndex = result.groups.indexOf(DE_AISE_GROUP);
    assert(result.series[deAiseIndex].some(value => value > 0), "DE publications are included in the combined series");
    years.forEach((year, i) => {
      assert.equal(result.totals[i], countWorks(records.filter(row => row.year === year), mode).length);
      assert(Math.abs(result.series.reduce((sum, values) => sum + values[i], 0) - result.totals[i]) < 1e-8);
    });
    const emptyChart = programmeShares([], years, mode);
    assert.deepEqual(emptyChart.totals, [0, 0, 0, 0, 0]);
    assert(emptyChart.groups.includes(DE_AISE_GROUP));
  }
  const shared = [{ ...records[0], programmes: ["A", "B"] }];
  const sharedShares = programmeShares(shared, [shared[0].year], "unique");
  assert.equal(sharedShares.series[sharedShares.groups.indexOf("A")][0], 0.5);
  assert.equal(sharedShares.series[sharedShares.groups.indexOf("B")][0], 0.5);
  assert.equal(sharedShares.series[sharedShares.groups.indexOf(DE_AISE_GROUP)][0], 0);
  assert(groupedCounts(records, "programme", "unique").some(row => row.key === "AISE" && row.count === 0));
  assert.deepEqual(groupedCounts([], "programme", "unique").filter(row => PROGRAMMES.includes(row.key as typeof PROGRAMMES[number])).map(row => row.key).sort(), [...PROGRAMMES].sort());
  const both = [{ ...records[0], programmes: ["DE", "AISE"] }];
  assert.equal(groupedProgrammeCounts(both, "records").find(row => row.key === DE_AISE_GROUP)?.count, 1, "A work associated with both must only count once in the merged chart group");
});
