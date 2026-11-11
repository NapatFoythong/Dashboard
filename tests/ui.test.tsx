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
import ReferenceText from "../components/reference-text";
import VisitorCounter, { VisitorProvider } from "../components/visitor-counter";
import { facultyRecords } from "../lib/faculty.ts";
import { EN_MESSAGES, translate } from "../lib/i18n.ts";
import { orderWorks } from "../lib/publication-sort.ts";
import { countWorks, prepareRecords, type ResearchData } from "../lib/analytics.ts";

const data: ResearchData = JSON.parse(readFileSync("data/research.json", "utf8"));

test("inline DOI and URL references remain unchanged and open safe external links", () => {
  const text = 'doi: 10.31803/tg-20220126221837. Link: https://www.researchgate.net/publication/363881037_Computer_Game';
  const dom = new JSDOM(renderToString(<ReferenceText text={text} />));
  assert.equal(dom.window.document.body.textContent, text);
  const links = dom.window.document.querySelectorAll('a');
  assert.equal(links.length, 2);
  assert.equal(links[0].href, 'https://doi.org/10.31803/tg-20220126221837');
  assert.equal(links[1].href, 'https://www.researchgate.net/publication/363881037_Computer_Game');
  assert([...links].every(link => link.target === '_blank' && link.rel.includes('noopener')));
  assert.equal(renderToString(<ReferenceText text={'<script>bad</script> javascript:alert(1)'} />).includes('<script>'), false);
  dom.window.close();
});

