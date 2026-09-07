import type { SkillGapRow, SkillGapSummary } from "../gaps/contract";
import { GAP_METHODOLOGY_VERSION } from "../gaps/policy";
import type { TrainingProgramView, TrainingIntelligenceSummary } from "./contract";
import { buildProgramView } from "./programs";
import { CURRICULUM_COVERAGE_STATUS } from "./policy";
import { summarizeTrainingIntelligence } from "./summary";

export const TRAINING_EVALUATION_DATA_CLASSIFICATION = "SYNTHETIC EVALUATION DATA";
export const TRAINING_EVALUATION_DATA_NOT_MARKET =
  "NOT REAL LABOUR-MARKET EVIDENCE";

export type TrainingEvaluationExpected = {
  trainingNeed?: string;
  capacityStatus?: string;
  alignment?: string;
  coverageApprox?: number;
  hasCurriculumGapForSkill?: string;
  noCurriculumGapForSkill?: string;
};

export type TrainingEvaluationCase = {
  id: string;
  label: string;
  expected: TrainingEvaluationExpected;
  _builder: string;
};

export type TrainingEvaluationDataset = {
  classification: string;
  note: string;
  cases: TrainingEvaluationCase[];
};

export function isTrainingEvaluationDataset(
  value: unknown,
): value is TrainingEvaluationDataset {
  if (!value || typeof value !== "object") return false;
  const row = value as TrainingEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
}

