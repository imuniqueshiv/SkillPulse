import assert from "node:assert/strict";
import { test } from "node:test";
import {
  INSTITUTE_METHODOLOGY_VERSION,
  CAPABILITY_STATUS,
  INSTITUTE_CAPACITY_STATUS,
  classifyCapabilityStatus,
  classifyInstituteCapacity,
  aggregateCapacity,
  getProgramsForSkill,
  getProvidersForSkill,
  summarizeInstituteIntelligence,
  isHighGapSeverity,
  computeCapabilityCoverage,
} from "../src/modules/institute";
import {
  buildInstituteEvaluationCase,
  checkInstituteEvaluationCase,
} from "../src/modules/institute/evaluate";
import type { InstituteCapacityObservation } from "../src/modules/institute/contract";
import { inferGeographyLevel } from "../src/modules/gaps/comparability";

const geo = inferGeographyLevel({
  locationId: null,
  country: "IN",
  state: "EvalState",
  district: "EvalDistrict",
  city: null,
  known: true,
});

function cap(
  partial: Partial<InstituteCapacityObservation> & {
    observationId: string;
    quantity: number;
  },
): InstituteCapacityObservation {
  return {
    observationId: partial.observationId,
    quantity: partial.quantity,
    periodFrom: partial.periodFrom ?? "2026-08-16T00:00:00.000Z",
    periodTo: partial.periodTo ?? "2026-09-01T00:00:00.000Z",
    geography: partial.geography ?? geo,
    providerId: partial.providerId ?? null,
    programId: partial.programId ?? null,
    skillId: partial.skillId ?? null,
    sourceId: partial.sourceId ?? "src",
    evidenceId: partial.evidenceId ?? null,
    confidence: partial.confidence ?? "MEDIUM",
    aggregateGroup: partial.aggregateGroup ?? null,
  };
}

test("institute-v1 policy: capability and capacity classification", () => {
  assert.equal(INSTITUTE_METHODOLOGY_VERSION, "institute-v1");
  assert.equal(isHighGapSeverity("SEVERE"), true);
  assert.equal(isHighGapSeverity("MODERATE"), false);

  assert.equal(
    classifyCapabilityStatus({
      programsCovering: 0,
      capacityStatus: "UNKNOWN",
      programCountInAnalysis: 0,
      hasProviderProgramEvidence: false,
    }),
    CAPABILITY_STATUS.INSUFFICIENT_DATA,
  );
  assert.equal(
    classifyCapabilityStatus({
      programsCovering: 0,
      capacityStatus: "UNKNOWN",
      programCountInAnalysis: 2,
      hasProviderProgramEvidence: true,
    }),
    CAPABILITY_STATUS.MISSING,
  );
  assert.equal(
    classifyCapabilityStatus({
      programsCovering: 1,
      capacityStatus: "INSUFFICIENT",
      programCountInAnalysis: 2,
      hasProviderProgramEvidence: true,
    }),
    CAPABILITY_STATUS.LIMITED,
  );
  assert.equal(
    classifyCapabilityStatus({
      programsCovering: 1,
      capacityStatus: "AVAILABLE",
      programCountInAnalysis: 2,
      hasProviderProgramEvidence: true,
    }),
    CAPABILITY_STATUS.ADEQUATE,
  );

  assert.equal(
    classifyInstituteCapacity({
      quantity: null,
      hasObservations: false,
    }),
    INSTITUTE_CAPACITY_STATUS.UNKNOWN,
  );
  assert.equal(
    classifyInstituteCapacity({
      quantity: 0,
      hasObservations: true,
    }),
    INSTITUTE_CAPACITY_STATUS.UNAVAILABLE,
  );
});

test("capacity aggregation additive vs overlapping protection", () => {
  const additive = aggregateCapacity([
    cap({
      observationId: "a",
      quantity: 50,
      providerId: "org",
      programId: "p1",
      skillId: "s1",
    }),
    cap({
      observationId: "b",
      quantity: 30,
      providerId: "org",
      programId: "p2",
      skillId: "s1",
    }),
  ], { providerId: "org" });
  assert.equal(additive.quantity, 80);
  assert.equal(additive.additive, true);

  const overlap = aggregateCapacity([
    cap({
      observationId: "prov",
      quantity: 100,
      providerId: "org",
      programId: null,
      skillId: "s1",
    }),
    cap({
      observationId: "prog",
      quantity: 40,
      providerId: "org",
      programId: "p1",
      skillId: "s1",
    }),
  ], { providerId: "org" });
  assert.equal(overlap.quantity, 40);
  assert.ok(overlap.notes.some((n) => /overlap/i.test(n)));

  const exclusive = aggregateCapacity([
    cap({
      observationId: "g1",
      quantity: 20,
      providerId: "org",
      programId: "p1",
      skillId: "s1",
      aggregateGroup: "same-source",
    }),
    cap({
      observationId: "g2",
      quantity: 35,
      providerId: "org",
      programId: "p1",
      skillId: "s1",
      aggregateGroup: "same-source",
    }),
  ], { providerId: "org", programId: "p1" });
  assert.equal(exclusive.quantity, 35);
});

