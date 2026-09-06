import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GAP_COMPARABILITY,
  GAP_CONFIDENCE,
  GAP_METHODOLOGY_VERSION,
  GAP_SEVERITY,
  SUPPLY_TYPE,
  aggregateSupplyBySkill,
  classifyConfidence,
  classifyGapTrend,
  classifySeverity,
  compareGapRows,
  computeGapMetrics,
  computePriorityScore,
  normalizeSupplyObservations,
  resolveComparability,
  summarizeSkillGapsFromParts,
} from "../src/modules/gaps";
import { makeSupplyObs } from "../src/modules/gaps/evaluate";
import { makeObs } from "../src/modules/demand/evaluate";
import { inferGeographyLevel } from "../src/modules/gaps/comparability";

const from = new Date("2026-08-16T00:00:00.000Z");
const to = new Date("2026-09-01T00:00:00.000Z");
const mhGeo = inferGeographyLevel({
  locationId: null,
  country: "IN",
  state: "EvalState",
  district: null,
  city: null,
});

test("gap metrics: shortage, surplus, zero supply/demand, no Infinity", () => {
  const shortage = computeGapMetrics(10, 4);
  assert.equal(shortage.netGap, 6);
  assert.equal(shortage.shortageQuantity, 6);
  assert.equal(shortage.demandSupplyRatio, 2.5);
  assert.equal(shortage.supplyCoverageRatio, 0.4);
  assert.equal(shortage.gapPercentage, 60);

  const surplus = computeGapMetrics(3, 10);
  assert.equal(surplus.netGap, -7);
  assert.equal(surplus.shortageQuantity, 0);
  assert.ok(surplus.netGap < 0);

  const zeroSupply = computeGapMetrics(5, 0);
  assert.equal(zeroSupply.demandSupplyRatio, null);
  assert.equal(zeroSupply.zeroSupply, true);
  assert.equal(zeroSupply.gapPercentage, 100);

  const zeroDemand = computeGapMetrics(0, 4);
  assert.equal(zeroDemand.gapPercentage, null);
  assert.equal(zeroDemand.supplyCoverageRatio, null);

  const bothZero = computeGapMetrics(0, 0);
  assert.equal(bothZero.bothZero, true);
  assert.equal(bothZero.demandSupplyRatio, null);
});

test("supply normalization dedupes and separates types; unresolved counted", () => {
  const { resolved, unresolvedCount, duplicatesDropped } =
    normalizeSupplyObservations([
      makeSupplyObs({
        observationId: "a",
        skillId: "skill-python",
        quantity: 2,
        supplyType: SUPPLY_TYPE.TRAINED,
        state: "EvalState",
      }),
      makeSupplyObs({
        observationId: "a",
        skillId: "skill-python",
        quantity: 99,
        supplyType: SUPPLY_TYPE.TRAINED,
        state: "EvalState",
      }),
      makeSupplyObs({
        observationId: "b",
        skillId: null,
        quantity: 1,
        supplyType: SUPPLY_TYPE.TRAINED,
        resolved: false,
      }),
      makeSupplyObs({
        observationId: "c",
        skillId: "skill-python",
        quantity: 3,
        supplyType: SUPPLY_TYPE.CERTIFIED,
        state: "EvalState",
      }),
    ]);
  assert.equal(duplicatesDropped, 1);
  assert.equal(unresolvedCount, 1);
  assert.equal(resolved.length, 2);

  const aggregated = aggregateSupplyBySkill({ observations: resolved });
  assert.equal(aggregated.length, 2);
  assert.ok(aggregated.every((row) => row.supplyType !== undefined));
  const trained = aggregated.find((r) => r.supplyType === SUPPLY_TYPE.TRAINED);
  const certified = aggregated.find((r) => r.supplyType === SUPPLY_TYPE.CERTIFIED);
  assert.equal(trained?.quantity, 2);
  assert.equal(certified?.quantity, 3);
});

test("comparability: DIRECT / PROXY / UNKNOWN and geo mismatch", () => {
  assert.equal(
    resolveComparability({
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      demandGeography: mhGeo,
      supplyGeography: mhGeo,
    }),
    GAP_COMPARABILITY.DIRECT,
  );
  assert.equal(
    resolveComparability({
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      demandGeography: mhGeo,
      supplyGeography: mhGeo,
    }),
    GAP_COMPARABILITY.PROXY,
  );
  assert.equal(
    resolveComparability({
      supplyType: SUPPLY_TYPE.OTHER,
      demandGeography: mhGeo,
      supplyGeography: mhGeo,
    }),
    GAP_COMPARABILITY.UNKNOWN,
  );
  const cityGeo = inferGeographyLevel({
    locationId: null,
    country: "IN",
    state: "EvalState",
    district: "Pune",
    city: "Pune",
  });
  assert.equal(
    resolveComparability({
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      demandGeography: mhGeo,
      supplyGeography: cityGeo,
    }),
    GAP_COMPARABILITY.UNKNOWN,
  );
});