function makeGap(partial: Partial<SkillGapRow> & { skillId: string; canonicalName: string }): SkillGapRow {
  return {
    skillId: partial.skillId,
    canonicalName: partial.canonicalName,
    name: partial.name ?? partial.canonicalName,
    supplyType: partial.supplyType ?? "AVAILABLE_WORKFORCE",
    comparability: partial.comparability ?? "DIRECT",
    metrics: partial.metrics ?? {
      demandQuantity: 10,
      supplyQuantity: 2,
      netGap: 8,
      shortageQuantity: 8,
      demandSupplyRatio: 5,
      supplyCoverageRatio: 0.2,
      gapPercentage: 80,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
    severity: partial.severity ?? "SEVERE",
    confidence: partial.confidence ?? "HIGH",
    trend: partial.trend ?? {
      direction: "WIDENING",
      currentShortage: 8,
      previousShortage: 4,
      growthRate: 1,
      currentSample: 10,
      previousSample: 10,
      method: GAP_METHODOLOGY_VERSION,
    },
    priority: partial.priority ?? {
      score: 0.8,
      components: {
        shortageMagnitude: 0.8,
        demandMagnitude: 0.8,
        severity: 1,
        confidence: 1,
        trend: 1,
      },
      note: "eval",
    },
    geography: partial.geography ?? {
      locationId: null,
      country: "IN",
      state: "EvalState",
      district: null,
      city: null,
      known: true,
      level: "STATE",
    },
    period: partial.period ?? {
      from: "2026-08-16T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
      dateField: "postedAt",
    },
    demandVersion: "demand-v1",
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandJobCount: partial.demandJobCount ?? 10,
    supplyObservationCount: partial.supplyObservationCount ?? 3,
    occupationId: partial.occupationId ?? null,
    sectorId: partial.sectorId ?? null,
    evidence: partial.evidence ?? {
      demandIncludedJobs: 10,
      demandCautionJobs: 0,
      supplyObservationIds: ["s1"],
      supplySourceIds: ["src"],
    },
    notes: partial.notes ?? [],
  };
}

function makeGapSummary(skills: SkillGapRow[]): SkillGapSummary {
  return {
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    period: skills[0]?.period ?? {
      from: "2026-08-16T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
      dateField: "postedAt",
    },
    previousPeriod: {
      from: "2026-07-31T00:00:00.000Z",
      to: "2026-08-16T00:00:00.000Z",
      dateField: "postedAt",
    },
    filters: { geography: null, supplyType: null },
    policy: {
      minDemandSample: 5,
      minSupplySample: 3,
      severityThresholds: { BALANCED: 0.1, MODERATE: 0.3, HIGH: 0.5 },
      trendThresholds: { WIDENING: 0.1, NARROWING: -0.1 },
    },
    coverage: {
      demandSkills: skills.length,
      supplySkills: skills.length,
      matchedSkills: skills.length,
      demandOnlySkills: 0,
      supplyOnlySkills: 0,
      unresolvedSupplyObservations: 0,
    },
    skills,
    occupations: [],
    sectors: [],
    geography: [],
    buckets: {
      shortages: 1,
      balanced: 0,
      surplus: 0,
      insufficientData: 0,
      severe: 1,
      high: 0,
      direct: 1,
      proxy: 0,
      unknownComparability: 0,
      widening: 1,
      narrowing: 0,
      stable: 0,
    },
    topPriority: skills.slice(0, 1),
    limitations: [],
    notes: ["eval"],
  };
}

export function buildTrainingEvaluationCase(meta: TrainingEvaluationCase): {
  id: string;
  gapSummary: SkillGapSummary;
  programs: TrainingProgramView[];
  capacity: Record<string, number>;
  expected: TrainingEvaluationExpected;
} {
  const python = makeGap({
    skillId: "skill-python",
    canonicalName: "python",
    severity: "SEVERE",
    metrics: {
      demandQuantity: 100,
      supplyQuantity: 20,
      netGap: 80,
      shortageQuantity: 80,
      demandSupplyRatio: 5,
      supplyCoverageRatio: 0.2,
      gapPercentage: 80,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
  });
  const docker = makeGap({
    skillId: "skill-docker",
    canonicalName: "docker",
    severity: "HIGH",
    metrics: {
      demandQuantity: 70,
      supplyQuantity: 10,
      netGap: 60,
      shortageQuantity: 60,
      demandSupplyRatio: 7,
      supplyCoverageRatio: 0.142857,
      gapPercentage: 85.714286,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
  });
  const sql = makeGap({
    skillId: "skill-sql",
    canonicalName: "sql",
    severity: "MODERATE",
    metrics: {
      demandQuantity: 90,
      supplyQuantity: 70,
      netGap: 20,
      shortageQuantity: 20,
      demandSupplyRatio: 1.285714,
      supplyCoverageRatio: 0.777778,
      gapPercentage: 22.222222,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
  });
  const aws = makeGap({
    skillId: "skill-aws",
    canonicalName: "aws",
    severity: "HIGH",
    metrics: {
      demandQuantity: 60,
      supplyQuantity: 5,
      netGap: 55,
      shortageQuantity: 55,
      demandSupplyRatio: 12,
      supplyCoverageRatio: 0.083333,
      gapPercentage: 91.666667,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
  });

  const alignedProgram = buildProgramView({
    programId: "prog-aligned",
    curriculumId: "prog-aligned",
    courseId: "course-aligned",
    courseName: "Data Skills",
    curriculumTitle: "Data Skills v1",
    curriculumVersion: "1",
    organizationId: "org-1",
    organizationName: "Eval Institute",
    occupationId: null,
    sectorId: null,
    status: "ACTIVE",
    isDemo: true,
    skills: [
      {
        skillId: "skill-python",
        canonicalName: "python",
        name: "Python",
        coverage: CURRICULUM_COVERAGE_STATUS.FULL,
        importance: "REQUIRED",
      },
      {
        skillId: "skill-sql",
        canonicalName: "sql",
        name: "SQL",
        coverage: CURRICULUM_COVERAGE_STATUS.FULL,
        importance: "REQUIRED",
      },
    ],
  });

  switch (meta._builder) {
    case "high-need":
      return {
        id: meta.id,
        gapSummary: makeGapSummary([python]),
        programs: [alignedProgram],
        capacity: { "skill-python": 10 },
        expected: { ...meta.expected, trainingNeed: "HIGH", capacityStatus: "INSUFFICIENT" },
      };
    case "strong-align":
      return {
        id: meta.id,
        gapSummary: makeGapSummary([python, sql]),
        programs: [alignedProgram],
        capacity: {},
        expected: {
          ...meta.expected,
          alignment: "STRONG",
          coverageApprox: (100 + 90) / (100 + 90),
          noCurriculumGapForSkill: "skill-python",
        },
      };
    case "weak-align-gaps":
      return {
        id: meta.id,
        gapSummary: makeGapSummary([python, sql, docker, aws]),
        programs: [alignedProgram],
        capacity: {},
        expected: {
          ...meta.expected,
          alignment: "MODERATE",
          hasCurriculumGapForSkill: "skill-docker",
        },
      };
    case "low-need":
      return {
        id: meta.id,
        gapSummary: makeGapSummary([
          makeGap({
            skillId: "skill-flat",
            canonicalName: "flat",
            severity: "BALANCED",
            metrics: {
              demandQuantity: 10,
              supplyQuantity: 10,
              netGap: 0,
              shortageQuantity: 0,
              demandSupplyRatio: 1,
              supplyCoverageRatio: 1,
              gapPercentage: 0,
              zeroSupply: false,
              zeroDemand: false,
              bothZero: false,
            },
          }),
        ]),
        programs: [],
        capacity: { "skill-flat": 10 },
        expected: { ...meta.expected, trainingNeed: "LOW", capacityStatus: "AVAILABLE" },
      };
    case "insufficient":
      return {
        id: meta.id,
        gapSummary: makeGapSummary([
          makeGap({
            skillId: "skill-tiny",
            canonicalName: "tiny",
            severity: "INSUFFICIENT_DATA",
            confidence: "INSUFFICIENT_DATA",
            demandJobCount: 1,
          }),
        ]),
        programs: [],
        capacity: {},
        expected: { ...meta.expected, trainingNeed: "INSUFFICIENT_DATA" },
      };
    default:
      return {
        id: meta.id,
        gapSummary: makeGapSummary([python]),
        programs: [alignedProgram],
        capacity: {},
        expected: meta.expected,
      };
  }
}

export function evaluateTrainingCase(input: {
  id: string;
  summary: TrainingIntelligenceSummary;
  expected: TrainingEvaluationExpected;
}): { id: string; pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const e = input.expected;
  const need = input.summary.trainingNeeds[0];

  if (e.trainingNeed && need?.trainingNeed !== e.trainingNeed) {
    failures.push(`trainingNeed expected ${e.trainingNeed} got ${need?.trainingNeed}`);
  }
  if (e.capacityStatus && need?.capacity.status !== e.capacityStatus) {
    failures.push(
      `capacityStatus expected ${e.capacityStatus} got ${need?.capacity.status}`,
    );
  }
  if (e.alignment) {
    const prog = input.summary.programs[0];
    if (prog?.alignment !== e.alignment) {
      failures.push(`alignment expected ${e.alignment} got ${prog?.alignment}`);
    }
  }
  if (typeof e.coverageApprox === "number") {
    const cov = input.summary.programs[0]?.demandWeightedCoverage;
    if (cov === null || cov === undefined || Math.abs(cov - e.coverageApprox) > 1e-4) {
      failures.push(`coverage expected ~${e.coverageApprox} got ${cov}`);
    }
  }
  if (e.hasCurriculumGapForSkill) {
    if (
      !input.summary.curriculumGaps.some(
        (g) => g.skillId === e.hasCurriculumGapForSkill,
      )
    ) {
      failures.push(`missing curriculum gap for ${e.hasCurriculumGapForSkill}`);
    }
  }
  if (e.noCurriculumGapForSkill) {
    if (
      input.summary.curriculumGaps.some(
        (g) => g.skillId === e.noCurriculumGapForSkill,
      )
    ) {
      failures.push(`unexpected curriculum gap for ${e.noCurriculumGapForSkill}`);
    }
  }

  return { id: input.id, pass: failures.length === 0, failures };
}

export { summarizeTrainingIntelligence };
