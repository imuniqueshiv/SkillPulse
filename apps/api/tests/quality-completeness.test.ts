import assert from "node:assert/strict";
import { test } from "node:test";
import { assessCompleteness } from "../src/modules/quality/completeness";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";
import type { QualityJobInput } from "../src/modules/quality/contract";

const baseJob: QualityJobInput = {
  id: "j1",
  title: "Software Developer",
  description: "Build apps",
  companyName: "Acme",
  sourceId: "src",
  externalId: "e1",
  locationId: "loc",
  postedAt: new Date("2026-08-01T00:00:00.000Z"),
  expiresAt: null,
  sourceUrl: null,
  skillCount: 1,
};

const highIntel: JobIntelligenceResult = {
  jobId: "j1",
  processorVersion: "phase6-v1",
  text: { title: "Software Developer", analysisText: "Software Developer" },
  skills: [
    {
      rawTerm: "Python",
      contributingTerms: ["Python"],
      canonicalName: "python",
      status: "RESOLVED",
      extractionMethod: "CANONICAL_NAME_MATCH",
      extractionMethods: ["CANONICAL_NAME_MATCH"],
      confidenceTier: "HIGH",
      requirementLevel: "MENTIONED",
      requirementMethod: "DEFAULT_MENTIONED",
      requirementConfidenceTier: "LOW",
    },
  ],
  occupation: {
    status: "CLASSIFIED",
    code: "2512",
    method: "TITLE_EXACT",
    confidenceTier: "HIGH",
    evidence: "exact",
  },
  sector: {
    status: "CLASSIFIED",
    code: "sp.sector.it-ites",
    method: "OCCUPATION_SECTOR",
    confidenceTier: "HIGH",
    evidence: "occ",
  },
  experience: {
    status: "PARSED",
    minYears: 1,
    rawText: "1+ years",
    extractionMethod: "CALLER_TEXT",
    confidenceTier: "HIGH",
  },
  qualifications: [
    {
      rawText: "B.Tech",
      normalized: "B.Tech",
      status: "PARSED",
      extractionMethod: "CALLER_TEXT",
      confidenceTier: "HIGH",
    },
  ],
};

test("completeness scores complete and missing critical/high/medium fields", () => {
  const complete = assessCompleteness({
    job: baseJob,
    provenance: { observedAt: new Date("2026-08-01T00:00:00.000Z") },
    intelligence: highIntel,
  });
  assert.equal(complete.assessment.score, 1);
  assert.equal(complete.assessment.missingFields.length, 0);
  assert.ok(complete.checks.some((row) => row.rule === "JOB_TITLE_PRESENT" && row.status === "PASS"));

  const missingTitle = assessCompleteness({
    job: { ...baseJob, title: "   " },
    provenance: { observedAt: new Date("2026-08-01T00:00:00.000Z") },
    intelligence: highIntel,
  });
  assert.ok(missingTitle.assessment.missingFields.includes("title"));
  assert.ok(missingTitle.checks.some((row) => row.rule === "JOB_TITLE_PRESENT" && row.status === "FAIL"));

  const missingDescription = assessCompleteness({
    job: { ...baseJob, description: null },
    provenance: { observedAt: new Date("2026-08-01T00:00:00.000Z") },
    intelligence: highIntel,
  });
  assert.ok(missingDescription.assessment.missingFields.includes("description"));
  assert.ok(missingDescription.assessment.score < 1);

  const missingEmployer = assessCompleteness({
    job: { ...baseJob, companyName: null },
    provenance: { observedAt: new Date("2026-08-01T00:00:00.000Z") },
    intelligence: highIntel,
  });
  assert.ok(missingEmployer.assessment.missingFields.includes("employer"));
});

test("unknown derived fields do not count as present and do not invent observed invalidity", () => {
  const intel: JobIntelligenceResult = {
    ...highIntel,
    occupation: { status: "UNCLASSIFIED", method: "UNCLASSIFIED", evidence: "weak" },
    sector: { status: "UNCLASSIFIED", method: "UNCLASSIFIED", evidence: "none" },
    experience: {
      status: "UNKNOWN",
      rawText: null,
      extractionMethod: "UNAVAILABLE",
      confidenceTier: "LOW",
    },
    qualifications: [
      {
        rawText: "",
        status: "UNKNOWN",
        extractionMethod: "UNAVAILABLE",
        confidenceTier: "LOW",
      },
    ],
  };
  const result = assessCompleteness({
    job: baseJob,
    provenance: { observedAt: new Date("2026-08-01T00:00:00.000Z") },
    intelligence: intel,
  });
  assert.ok(result.assessment.missingFields.includes("occupation"));
  assert.ok(result.assessment.missingFields.includes("experience"));
  assert.ok(result.assessment.missingFields.includes("qualification"));
  assert.ok(result.checks.every((row) => row.rule !== "JOB_TITLE_PRESENT" || row.status === "PASS"));
  assert.ok(result.assessment.notes.some((note) => /UNKNOWN\/UNCLASSIFIED/i.test(note)));
});
