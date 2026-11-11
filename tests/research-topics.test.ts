import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { researchTopics, matchesResearchQuery } from "../lib/research-topics.ts";
import { prepareRecords, countWorks, searchWorks, type ResearchData } from "../lib/analytics.ts";

test("AI search recognises related methods without matching Thai or author names", () => {
  assert(matchesResearchQuery('A deep learning approach', 'AI'));
  assert(matchesResearchQuery('A machine learning approach', 'ปัญญาประดิษฐ์'));
  assert(!matchesResearchQuery('Thai software requirements', 'AI', 'CHAI AUTHOR'));
  assert(!matchesResearchQuery('Ordinary citation https://example.org/artificial-intelligence', 'AI'));
  assert(matchesResearchQuery('A deep learning approach', 'ADISAK AI', 'ADISAK INTANA'));
  assert(!matchesResearchQuery('A deep learning approach', 'NOPPON AI', 'ADISAK INTANA'));
  assert.deepEqual(researchTopics('Undocumented research'), []);
  assert(researchTopics('Neural networks for image segmentation').includes('vision'));
  assert(researchTopics('Neural networks for image segmentation').includes('ai'));
});

test("topic search uses source descriptions and preserves source totals", () => {
  const data: ResearchData = JSON.parse(readFileSync('data/research.json', 'utf8'));
  const original = JSON.stringify(data);
  const works = countWorks(prepareRecords(data), 'records');
  const ai = searchWorks(works, 'AI', -1);
  assert(ai.length > 0 && ai.length < works.length);
  assert(ai.every(work => researchTopics(work.detail).includes('ai')));
  const adisakAi = searchWorks(works, 'ADISAK AI', -1);
  assert(adisakAi.length > 0);
  assert(adisakAi.every(work => work.authors.includes('ADISAK INTANA')));
  assert.equal(searchWorks(works, '', -1).length, 717);
  assert.equal(JSON.stringify(data), original);
});
