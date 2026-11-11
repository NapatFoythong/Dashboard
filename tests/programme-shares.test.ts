import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { prepareRecords, countWorks, type ResearchData } from "../lib/analytics.ts";
import { programmeShares } from "../lib/programme-shares.ts";

test("programme colour shares conserve annual totals for both counting modes", () => {
  const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));
  const records = prepareRecords(data);
  const years = [2020, 2021, 2022, 2023, 2024];
  for (const mode of ["unique", "records"] as const) {
    const result = programmeShares(records, years, mode);
    years.forEach((year, i) => {
      assert.equal(result.totals[i], countWorks(records.filter(row => row.year === year), mode).length);
      assert(Math.abs(result.series.reduce((sum, values) => sum + values[i], 0) - result.totals[i]) < 1e-8);
    });
    assert.deepEqual(programmeShares([], years, mode).totals, [0, 0, 0, 0, 0]);
  }
  const shared = [{ ...records[0], programmes: ["A", "B"] }];
  assert.deepEqual(programmeShares(shared, [shared[0].year], "unique").series, [[0.5], [0.5]]);
});