test("skill→program→provider mapping; Java != JavaScript; inactive excluded", () => {
  const noInfer = buildInstituteEvaluationCase({
    id: "x",
    label: "x",
    expected: {},
    _builder: "unresolved-no-infer",
  });
  assert.equal(getProgramsForSkill(noInfer.programs, "skill-java").length, 0);
  assert.equal(
    getProgramsForSkill(noInfer.programs, "skill-javascript").length,
    1,
  );
  assert.equal(noInfer.summary.skillCapabilities[0]?.capabilityStatus, "MISSING");

  const multi = buildInstituteEvaluationCase({
    id: "m",
    label: "m",
    expected: {},
    _builder: "multi-provider-same-skill",
  });
  const providers = getProvidersForSkill(multi.programs, "skill-react");
  assert.equal(providers.length, 2);

  const inactive = buildInstituteEvaluationCase({
    id: "i",
    label: "i",
    expected: { inactiveExcluded: true },
    _builder: "inactive-excluded",
  });
  assert.equal(inactive.summary.buckets.activePrograms, 1);
  assert.ok(inactive.summary.programs.every((p) => p.isActive));
});

test("Phase 10 alignment consumed; provider/program separation; provenance", () => {
  const strong = buildInstituteEvaluationCase({
    id: "s",
    label: "s",
    expected: {},
    _builder: "strong-align",
  });
  assert.equal(strong.summary.instituteVersion, INSTITUTE_METHODOLOGY_VERSION);
  assert.equal(strong.summary.trainingVersion, "training-v1");
  assert.equal(strong.summary.programs[0]?.alignment?.alignment, "STRONG");
  assert.equal(strong.summary.providers.length, 1);
  assert.equal(strong.summary.providers[0]?.activeProgramCount, 1);
  assert.ok(strong.summary.programs[0]?.evidence.gapVersion);
  assert.ok(
    strong.summary.providers[0]?.capabilityScore.note.includes("not a best-institute"),
  );

  const multiProg = buildInstituteEvaluationCase({
    id: "mp",
    label: "mp",
    expected: {},
    _builder: "multi-program-provider",
  });
  assert.equal(multiProg.summary.providers.length, 1);
  assert.equal(multiProg.summary.providers[0]?.programs.length, 2);
});

test("no provider data → INSUFFICIENT_DATA; capability coverage finite", () => {
  const none = buildInstituteEvaluationCase({
    id: "n",
    label: "n",
    expected: {},
    _builder: "no-provider-data",
  });
  assert.equal(
    none.summary.skillCapabilities[0]?.capabilityStatus,
    CAPABILITY_STATUS.INSUFFICIENT_DATA,
  );

  const missing = buildInstituteEvaluationCase({
    id: "miss",
    label: "miss",
    expected: {},
    _builder: "high-gap-no-capability",
  });
  assert.equal(
    missing.summary.skillCapabilities[0]?.capabilityStatus,
    CAPABILITY_STATUS.MISSING,
  );

  const coverage = computeCapabilityCoverage(none.summary.skillCapabilities);
  assert.ok(coverage === null || Number.isFinite(coverage));
});

test("deterministic ordering / tie by name", () => {
  const multi = buildInstituteEvaluationCase({
    id: "t",
    label: "t",
    expected: {},
    _builder: "multi-provider-same-skill",
  });
  const names = multi.summary.providers.map(
    (p) => p.providerName ?? p.providerId,
  );
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, sorted);
});

test("summarizeInstituteIntelligence rejects missing gapSummary", () => {
  assert.throws(
    () =>
      summarizeInstituteIntelligence({
        // @ts-expect-error intentional
        gapSummary: null,
        programs: [],
      }),
  );
});
