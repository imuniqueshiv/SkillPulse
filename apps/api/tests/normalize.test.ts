import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTerm } from "../src/modules/taxonomy/normalize";

test("normalizeTerm is deterministic and case-insensitive", () => {
  assert.equal(normalizeTerm("  TypeScript  "), "typescript");
  assert.equal(normalizeTerm("TYPESCRIPT"), "typescript");
  assert.equal(normalizeTerm("TypeScript"), normalizeTerm(" typescript "));
});

test("normalizeTerm collapses punctuation except language tokens", () => {
  assert.equal(normalizeTerm("React.js"), "react.js");
  assert.equal(normalizeTerm("Node.js"), "node.js");
  assert.equal(normalizeTerm("C++"), "c++");
  assert.equal(normalizeTerm("C#"), "c#");
  assert.equal(normalizeTerm("Java Script"), "java script");
});

test("normalizeTerm does not make java look like javascript", () => {
  assert.equal(normalizeTerm("Java"), "java");
  assert.equal(normalizeTerm("JavaScript"), "javascript");
  assert.notEqual(normalizeTerm("Java"), normalizeTerm("JavaScript"));
});

test("normalizeTerm treats empty or symbol-only input as empty", () => {
  assert.equal(normalizeTerm("   "), "");
  assert.equal(normalizeTerm("***"), "");
});
