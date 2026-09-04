import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobQualityAssessment } from "../src/modules/quality/assessment";
import { assessIntelligenceConfidence } from "../src/modules/quality/intelligence-confidence";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";
import type { QualityJobInput, QualitySourceInput } from "../src/modules/quality/contract";

const referenceTime = new Date("2026-09-01T00:00:00.000Z");

const source: QualitySourceInput = {
  id: "src-1",
  code: "sp.source.demo",
  name: "Demo",
  active: true,
  reliability: null,
  type: "OTHER",
  geographicScope: "INDIA",
};

const job: QualityJobInput = {
  id: "job-elig",
  title: "Software Developers",
  description: "Python required",
  companyName: "Co",
  sourceId: "src-1",
  externalId: "e1",
  locationId: "loc",
  postedAt: new Date("2026-08-20T00:00:00.000Z"),
  expiresAt: null,
  sourceUrl: null,
  skillCount: 1,
};

const highIntel: JobIntelligenceResult = {
  jobId: "job-elig",
  processorVersion: "phase6-v1",
  text: { title: "Software Developers", analysisText: "Software Developers" },
  skills: [
    {
      rawTerm: "Python",
      contributingTerms: ["Python"],
      canonicalName: "python",
      status: "RESOLVED",
      extractionMethod: "CANONICAL_NAME_MATCH",
      extractionMethods: ["CANONICAL_NAME_MATCH"],
      confidenceTier: "HIGH",
      requirementLevel: "REQUIRED",
      requirementMethod: "LOCAL_SIGNAL",
      requirementConfidenceTier: "HIGH",
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

test("intelligence confidence HIGH MEDIUM LOW UNKNOWN and skips UNKNOWN fields", () => {
  const high = assessIntelligenceConfidence({
    intelligence: highIntel,
    processorVersion: "phase6-v1",
  });
  assert.equal(high.assessment.overall, "HIGH");
  assert.ok(high.assessment.skipped.some((row) => row.signal === "experience"));

  const mediumIntel: JobIntelligenceResult = {
    ...highIntel,
    skills: [
      {
        ...highIntel.skills[0]!,
        confidenceTier: "MEDIUM",
        normalizationMethod: "alias",
        extractionMethod: "ALIAS_MATCH",
        extractionMethods: ["ALIAS_MATCH"],
      },
    ],
    occupation: {
      status: "CLASSIFIED",
      code: "2512",
      method: "TITLE_KEYWORD",
      confidenceTier: "MEDIUM",
      evidence: "kw",
    },
  };
  assert.equal(
    assessIntelligenceConfidence({
      intelligence: mediumIntel,
      processorVersion: "phase6-v1",
    }).assessment.overall,
    "MEDIUM",
  );

  const lowIntel: JobIntelligenceResult = {
    ...highIntel,
    skills: [{ ...highIntel.skills[0]!, confidenceTier: "LOW" }],
  };
  assert.equal(
    assessIntelligenceConfidence({
      intelligence: lowIntel,
      processorVersion: "phase6-v1",
    }).assessment.overall,
    "LOW",
  );

  assert.equal(
    assessIntelligenceConfidence({
      intelligence: null,
      processorVersion: "phase6-v1",
    }).assessment.overall,
    "UNKNOWN",
  );
});

test("eligibility INCLUDE CAUTION EXCLUDE with reason codes", () => {
  const include = buildJobQualityAssessment({
    job,
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  assert.equal(include.eligibility, "INCLUDE");
  assert.deepEqual(include.reasons, []);

  const caution = buildJobQualityAssessment({
    job: { ...job, description: null },
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  assert.equal(caution.eligibility, "INCLUDE_WITH_CAUTION");
  assert.ok(caution.reasons.some((row) => row.code === "MISSING_DESCRIPTION"));

  const excludeStale = buildJobQualityAssessment({
    job: { ...job, postedAt: new Date("2026-06-01T00:00:00.000Z") },
    source,
    provenance: {
      observedAt: new Date("2026-06-01T00:00:00.000Z"),
      ingestedAt: "2026-06-01T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  assert.equal(excludeStale.eligibility, "EXCLUDE");
  assert.ok(excludeStale.reasons.some((row) => row.code === "STALE_DATA"));

  const excludeDup = buildJobQualityAssessment({
    job,
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "DUPLICATE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  assert.equal(excludeDup.eligibility, "EXCLUDE");
  assert.ok(excludeDup.reasons.some((row) => row.code === "DUPLICATE"));

  const first = buildJobQualityAssessment({
    job,
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  const second = buildJobQualityAssessment({
    job,
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: highIntel,
    referenceTime,
  });
  assert.deepEqual(first, second);
});
