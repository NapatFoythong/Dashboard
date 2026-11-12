import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { countWorks, DEFAULT_FILTERS, filterRecords, prepareRecords, TYPE_LABELS, type ResearchData } from "../lib/analytics.ts";
import { canonicalFacultyName } from "../lib/faculty-identity.ts";
import { programmeShares } from "../lib/programme-shares.ts";

const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));
const records = prepareRecords(data);
const roster = new Set(data.staff.map(person => canonicalFacultyName(person.name)));
const everyone = new Set(data.publications.map(row => row.name));

test("year, faculty, type and programme filters agree with source rows across 800 combinations", () => {
  const programmes = ["", "Comp", "DBiz", "DE", "MsComp"];
  const types = ["", ...Object.keys(TYPE_LABELS)];
  const selections = [roster, everyone, new Set(["ADISAK INTANA"]), new Set<string>()];
  const ranges = [[2020, 2024], [2024, 2024], [2017, 2018], [2024, 2020]];
  let checked = 0;
  for (const count of ["unique", "records"] as const) {
    for (const [start, end] of ranges) {
      for (const programme of programmes) {
        for (const type of types) {
          for (const selected of selections) {
            const filters = { ...DEFAULT_FILTERS, start, end, programme, type, count };
            const expectedRows = data.publications.filter(row => {
              const staff = data.staff.find(person => canonicalFacultyName(person.name) === row.name);
              return Number(row.year) >= start && Number(row.year) <= end
                && selected.has(row.name) && (!type || row.type === type)
                && (!programme || staff?.programmes.includes(programme));
            });
            const filtered = filterRecords(records, filters, selected);
            assert.deepEqual(filtered.map(row => row.detail), expectedRows.map(row => row.detail));
            const expected = new Map<string, typeof expectedRows>();
            expectedRows.forEach((row, i) => {
              const key = count === "records" ? String(i) : row.detail.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
              expected.set(key, [...(expected.get(key) ?? []), row]);
            });
            const works = countWorks(filtered, count);
            assert.equal(works.length, expected.size);
            const years = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
            const chart = programmeShares(filtered, years, count);
            assert.equal(chart.totals.reduce((sum, value) => sum + value, 0), expected.size);
            years.forEach((year, i) => {
              const expectedCount = [...expected.values()].filter(rows => Number(rows[0].year) === year).length;
              assert.equal(chart.totals[i], expectedCount);
              assert(Math.abs(chart.series.reduce((sum, values) => sum + values[i], 0) - expectedCount) < 1e-8);
            });
            const pieTotal = Object.keys(TYPE_LABELS).reduce((sum, key) => sum + works.filter(work => work.type === key).length, 0);
            assert.equal(pieTotal, expected.size);
            const expectedScopus = [...expected.values()].filter(rows => rows.some(row => /scopus/i.test(row.index))).length;
            assert.equal(works.filter(work => work.indexes?.some(index => /scopus/i.test(index))).length, expectedScopus);
            checked++;
          }
        }
      }
    }
  }
  assert.equal(checked, 800);
});

test("duplicate citations retain all source database labels and use one year in annual totals", () => {
  const rows = filterRecords(records, { ...DEFAULT_FILTERS, start: 2017, end: 2021 }, roster);
  const works = countWorks(rows, "unique");
  const conflict = works.find(work => work.detail.startsWith("Tongtep N., and Boonlamp."));
  assert(conflict);
  assert.deepEqual(conflict.indexes, ["Others", "Scopus"]);
  const chart = programmeShares(rows, [2017, 2018, 2019, 2020, 2021], "unique");
  assert.equal(chart.totals.reduce((sum, value) => sum + value, 0), works.length);
});
