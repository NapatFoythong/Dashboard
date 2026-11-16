import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prepareRecords, countWorks, groupedCounts, PROGRAMMES, type ResearchData } from "../lib/analytics.ts";
import { programmeShares } from "../lib/programme-shares.ts";

test("programme colour shares conserve annual totals for both counting modes", () => {
  const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));
  const records = prepareRecords(data);
  const years = [2020, 2021, 2022, 2023, 2024];
  for (const mode of ["unique", "records"] as const) {
    const result = programmeShares(records, years, mode);
    assert.deepEqual(result.groups.filter(group => PROGRAMMES.includes(group as typeof PROGRAMMES[number])).sort(), [...PROGRAMMES].sort());
    const aiseIndex = result.groups.indexOf("AISE");
    assert(aiseIndex >= 0, "AISE remains visible as one of the four programmes");
    assert.deepEqual(result.series[aiseIndex], [0, 0, 0, 0, 0], "Unassigned AISE records must not be fabricated");
    years.forEach((year, i) => {
      assert.equal(result.totals[i], countWorks(records.filter(row => row.year === year), mode).length);
      assert(Math.abs(result.series.reduce((sum, values) => sum + values[i], 0) - result.totals[i]) < 1e-8);
    });
    assert.deepEqual(programmeShares([], years, mode).totals, [0, 0, 0, 0, 0]);
  }
  const shared = [{ ...records[0], programmes: ["A", "B"] }];
  const sharedShares = programmeShares(shared, [shared[0].year], "unique");
  assert.equal(sharedShares.series[sharedShares.groups.indexOf("A")][0], 0.5);
  assert.equal(sharedShares.series[sharedShares.groups.indexOf("B")][0], 0.5);
  for (const programme of PROGRAMMES) assert.equal(sharedShares.series[sharedShares.groups.indexOf(programme)][0], 0);
  assert(groupedCounts(records, "programme", "unique").some(row => row.key === "AISE" && row.count === 0));
  assert.deepEqual(groupedCounts([], "programme", "unique").filter(row => PROGRAMMES.includes(row.key as typeof PROGRAMMES[number])).map(row => row.key).sort(), [...PROGRAMMES].sort());
});
