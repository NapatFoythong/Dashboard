import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import ts from "typescript";
import Dashboard from "../components/dashboard";
import LanguageProvider from "../components/language-provider";
import FacultyProfile from "../components/faculty-profile";
import { facultyRecords } from "../lib/faculty.ts";
import { EN_MESSAGES, translate } from "../lib/i18n.ts";
import { orderWorks } from "../lib/publication-sort.ts";
import { countWorks, prepareRecords, type ResearchData } from "../lib/analytics.ts";

const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));

test("six publication sort modes are deterministic and do not modify source records", () => {
  const works = countWorks(prepareRecords(data), "records");
  const original = works.map(row => row.id);
  for (const mode of ["newest", "oldest", "title-asc", "title-desc", "author-asc", "author-desc"] as const) {
    const result = orderWorks(works, mode);
    assert.equal(result.length, 717);
    assert.equal(new Set(result.map(row => row.id)).size, 717);
    for (let i = 1; i < result.length; i++) {
      const previous = result[i - 1], current = result[i];
      if (mode === "newest") assert(previous.year >= current.year);
      if (mode === "oldest") assert(previous.year <= current.year);
      if (mode === "title-asc") assert(previous.detail <= current.detail);
      if (mode === "title-desc") assert(previous.detail >= current.detail);
      if (mode === "author-asc") assert(previous.authors[0] <= current.authors[0]);
      if (mode === "author-desc") assert(previous.authors[0] >= current.authors[0]);
    }
  }
  assert.deepEqual(works.map(row => row.id), original);
});

test("all explicit Thai UI messages have English translations and preserve placeholders", () => {
  let checked = 0;
  for (const filename of readdirSync("components").filter(name => name.endsWith(".tsx"))) {
    const source = ts.createSourceFile(filename, readFileSync(`components/${filename}`, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        const key = node.arguments[0].text;
        if (/[\u0e00-\u0e7f]/.test(key)) {
          assert(Object.hasOwn(EN_MESSAGES, key), `${filename}: ${key}`);
          assert.deepEqual(EN_MESSAGES[key].match(/\{\d+\}/g) ?? [], key.match(/\{\d+\}/g) ?? [], key);
          checked++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert(checked > 100);
  assert.equal(translate("en", "{0} คน", 2), "2 selected");
  assert.equal(translate("th", "{0} คน", 2), "2 คน");
  assert.equal(translate("en", "ADISAK INTANA"), "ADISAK INTANA");
});

test("flag clicks, table faculty selection, sorting, and saved-language hydration work together", async () => {
  const dom = new JSDOM('<!doctype html><html lang="th"><body><div id="root"></div></body></html>', { url: "http://localhost:3100", pretendToBeVisual: true });
  for (const key of ["window", "document", "navigator", "localStorage", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "MouseEvent", "Event", "Node"] as const) {
    Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? dom.window : dom.window[key] });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, "self", { configurable: true, value: dom.window });
  const container = document.getElementById("root")!;
  const app = <LanguageProvider><Dashboard data={data} /></LanguageProvider>;
  let root = createRoot(container);
  const click = async (element: Element | null) => { assert(element); await act(async () => { (element as HTMLElement).click(); }); };
  try {
    await act(async () => { root.render(app); });
    assert(container.querySelector("h1")!.textContent!.includes("ผลงานทางวิชาการ"));
    await click(container.querySelector('button[aria-label="English"]'));
    assert.equal(document.documentElement.lang, "en");
    assert.equal(localStorage.getItem("coc-language"), "en");
    assert.equal(container.querySelector("h1")!.textContent, "Faculty academic publications");
    assert.equal(container.querySelector('#faculty-directory h2')!.textContent, "Faculty directory");
    assert.equal(container.querySelector('button[aria-label="English"]')!.getAttribute("aria-pressed"), "true");
    const table = container.querySelector("#publications")!;
    const picker = table.querySelector(".table-faculty-picker")!;
    await click(picker.querySelectorAll(".staffactions button")[1]);
    assert(table.querySelector(".empty")!.textContent!.includes("No records"));
    const label = [...picker.querySelectorAll(".table-picker-list label")].find(element => element.textContent === "ADISAK INTANA")!;
    await click(label.querySelector("input"));
    assert(table.querySelectorAll("tbody .faculty-link").length > 0);
    assert([...table.querySelectorAll("tbody .faculty-link")].every(element => element.textContent === "ADISAK INTANA"));
    const sorter = table.querySelector(".sort-control select") as HTMLSelectElement;
    await act(async () => { sorter.value = "oldest"; sorter.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    const years = [...table.querySelectorAll("tbody tr td:first-child b")].map(element => Number(element.textContent));
    assert(years.every((year, i) => !i || years[i - 1] <= year));
    await click(container.querySelector('button[aria-label="ภาษาไทย"]'));
    assert.equal(document.documentElement.lang, "th");
    assert.equal(sorter.value, "oldest", "Switching language must retain sort and faculty selection");
    assert([...table.querySelectorAll("tbody .faculty-link")].every(element => element.textContent === "ADISAK INTANA"));
    await act(async () => { root.unmount(); });

    // Server HTML remains Thai while a saved English preference is restored after hydration.
    localStorage.setItem("coc-language", "en");
    container.innerHTML = renderToString(app);
    const errors: unknown[] = [];
    await act(async () => { root = hydrateRoot(container, app, { onRecoverableError: error => errors.push(error) }); });
    assert.deepEqual(errors, []);
    assert.equal(container.querySelector("h1")!.textContent, "Faculty academic publications");
    assert.equal(document.documentElement.lang, "en");
    const faculty = "ADISAK INTANA";
    const facultyRows = facultyRecords(data, faculty);
    const portraits = JSON.parse(readFileSync("data/staff-portraits.json", "utf8"));
    await act(async () => { root.render(<LanguageProvider><FacultyProfile name={faculty} records={facultyRows} portrait={portraits[faculty]} staff={data.staff.find(row => row.name === faculty)} /></LanguageProvider>); });
    assert.equal(container.querySelector("h1")!.textContent, faculty);
    assert(container.querySelector(".faculty-works h2")!.textContent!.startsWith("Publications by"));
    assert.equal(container.querySelector(".work-detail")!.textContent, facultyRows[0].detail, "CSV publication text must remain unchanged in English");
    assert.equal(container.querySelector('button[aria-label="English"]')!.getAttribute("aria-pressed"), "true");
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
  }
});
