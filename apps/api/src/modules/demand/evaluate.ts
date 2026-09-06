import type { DemandJobObservation } from "./contract";
import { summarizeDemandFromObservations } from "./summary";
import {
  DEMAND_TREND_DIRECTION,
  qualityWeight,
  requirementWeight,
  skillContribution,
} from "./policy";
import { dedupeJobSkills } from "./skills-util";
import type { QualityEligibility } from "../quality/contract";
import type {
  JobIntelligenceSkill,
  SkillRequirementLevel,
} from "../intelligence/contract";

/**
 * SYNTHETIC EVALUATION DATA — NOT REAL LABOUR-MARKET EVIDENCE.
 */
export const DEMAND_EVALUATION_DATA_CLASSIFICATION =
  "SYNTHETIC EVALUATION DATA";
export const DEMAND_EVALUATION_DATA_NOT_MARKET =
  "NOT REAL LABOUR-MARKET EVIDENCE";

export type DemandEvaluationExpected = {
  skillWeightedDemand?: Record<string, number>;
  skillJobCount?: Record<string, number>;
  javaDistinctFromJavascript?: boolean;
  occupationNames?: string[];
  sectorNames?: string[];
  unknownGeographyPresent?: boolean;
  experienceKnown?: number;
  experienceUnknown?: number;
  qualificationKnown?: number;
  risingSkillIds?: string[];
  decliningSkillIds?: string[];
  stableSkillIds?: string[];
  insufficientTrend?: boolean;
  excludedContributesZero?: boolean;
};

export type DemandEvaluationCase = {
  id: string;
  label: string;
  from: string;
  to: string;
  current: DemandJobObservation[];
  previous: DemandJobObservation[];
  expected: DemandEvaluationExpected;
};

export type DemandEvaluationDataset = {
  classification: string;
  note: string;
  cases: DemandEvaluationCase[];
};

export type DemandEvaluationOutcome = {
  id: string;
  pass: boolean;
  failures: string[];
};

export type DemandEvaluationSummary = {
  classification: string;
  caseCount: number;
  passed: number;
  failed: number;
  outcomes: DemandEvaluationOutcome[];
  limitation: string;
};

export function isDemandEvaluationDataset(
  value: unknown,
): value is DemandEvaluationDataset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as DemandEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
}

function approxEqual(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol;
}

export function evaluateDemandCase(
  testCase: DemandEvaluationCase,
): DemandEvaluationOutcome {
  const from = new Date(testCase.from);
  const to = new Date(testCase.to);
  const contributing = testCase.current.filter((obs) => obs.qualityWeight > 0);
  const weightedEligibleJobs = contributing.reduce(
    (sum, obs) => sum + obs.qualityWeight,
    0,
  );
  const summary = summarizeDemandFromObservations({
    current: contributing,
    previous: testCase.previous.filter((obs) => obs.qualityWeight > 0),
    from,
    to,
    weightedEligibleJobs,
    rankLimit: 50,
  });

  const failures: string[] = [];
  const expected = testCase.expected;

  if (expected.skillWeightedDemand) {
    for (const [skillId, value] of Object.entries(expected.skillWeightedDemand)) {
      const row = summary.skills.find((s) => s.skillId === skillId);
      if (!row || !approxEqual(row.weightedDemand, value)) {
        failures.push(
          `skillWeightedDemand ${skillId}: expected ${value}, got ${row?.weightedDemand}`,
        );
      }
    }
  }

  if (expected.skillJobCount) {
    for (const [skillId, value] of Object.entries(expected.skillJobCount)) {
      const row = summary.skills.find((s) => s.skillId === skillId);
      if (!row || row.jobCount !== value) {
        failures.push(
          `skillJobCount ${skillId}: expected ${value}, got ${row?.jobCount}`,
        );
      }
    }
  }

  if (expected.javaDistinctFromJavascript) {
    const java = summary.skills.find((s) => s.canonicalName === "java");
    const js = summary.skills.find((s) => s.canonicalName === "javascript");
    if (!java || !js || java.skillId === js.skillId) {
      failures.push("Java must remain distinct from JavaScript");
    }
  }

  if (expected.occupationNames) {
    for (const name of expected.occupationNames) {
      if (!summary.occupations.some((o) => o.name === name)) {
        failures.push(`missing occupation ${name}`);
      }
    }
  }

  if (expected.sectorNames) {
    for (const name of expected.sectorNames) {
      if (!summary.sectors.some((s) => s.name === name)) {
        failures.push(`missing sector ${name}`);
      }
    }
  }

  if (expected.unknownGeographyPresent) {
    if (!summary.geography.some((g) => !g.known || g.key === "UNKNOWN")) {
      failures.push("expected UNKNOWN geography");
    }
  }

  if (typeof expected.experienceKnown === "number") {
    if (summary.experience.coverage.known !== expected.experienceKnown) {
      failures.push(
        `experienceKnown expected ${expected.experienceKnown} got ${summary.experience.coverage.known}`,
      );
    }
  }
  if (typeof expected.experienceUnknown === "number") {
    if (summary.experience.coverage.unknown !== expected.experienceUnknown) {
      failures.push(
        `experienceUnknown expected ${expected.experienceUnknown} got ${summary.experience.coverage.unknown}`,
      );
    }
  }
  if (typeof expected.qualificationKnown === "number") {
    if (summary.qualifications.coverage.known !== expected.qualificationKnown) {
      failures.push(
        `qualificationKnown expected ${expected.qualificationKnown} got ${summary.qualifications.coverage.known}`,
      );
    }
  }

  if (expected.risingSkillIds) {
    for (const id of expected.risingSkillIds) {
      if (!summary.trends.risingSkills.some((s) => s.skillId === id)) {
        failures.push(`expected rising skill ${id}`);
      }
    }
  }
  if (expected.decliningSkillIds) {
    for (const id of expected.decliningSkillIds) {
      if (!summary.trends.decliningSkills.some((s) => s.skillId === id)) {
        failures.push(`expected declining skill ${id}`);
      }
    }
  }
  if (expected.stableSkillIds) {
    for (const id of expected.stableSkillIds) {
      if (!summary.trends.stableSkills.some((s) => s.skillId === id)) {
        const row = summary.skills.find((s) => s.skillId === id);
        if (row?.trend.direction !== DEMAND_TREND_DIRECTION.STABLE) {
          failures.push(`expected stable skill ${id}`);
        }
      }
    }
  }
  if (expected.insufficientTrend) {
    const insufficient = summary.skills.some(
      (s) => s.trend.direction === DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA,
    );
    if (!insufficient) {
      failures.push("expected INSUFFICIENT_DATA trend");
    }
  }

  if (expected.excludedContributesZero) {
    const excluded = testCase.current.filter((o) => o.eligibility === "EXCLUDE");
    for (const obs of excluded) {
      if (obs.qualityWeight !== 0 || obs.skills.some((s) => s.contribution !== 0)) {
        failures.push("EXCLUDE must contribute zero weighted demand");
      }
    }
  }

  return {
    id: testCase.id,
    pass: failures.length === 0,
    failures,
  };
}

