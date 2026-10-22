import assert from "node:assert/strict";
import test from "node:test";
import { publicationLinks } from "../lib/publication-links.ts";
test("article references use explicit links and DOIs without creating links for missing references", () => {
  assert.deepEqual(publicationLinks("doi: 10.1109/JCSSE61278.2024.10613719."), ["https://doi.org/10.1109/JCSSE61278.2024.10613719"]);
  assert.deepEqual(publicationLinks("https://doi.org/10.1007/s00521-024-10247-6, DOI: 10.1007/s00521-024-10247-6"), ["https://doi.org/10.1007/s00521-024-10247-6"]);
  assert.deepEqual(publicationLinks("Link: https://example.org/paper(2024))."), ["https://example.org/paper(2024)"]);
  assert.deepEqual(publicationLinks("No link provided. javascript:alert(1) doi: pending"), []);
  assert.deepEqual(publicationLinks("http://dx.doi.org/10.1234/abc"), ["https://doi.org/10.1234/abc"]);
});
