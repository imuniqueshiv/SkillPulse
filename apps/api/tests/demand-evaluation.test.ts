import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  DEMAND_EVALUATION_DATA_CLASSIFICATION,
  DEMAND_EVALUATION_DATA_NOT_MARKET,
  evaluateDemandDataset,
  isDemandEvaluationDataset,
  makeObs,
  type DemandEvaluationCase,
  type DemandEvaluationDataset,
} from "../src/modules/demand/evaluate";
import { DEMAND_MIN_TREND_SAMPLE } from "../src/modules/demand/policy";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/demand.json",
);

function buildCase(meta: DemandEvaluationCase): DemandEvaluationCase {
  if (meta.id.startsWith("d-01")) {
    return {
      ...meta,
      current: [
        makeObs({
          jobId: "j1",
          postedAt: "2026-08-10T00:00:00.000Z",
          eligibility: "INCLUDE",
          skills: [
            {
              skillId: "skill-python",
              canonicalName: "python",
              requirementLevel: "REQUIRED",
            },
            {
              skillId: "skill-python",
              canonicalName: "python",
              requirementLevel: "MENTIONED",
            },
            {
              skillId: "skill-java",
              canonicalName: "java",
              requirementLevel: "REQUIRED",
            },
          ],
        }),
        makeObs({
          jobId: "j2",
          postedAt: "2026-08-12T00:00:00.000Z",
          eligibility: "INCLUDE_WITH_CAUTION",
          skills: [
            {
              skillId: "skill-python",
              canonicalName: "python",
              requirementLevel: "PREFERRED",
            },
            {
              skillId: "skill-javascript",
              canonicalName: "javascript",
              requirementLevel: "MENTIONED",
            },
          ],
        }),
        makeObs({
          jobId: "j-ex",
          postedAt: "2026-08-15T00:00:00.000Z",
          eligibility: "EXCLUDE",
          skills: [
            {
              skillId: "skill-python",
              canonicalName: "python",
              requirementLevel: "REQUIRED",
            },
          ],
        }),
      ].filter((o) => o.eligibility !== "EXCLUDE" || true),
      previous: [],
      expected: {
        ...meta.expected,
        // INCLUDE REQUIRED 1.0 + CAUTION PREFERRED 0.5*0.75=0.375 → 1.375
        skillWeightedDemand: {
          "skill-python": 1.375,
          "skill-java": 1.0,
          "skill-javascript": 0.125,
        },
      },
    };
  }

  if (meta.id.startsWith("d-02")) {
    return {
      ...meta,
      current: [
        makeObs({
          jobId: "a",
          postedAt: "2026-08-10T00:00:00.000Z",
          eligibility: "INCLUDE",
          skills: [
            {
              skillId: "s1",
              canonicalName: "python",
              requirementLevel: "REQUIRED",
            },
          ],
          occupation: {
            status: "CLASSIFIED",
            occupationId: "occ-1",
            code: "2512",
            name: "Software Developers",
          },
          sector: {
            status: "CLASSIFIED",
            sectorId: "sec-1",
            code: "sp.sector.it-ites",
            name: "IT",
          },
          location: {
            locationId: null,
            country: null,
            state: null,
            district: null,
            city: null,
            known: false,
          },
          experience: {
            status: "PARSED",
            minYears: 2,
            confidenceTier: "HIGH",
          },
          qualifications: [
            {
              status: "PARSED",
              normalized: "bachelor",
              confidenceTier: "MEDIUM",
            },
          ],
        }),
        makeObs({
          jobId: "b",
          postedAt: "2026-08-11T00:00:00.000Z",
          eligibility: "INCLUDE",
          skills: [
            { skillId: "s2", canonicalName: "java", requirementLevel: "OPTIONAL" },
          ],
          occupation: {
            status: "UNCLASSIFIED",
            occupationId: null,
            code: null,
            name: null,
          },
          sector: {
            status: "UNCLASSIFIED",
            sectorId: null,
            code: null,
            name: null,
          },
          experience: { status: "UNKNOWN", confidenceTier: "LOW" },
        }),
      ],
      previous: [],
    };
  }

  // d-03 trends
  const mk = (skillId: string, n: number, prefix: string, day: number) =>
    Array.from({ length: n }, (_, i) =>
      makeObs({
        jobId: `${prefix}-${i}`,
        postedAt: new Date(Date.UTC(2026, 7, day, i % 20)).toISOString(),
        eligibility: "INCLUDE",
        skills: [
          { skillId, canonicalName: skillId, requirementLevel: "REQUIRED" },
        ],
      }),
    );

  assert.ok(DEMAND_MIN_TREND_SAMPLE >= 10);
  return {
    ...meta,
    current: [
      ...mk("skill-rise", 12, "c-rise", 20),
      ...mk("skill-fall", 10, "c-fall", 20),
      ...mk("skill-flat", 10, "c-flat", 20),
      ...mk("skill-tiny", 2, "c-tiny", 20),
    ],
    previous: [
      ...mk("skill-rise", 10, "p-rise", 5),
      ...mk("skill-fall", 12, "p-fall", 5),
      ...mk("skill-flat", 10, "p-flat", 5),
      ...mk("skill-tiny", 1, "p-tiny", 5),
    ],
  };
}

test("demand evaluation dataset is synthetic and checks pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isDemandEvaluationDataset(raw));
  assert.equal(raw.classification, DEMAND_EVALUATION_DATA_CLASSIFICATION);
  assert.match(raw.note, new RegExp(DEMAND_EVALUATION_DATA_NOT_MARKET, "i"));

  const dataset: DemandEvaluationDataset = {
    classification: raw.classification,
    note: raw.note,
    cases: raw.cases.map((row) => buildCase(row as DemandEvaluationCase)),
  };

  // For d-01 exclude check: include EXCLUDE row with zero contribution in current
  const d01 = dataset.cases.find((c) => c.id.startsWith("d-01"));
  assert.ok(d01);
  d01.current = [
    ...d01.current.filter((o) => o.eligibility !== "EXCLUDE"),
    makeObs({
      jobId: "j-ex",
      postedAt: "2026-08-15T00:00:00.000Z",
      eligibility: "EXCLUDE",
      skills: [
        {
          skillId: "skill-python",
          canonicalName: "python",
          requirementLevel: "REQUIRED",
        },
      ],
    }),
  ];

  const summary = evaluateDemandDataset(dataset);
  console.log(
    "DEMAND_EVALUATION_METRICS",
    JSON.stringify({
      caseCount: summary.caseCount,
      passed: summary.passed,
      failed: summary.failed,
      limitation: summary.limitation,
      failures: summary.outcomes.filter((o) => !o.pass),
    }),
  );
  assert.equal(summary.failed, 0);
  assert.equal(summary.passed, summary.caseCount);
});