export function evaluateDemandDataset(
  dataset: DemandEvaluationDataset,
): DemandEvaluationSummary {
  const outcomes = dataset.cases.map(evaluateDemandCase);
  const passed = outcomes.filter((o) => o.pass).length;
  return {
    classification: dataset.classification,
    caseCount: dataset.cases.length,
    passed,
    failed: outcomes.length - passed,
    outcomes,
    limitation:
      "Metrics describe this small SYNTHETIC EVALUATION DATA set only. They are not labour-market statistics.",
  };
}

/** Helpers for building evaluation observations. */
export function makeObs(input: {
  jobId: string;
  postedAt: string;
  eligibility: QualityEligibility;
  skills: Array<{
    skillId: string;
    canonicalName: string;
    requirementLevel: SkillRequirementLevel;
  }>;
  occupation?: DemandJobObservation["occupation"];
  sector?: DemandJobObservation["sector"];
  location?: DemandJobObservation["location"];
  experience?: DemandJobObservation["experience"];
  qualifications?: DemandJobObservation["qualifications"];
}): DemandJobObservation {
  const qWeight = qualityWeight(input.eligibility);
  const intelSkills: JobIntelligenceSkill[] = input.skills.map((s) => ({
    rawTerm: s.canonicalName,
    contributingTerms: [s.canonicalName],
    skillId: s.skillId,
    canonicalName: s.canonicalName,
    status: "RESOLVED",
    extractionMethod: "CANONICAL_NAME_MATCH",
    extractionMethods: ["CANONICAL_NAME_MATCH"],
    confidenceTier: "HIGH",
    requirementLevel: s.requirementLevel,
    requirementMethod: "LOCAL_SIGNAL",
    requirementConfidenceTier: "HIGH",
  }));
  return {
    jobId: input.jobId,
    postedAt: input.postedAt,
    sourceId: "src-eval",
    eligibility: input.eligibility,
    qualityWeight: qWeight,
    location: input.location ?? {
      locationId: null,
      country: null,
      state: null,
      district: null,
      city: null,
      known: false,
    },
    skills: dedupeJobSkills(intelSkills, input.eligibility),
    occupation: input.occupation ?? {
      status: "UNCLASSIFIED",
      occupationId: null,
      code: null,
      name: null,
    },
    sector: input.sector ?? {
      status: "UNCLASSIFIED",
      sectorId: null,
      code: null,
      name: null,
    },
    experience: input.experience ?? {
      status: "UNKNOWN",
      confidenceTier: "LOW",
    },
    qualifications: input.qualifications ?? [],
  };
}

export { skillContribution, requirementWeight, qualityWeight };
