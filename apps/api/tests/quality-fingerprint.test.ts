import assert from "node:assert/strict";
import { test } from "node:test";
import { buildJobQualityAssessment } from "../src/modules/quality/assessment";
import type { JobIntelligenceResult } from "../src/modules/intelligence/contract";
import type { QualityJobInput, QualitySourceInput } from "../src/modules/quality/contract";
import {
  canonicalize,
  computeQualityFingerprint,
  detectQualityChange,
  sha256Canonical,
} from "../src/modules/quality/fingerprint";

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
  id: "job-fp",
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

const intel: JobIntelligenceResult = {
  jobId: "job-fp",
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

function assess(overrides: {
  referenceTime?: Date;
  assessedAt?: Date;
  job?: Partial<QualityJobInput>;
  provenance?: Parameters<typeof buildJobQualityAssessment>[0]["provenance"];
} = {}) {
  return buildJobQualityAssessment({
    job: { ...job, ...overrides.job },
    source,
    provenance: overrides.provenance ?? {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
      evidenceId: "ev-1",
      observationId: "obs-1",
    },
    intelligence: intel,
    referenceTime: overrides.referenceTime ?? referenceTime,
    assessedAt: overrides.assessedAt,
  });
}

test("fingerprint is deterministic, key-order independent, and ignores assessedAt", () => {
  const a = assess({ assessedAt: new Date("2026-09-01T00:00:00.000Z") });
  const b = assess({ assessedAt: new Date("2026-09-02T00:00:00.000Z") });
  assert.equal(a.fingerprint, b.fingerprint);
  assert.notEqual(a.assessedAt, b.assessedAt);

  const first = sha256Canonical({ b: 1, a: { z: 2, y: 3 } });
  const second = sha256Canonical({ a: { y: 3, z: 2 }, b: 1 });
  assert.equal(first, second);
  assert.equal(canonicalize({ b: 1, a: 2 }), canonicalize({ a: 2, b: 1 }));

  const again = assess();
  assert.equal(computeQualityFingerprint(again), again.fingerprint);
  assert.deepEqual(
    detectQualityChange({ previous: a, current: b }),
    {
      changed: false,
      previousFingerprint: a.fingerprint,
      currentFingerprint: b.fingerprint,
      changedComponents: [],
    },
  );
});

test("fingerprint detects freshness, intelligence, and eligibility changes", () => {
  const baseline = assess();

  const stale = assess({
    referenceTime: new Date("2026-12-01T00:00:00.000Z"),
    job: { postedAt: new Date("2026-06-01T00:00:00.000Z") },
  });
  const freshnessChange = detectQualityChange({ previous: baseline, current: stale });
  assert.equal(freshnessChange.changed, true);
  assert.ok(freshnessChange.changedComponents.includes("freshness"));
  assert.ok(freshnessChange.changedComponents.includes("eligibility"));

  const lowIntel = buildJobQualityAssessment({
    job,
    source,
    provenance: {
      observedAt: new Date("2026-08-20T00:00:00.000Z"),
      ingestedAt: "2026-08-20T01:00:00.000Z",
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
    intelligence: {
      ...intel,
      skills: [{ ...intel.skills[0]!, confidenceTier: "LOW" }],
    },
    referenceTime,
  });
  const intelChange = detectQualityChange({ previous: baseline, current: lowIntel });
  assert.equal(intelChange.changed, true);
  assert.ok(intelChange.changedComponents.includes("intelligenceConfidence"));
});