test("eight publication sort modes are deterministic and do not modify source records", () => {
  const works = countWorks(prepareRecords(data), "records");
  const original = works.map(row => row.id);
  for (const mode of ["newest", "oldest", "title-asc", "title-desc", "author-asc", "author-desc", "type-asc", "type-desc"] as const) {
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
      if (mode === "type-asc") assert(previous.type <= current.type);
      if (mode === "type-desc") assert(previous.type >= current.type);
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
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "showModal", { configurable: true, value: function () { this.open = true; } });
  Object.defineProperty(dom.window.HTMLDialogElement.prototype, "close", { configurable: true, value: function () { this.open = false; this.dispatchEvent(new dom.window.Event("close")); } });
  const container = document.getElementById("root")!;
  const app = <LanguageProvider><Dashboard data={data} /></LanguageProvider>;
  let root = createRoot(container);
  const click = async (element: Element | null) => { assert(element); await act(async () => { (element as HTMLElement).click(); }); };
  try {
    await act(async () => { root.render(app); });
    assert(container.querySelector("h1")!.textContent!.includes("ผลงานทางวิชาการ"));
    assert.equal(container.querySelectorAll('#stafflist input:checked').length, 34);
    assert.deepEqual([...container.querySelectorAll('.stats strong')].map(element => element.textContent), ["234", "27", "173", "4"]);
    assert(container.querySelectorAll('.stats small')[1].textContent!.includes("34"));
    await click(container.querySelector('button[aria-label="English"]'));
    assert.equal(document.documentElement.lang, "en");
    assert.equal(localStorage.getItem("coc-language"), "en");
    assert.equal(container.querySelector("h1")!.textContent, "Faculty academic publications");
    assert.equal(container.querySelector('#faculty-directory h2')!.textContent, "Faculty directory");
    assert.equal(container.querySelector('button[aria-label="English"]')!.getAttribute("aria-pressed"), "true");
    const firstFacultyCard = container.querySelector('#faculty-directory .faculty-person')!;
    await act(async () => {
      firstFacultyCard.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 230));
    });
    const preview = document.querySelector('.faculty-preview-popup')!;
    assert(preview, 'Hover should open a preview outside the scrolling grid');
    assert.equal(preview.querySelector('h3')!.textContent, 'ADISAK INTANA');
    assert.equal(preview.querySelectorAll('.preview-works li').length, 3);
    assert.equal(preview.querySelector('.preview-works p')!.textContent, facultyRecords(data, 'ADISAK INTANA')[0].detail);
    assert(preview.querySelector('.faculty-photo img'));
    assert(preview.querySelector('.preview-all')!.getAttribute('href')!.includes('/faculty/adisak-intana'));
    assert.equal(container.contains(preview), false, 'Portal must avoid clipping inside the faculty grid');
    await act(async () => {
      firstFacultyCard.dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: preview }));
      preview.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: firstFacultyCard }));
      await new Promise(resolve => setTimeout(resolve, 220));
    });
    assert(document.querySelector('.faculty-preview-popup'), 'Moving the pointer into the preview must keep it open');
    await act(async () => { window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(document.querySelector('.faculty-preview-popup'), null);
    const noWorksCard = [...container.querySelectorAll('#faculty-directory .faculty-person')].find(element => element.textContent!.includes('KAMAL BAHA'))!;
    await act(async () => { (noWorksCard as HTMLElement).focus(); });
    assert(document.querySelector('.faculty-preview-popup .preview-empty')!.textContent!.includes('No records'));
    await act(async () => { window.dispatchEvent(new dom.window.Event('scroll')); });
    assert.equal(document.querySelector('.faculty-preview-popup'), null);
    await act(async () => { (noWorksCard as HTMLElement).blur(); });
    const table = container.querySelector("#publications")!;
    assert(container.querySelector('.data-guide')!.textContent!.includes('October 2025'));
    const bar = container.querySelector('#chart rect[tabindex="0"]')!;
    await act(async () => { bar.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    const chartYear = Number(bar.getAttribute('aria-label')!.match(/\d{4}/)![0]);
    assert([...table.querySelectorAll('tbody tr td:first-child b')].every(element => Number(element.textContent) === chartYear));
    await click(container.querySelector('.chart-filter button'));
    const segment = container.querySelector('#donut circle[role="button"]')!;
    await act(async () => { segment.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    const chartType = segment.getAttribute('aria-label')!.split(':')[0];
    assert([...table.querySelectorAll('tbody tr td:last-child')].every(element => element.textContent!.startsWith(chartType)));
    await click(container.querySelector('.chart-filter button'));
    assert.equal(container.querySelector('.stats strong')!.textContent, "234");
    const authorBar = container.querySelector('.rank-filter')!;
    await click(authorBar);
    const chartAuthor = authorBar.getAttribute('aria-label')!.split(':')[0];
    assert([...table.querySelectorAll('tbody tr')].every(row => [...row.querySelectorAll('.faculty-link')].some(link => link.textContent === chartAuthor)));
    await click(container.querySelector('.chart-filter button'));
    const programmeBar = container.querySelector('.programme-filter')!;
    const chartProgramme = programmeBar.querySelector('.programme-label > span')!.textContent!;
    await click(programmeBar);
    assert([...table.querySelectorAll('tbody tr td:nth-child(3) small')].every(element => element.textContent!.includes(chartProgramme)));
    await click(container.querySelector('.chart-filter button'));
    const article = table.querySelector('.article-links a')!;
    assert(article.getAttribute('href')!.startsWith('http'));
    assert.equal(article.getAttribute('target'), '_blank');
    const sourceText = table.querySelector('.pubtitle')!.textContent;
    await click(table.querySelector('.pubtitle'));
    assert(container.querySelector('dialog')!.open);
    assert.equal(container.querySelector('dialog p')!.textContent, sourceText);
    assert(container.querySelector('dialog .article-links a'));
    await click(container.querySelector('.close-detail'));
    const typeFilter = table.querySelector('.type-control select') as HTMLSelectElement;
    const topicFilter = table.querySelector('.topic-control select') as HTMLSelectElement;
    await act(async () => { topicFilter.value = 'ai'; topicFilter.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert(table.querySelectorAll('tbody .topic-tags').length > 0);
    assert([...table.querySelectorAll('tbody .topic-tags')].every(element => element.textContent!.includes('Artificial intelligence')));
    await act(async () => { topicFilter.value = ''; topicFilter.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.equal(typeFilter.options.length, 5);
    for (const option of [...typeFilter.options].slice(1)) {
      await act(async () => { typeFilter.value = option.value; typeFilter.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
      const rows = [...table.querySelectorAll('tbody tr td:last-child')];
      assert(rows.length > 0);
      assert(rows.every(element => element.textContent!.startsWith(option.text)));
      assert.equal((container.querySelector('.filtergrid label:nth-child(4) select') as HTMLSelectElement).value, option.value);
    }
    await act(async () => { typeFilter.value = ""; typeFilter.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    assert.equal(container.querySelector('.stats strong')!.textContent, "234");
    const picker = table.querySelector(".table-faculty-picker")!;
    assert(picker.querySelector('.table-picker-list')!.textContent!.includes("NOPPON LERTCHUWONGSA"), "Additional CSV faculty must remain available for filtering");
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
    await click(picker.querySelectorAll(".staffactions button")[1]);
    const extra = [...picker.querySelectorAll(".table-picker-list label")].find(element => element.textContent === "NOPPON LERTCHUWONGSA")!;
    await click(extra.querySelector("input"));
    assert(table.querySelectorAll("tbody .faculty-link").length > 0);
    assert([...table.querySelectorAll("tbody .faculty-link")].every(element => element.textContent === "NOPPON LERTCHUWONGSA"));
    await click(container.querySelector('.filtertitle button'));
    assert.equal(container.querySelectorAll('#stafflist input:checked').length, 34, "Reset must restore the Excel roster, not all 44 names");
    assert.equal(container.querySelector('.stats strong')!.textContent, "234");
    await click(picker.querySelectorAll(".staffactions button")[1]);
    await click(label.querySelector("input"));
    await act(async () => { sorter.value = "oldest"; sorter.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
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
    const facultyTopic = container.querySelector('.faculty-controls .topic-control select') as HTMLSelectElement;
    await act(async () => { facultyTopic.value = 'ai'; facultyTopic.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert(container.querySelectorAll('.faculty-publications li').length > 0);
    assert([...container.querySelectorAll('.faculty-publications .topic-tags')].every(element => element.textContent!.includes('Artificial intelligence')));
    assert.equal(container.querySelector('button[aria-label="English"]')!.getAttribute("aria-pressed"), "true");
    const previousFetch = globalThis.fetch;
    const visitorIds: string[] = [];
    try {
      globalThis.fetch = async (_url, init) => {
        visitorIds.push(JSON.parse(String(init!.body)).id);
        return new Response(JSON.stringify({ total: 42 }), { headers: { 'Content-Type': 'application/json' } });
      };
      await act(async () => { root.render(<LanguageProvider><VisitorProvider key="first"><VisitorCounter /></VisitorProvider></LanguageProvider>); });
      assert.equal(container.querySelector('.visitor-counter strong')!.textContent, '42');
      await act(async () => { root.render(<LanguageProvider><VisitorProvider key="second"><VisitorCounter /></VisitorProvider></LanguageProvider>); });
      assert.equal(visitorIds.length, 2);
      assert.equal(visitorIds[0], visitorIds[1], 'Reopening the page must reuse the browser identifier');
      assert.equal(localStorage.getItem('coc-visitor-id'), visitorIds[0]);
    } finally { globalThis.fetch = previousFetch; }
  } finally {
    await act(async () => { root.unmount(); });
    dom.window.close();
  }
});
