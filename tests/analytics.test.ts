import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { countWorks, DEFAULT_FILTERS, exportCsv, filterRecords, groupedCounts, prepareRecords, PROGRAMMES, searchWorks } from "../lib/analytics.ts";
import type { ResearchData } from "../lib/analytics.ts";
import { facultyNames, facultyRecords, facultySlug } from "../lib/faculty.ts";
import { canonicalFacultyName } from "../lib/faculty-identity.ts";

const data: ResearchData = JSON.parse(readFileSync(new URL("../data/research.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
const records = prepareRecords(data);
const selected = new Set([...data.staff.map(row => row.name), ...records.map(row => row.name)]);
const filtered = filterRecords(records, DEFAULT_FILTERS, selected);

test("source totals and all-author 2020–2024 counts remain unchanged", () => {
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
  const b = { ...a, id: 1000, name: "AUTHOR B", detail: ` ${a.detail.toUpperCase()} `, programmes: ["COMP"] };
  const works = countWorks([a, b], "unique");
  assert.equal(works.length, 1);
  assert.deepEqual(works[0].authors, ["AUTHOR A", "AUTHOR B"]);
  assert.deepEqual(works[0].programmes, ["DE", "COMP"]);
  assert.deepEqual(a.programmes, ["DE"]);
  const programmeCounts = groupedCounts([a, b], "programme", "unique");
  assert.equal(programmeCounts.length, PROGRAMMES.length);
  assert.equal(programmeCounts.find(row => row.key === "DE")?.count, 1);
  assert.equal(programmeCounts.find(row => row.key === "COMP")?.count, 1);
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

test("SSR and client ordering does not depend on localeCompare", () => {
  const works = countWorks(filtered, "unique");
  const expectedWorks = searchWorks(works, "", -1).map(row => row.id);
  const expectedRanks = groupedCounts(filtered, "name", "unique");
  const original = String.prototype.localeCompare;
  try {
    // Simulate a runtime with a different collator (server vs browser).
    String.prototype.localeCompare = function (other: string) {
      return String(this) < other ? 1 : String(this) > other ? -1 : 0;
    };
    assert.deepEqual(searchWorks(works, "", -1).map(row => row.id), expectedWorks);
    assert.deepEqual(groupedCounts(filtered, "name", "unique"), expectedRanks);
    const fixture = [
      { ...works[0], id: 2, detail: "Adam Caulfield", year: 2024 },
      { ...works[0], id: 1, detail: "A. Heednacram", year: 2024 },
    ];
    assert.deepEqual(searchWorks(fixture, "", -1).map(row => row.id), [1, 2]);
  } finally {
    String.prototype.localeCompare = original;
  }
});

test("faculty pages preserve every CSV row under its exact author name", () => {
  const names = facultyNames(data);
  assert.equal(names.length, 44);
  assert.equal(new Set(names.map(facultySlug)).size, names.length);
  const allIds: number[] = [];
  for (const name of names) {
    const rows = facultyRecords(data, name);
    const source = data.publications.filter(row => row.name === name);
    assert.equal(rows.length, source.length, name);
    for (const row of rows) {
      const original = data.publications[row.id];
      assert.equal(row.name, name);
      assert.equal(row.detail, original.detail);
      assert.equal(row.type, original.type);
      assert.equal(row.month, original.month);
      assert.equal(row.year, Number(original.year));
      assert.equal(row.index, original.index.trim());
      assert.equal(row.psu, original.psu);
      allIds.push(row.id);
    }
  }
  assert.equal(allIds.length, 717);
  assert.equal(new Set(allIds).size, 717);
  assert.equal(facultyRecords(data, "MONCHANOK").length, 1);
  assert.equal(facultyRecords(data, "MONCHANOK THONGTHEP").length, 1);
  assert.deepEqual(facultyRecords(data, "MONCHANOK"), facultyRecords(data, "MONCHANOK THONGTHEP"));
  assert.deepEqual(facultyRecords(data, "MONCHANOK")[0].programmes, ["Dbiz"]);
});

test("portrait mapping uses verified full names and existing local files", () => {
  const portraits = JSON.parse(readFileSync(new URL("../data/staff-portraits.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(portraits).length, 34);
  for (const [name, portrait] of Object.entries(portraits) as [string, { verifiedName: string; image: string; cv: string }][]) {
    assert.equal(portrait.verifiedName, name);
    assert(facultyNames(data).includes(name));
    assert(portrait.cv.startsWith("https://computing.psu.ac.th/cv/index?encode_id="));
    assert(readFileSync(new URL(`../public${portrait.image}`, import.meta.url)).length > 1000);
  }
  const roster = data.staff.map(row => canonicalFacultyName(row.name));
  assert.equal(new Set(roster).size, 34);
  assert(roster.every(name => portraits[name]), "Every Excel staff member must have a verified portrait");
  assert.equal(roster.filter(name => !facultyRecords(data, name).length).length, 5);
});
