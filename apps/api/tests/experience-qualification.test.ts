import assert from "node:assert/strict";
import { test } from "node:test";
import { extractExperience } from "../src/modules/intelligence/experience-extraction";
import { extractQualifications } from "../src/modules/intelligence/qualification-extraction";

test("experience ranges, freshers, malformed, and missing", () => {
  assert.deepEqual(extractExperience("2-4 years").minYears, 2);
  assert.equal(extractExperience("2-4 years").maxYears, 4);
  assert.equal(extractExperience("2-4 years").status, "PARSED");
  assert.equal(extractExperience("2-4 years").extractionMethod, "CALLER_TEXT");
  assert.equal(extractExperience("2-4 years").confidenceTier, "HIGH");
  assert.equal(extractExperience(null).extractionMethod, "UNAVAILABLE");
  assert.equal(extractExperience("5-2 years").confidenceTier, "LOW");

  const plus = extractExperience("3+ years");
  assert.equal(plus.minYears, 3);
  assert.equal(plus.maxYears, null);

  assert.equal(extractExperience("minimum 2 years").minYears, 2);
  assert.equal(extractExperience("at least 2 years").minYears, 2);

  const zeroTwo = extractExperience("0-2 years");
  assert.equal(zeroTwo.minYears, 0);
  assert.equal(zeroTwo.maxYears, 2);
  assert.equal(zeroTwo.freshersAccepted, true);

  const fresher = extractExperience("freshers can apply");
  assert.equal(fresher.status, "PARSED");
  assert.equal(fresher.freshersAccepted, true);
  assert.equal(fresher.minYears, 0);

  assert.equal(extractExperience("fresh graduates").freshersAccepted, true);
  assert.equal(extractExperience("no experience required").freshersAccepted, true);

  assert.equal(extractExperience("5-2 years").status, "UNPARSED");
  assert.equal(extractExperience("abc years").status, "UNPARSED");
  assert.equal(extractExperience(null).status, "UNKNOWN");
  assert.equal(extractExperience("").status, "UNKNOWN");
  assert.equal(extractExperience(null).minYears, undefined);
});

test("qualification tokens preserve raw text", () => {
  const mixed = extractQualifications("B.Tech / B.E. in Computer Science");
  const names = mixed.map((row) => row.normalized);
  assert.ok(names.includes("B.Tech"));
  assert.ok(names.includes("B.E."));
  assert.ok(names.includes("Computer Science"));
  assert.ok(mixed.every((row) => row.rawText === "B.Tech / B.E. in Computer Science"));

  assert.equal(extractQualifications("Bachelor's degree")[0]?.normalized, "Bachelor's Degree");
  const iti = extractQualifications("ITI / Diploma");
  assert.ok(iti.some((row) => row.normalized === "ITI"));
  assert.ok(iti.some((row) => row.normalized === "Diploma"));

  assert.equal(extractQualifications("xyz credential")[0]?.status, "UNPARSED");
  assert.equal(extractQualifications("xyz credential")[0]?.extractionMethod, "CALLER_TEXT");
  assert.equal(extractQualifications(null)[0]?.status, "UNKNOWN");
  assert.equal(extractQualifications(null)[0]?.extractionMethod, "UNAVAILABLE");
  assert.equal(extractQualifications("")[0]?.status, "UNKNOWN");
  assert.equal(mixed[0]?.confidenceTier, "HIGH");
});