test("severity, confidence, trends, priority, deterministic ranking", () => {
  const metrics = computeGapMetrics(20, 4);
  const severity = classifySeverity({
    metrics,
    demandSample: 10,
    supplySample: 5,
    comparability: GAP_COMPARABILITY.DIRECT,
  });
  assert.equal(severity, GAP_SEVERITY.SEVERE);

  const surplusSeverity = classifySeverity({
    metrics: computeGapMetrics(2, 10),
    demandSample: 10,
    supplySample: 5,
    comparability: GAP_COMPARABILITY.DIRECT,
  });
  assert.equal(surplusSeverity, GAP_SEVERITY.SURPLUS);

  const lowSample = classifySeverity({
    metrics: computeGapMetrics(2, 0),
    demandSample: 2,
    supplySample: 0,
    comparability: GAP_COMPARABILITY.DIRECT,
  });
  assert.equal(lowSample, GAP_SEVERITY.INSUFFICIENT_DATA);

  const confidence = classifyConfidence({
    demandSample: 10,
    supplySample: 5,
    comparability: GAP_COMPARABILITY.PROXY,
    severity: GAP_SEVERITY.HIGH,
    supplyConfidence: null,
    demandCautionShare: 0,
  });
  assert.equal(confidence, GAP_CONFIDENCE.MEDIUM);

  assert.equal(
    classifyGapTrend({
      currentShortage: 20,
      previousShortage: 10,
      currentSample: 10,
      previousSample: 10,
    }).direction,
    "WIDENING",
  );
  assert.equal(
    classifyGapTrend({
      currentShortage: 8,
      previousShortage: 10,
      currentSample: 10,
      previousSample: 10,
    }).direction,
    "NARROWING",
  );

  const p1 = computePriorityScore({
    shortageQuantity: 10,
    demandQuantity: 12,
    severity: GAP_SEVERITY.SEVERE,
    confidence: GAP_CONFIDENCE.HIGH,
    trend: "WIDENING",
    maxShortage: 10,
    maxDemand: 12,
  });
  const p2 = computePriorityScore({
    shortageQuantity: 1,
    demandQuantity: 2,
    severity: GAP_SEVERITY.BALANCED,
    confidence: GAP_CONFIDENCE.LOW,
    trend: "STABLE",
    maxShortage: 10,
    maxDemand: 12,
  });
  assert.ok(p1.score > p2.score);

  const ranked = [
    { priority: { score: 0.5 }, metrics: { shortageQuantity: 1 }, canonicalName: "b" },
    { priority: { score: 0.5 }, metrics: { shortageQuantity: 2 }, canonicalName: "a" },
    { priority: { score: 0.9 }, metrics: { shortageQuantity: 1 }, canonicalName: "z" },
  ].sort(compareGapRows);
  assert.equal(ranked[0]?.canonicalName, "z");
  assert.equal(ranked[1]?.canonicalName, "a");
});

test("end-to-end gap from Phase 8-style demand + supply; Java != JavaScript", () => {
  const demandCurrent = [
    ...Array.from({ length: 8 }, (_, i) =>
      makeObs({
        jobId: `j-py-${i}`,
        postedAt: new Date(Date.UTC(2026, 7, 20, i)).toISOString(),
        eligibility: "INCLUDE",
        skills: [
          {
            skillId: "skill-python",
            canonicalName: "python",
            requirementLevel: "REQUIRED",
          },
        ],
        location: {
          locationId: null,
          country: "IN",
          state: "EvalState",
          district: null,
          city: null,
          known: true,
        },
      }),
    ),
    makeObs({
      jobId: "j-java",
      postedAt: "2026-08-20T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [
        { skillId: "skill-java", canonicalName: "java", requirementLevel: "REQUIRED" },
      ],
    }),
    makeObs({
      jobId: "j-js",
      postedAt: "2026-08-20T01:00:00.000Z",
      eligibility: "INCLUDE_WITH_CAUTION",
      skills: [
        {
          skillId: "skill-javascript",
          canonicalName: "javascript",
          requirementLevel: "REQUIRED",
        },
      ],
    }),
  ];

  const supply = [
    makeSupplyObs({
      observationId: "s1",
      skillId: "skill-python",
      quantity: 1,
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      state: "EvalState",
    }),
    makeSupplyObs({
      observationId: "s2",
      skillId: "skill-python",
      quantity: 1,
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      state: "EvalState",
    }),
    makeSupplyObs({
      observationId: "s3",
      skillId: "skill-python",
      quantity: 0,
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      state: "EvalState",
    }),
    makeSupplyObs({
      observationId: "s-java",
      skillId: "skill-java",
      quantity: 5,
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      state: "EvalState",
      occupationId: "occ-1",
      sectorId: "sec-1",
    }),
  ];

  const summary = summarizeSkillGapsFromParts({
    from,
    to,
    demandCurrent,
    demandPrevious: [],
    weightedEligibleJobs: demandCurrent.reduce((s, o) => s + o.qualityWeight, 0),
    supplyObservations: supply,
    geography: { state: "EvalState", country: "IN" },
    rankLimit: 20,
  });

  assert.equal(summary.gapVersion, GAP_METHODOLOGY_VERSION);
  assert.equal(summary.demandVersion, "demand-v1");
  const python = summary.skills.find((s) => s.skillId === "skill-python");
  assert.ok(python);
  assert.equal(python.comparability, "DIRECT");
  assert.equal(python.metrics.supplyQuantity, 2);
  assert.equal(python.metrics.demandQuantity, 8);
  assert.equal(python.metrics.netGap, 6);
  assert.notEqual(
    summary.skills.find((s) => s.skillId === "skill-java")?.skillId,
    summary.skills.find((s) => s.skillId === "skill-javascript")?.skillId,
  );
  assert.ok(summary.occupations.some((o) => o.occupationId === "occ-1"));
  assert.ok(summary.sectors.some((s) => s.sectorId === "sec-1"));
  assert.ok(summary.limitations.some((n) => /TRAINING_CAPACITY/i.test(n)));
  assert.equal(summary.demandVersion, "demand-v1");
  assert.ok(summary.notes.length >= 1);
});
