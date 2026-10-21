import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { countWorks, DEFAULT_FILTERS, exportCsv, filterRecords, groupedCounts, prepareRecords, searchWorks } from "../lib/analytics.ts";
import type { ResearchData } from "../lib/analytics.ts";

const data: ResearchData = JSON.parse(readFileSync(new URL("../data/research.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const records = prepareRecords(data);
const selected = new Set([...data.staff.map(row => row.name), ...records.map(row => row.name)]);
const filtered = filterRecords(records, DEFAULT_FILTERS, selected);

test("migration preserves source totals and default 2020–2024 counts", () => {
  assert.equal(records.length, 717);
  assert.equal(data.staff.length, 34);
  assert.equal(filtered.length, 258);
  assert.equal(countWorks(filtered, "unique").length, 252);
  assert.equal(countWorks(filtered, "records").length, 258);
});
test("year boundaries, no selected staff, and combined filters", () => {
  assert.equal(filterRecords(records, { ...DEFAULT_FILTERS, start: 2025, end: 2020 }, selected).length, 0);
  assert.equal(filterRecords(records, DEFAULT_FILTERS, new Set()).length, 0);
  const rows = filterRecords(records, { ...DEFAULT_FILTERS, start: 2023, end: 2023, programme: "DE", index: "Scopus", psu: true }, selected);
  assert(rows.length > 0);
  assert(rows.every(row => row.year === 2023 && row.programmes.includes("DE") && row.index === "Scopus" && row.psu === "Y"));
});
test("shared works merge authors and programme credits without mutating source", () => {
  const a = { ...records[0], name: "AUTHOR A", programmes: ["DE"] };
  const b = { ...a, id: 1000, name: "AUTHOR B", detail: ` ${a.detail.toUpperCase()} `, programmes: ["Comp"] };
  const works = countWorks([a, b], "unique");
  assert.equal(works.length, 1);
  assert.deepEqual(works[0].authors, ["AUTHOR A", "AUTHOR B"]);
  assert.deepEqual(works[0].programmes, ["DE", "Comp"]);
  assert.deepEqual(a.programmes, ["DE"]);
  assert.equal(groupedCounts([a, b], "programme", "unique").length, 2);
});
test("search, ordering, missing programme and CSV quoting remain usable", () => {
  const found = searchWorks(countWorks(filtered, "unique"), "ontology", -1);
  assert(found.length > 0);
  assert(found.every(row => row.detail.toLowerCase().includes("ontology")));
  assert(found.every((row, i) => !i || found[i - 1].year >= row.year));
  assert(records.some(row => row.programmes.includes("ยังไม่ระบุหลักสูตร")));
  const csv = exportCsv([{ ...found[0], detail: '=HYPERLINK("x")' }]);
  assert(csv.startsWith("\uFEFF"));
  assert(csv.includes('"\'=HYPERLINK(""x"")"'));
});
