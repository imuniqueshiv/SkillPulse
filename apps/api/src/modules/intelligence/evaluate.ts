import {
  SKILL_INTELLIGENCE_STATUS,
  type JobIntelligenceResult,
  type SkillRequirementLevel,
} from "./contract";
import { processJobIntelligence } from "./pipeline";

/**
 * EVALUATION DATA only. Not labour-market evidence.
 */
export const EVALUATION_DATA_CLASSIFICATION = "EVALUATION DATA";
export const EVALUATION_DATA_NOT_MARKET =
  "NOT LABOUR-MARKET EVIDENCE";

export type EvaluationExperienceExpected = {
  status: "PARSED" | "UNPARSED" | "UNKNOWN";
  minYears?: number;
  maxYears?: number | null;
  freshersAccepted?: boolean;
};

export type EvaluationJobExpected = {
  skills?: string[];
  unresolved?: string[];
  occupationCode?: string;
  occupationStatus?: "CLASSIFIED" | "UNCLASSIFIED";
  sectorCode?: string;
  sectorStatus?: "CLASSIFIED" | "UNCLASSIFIED";
  experience?: EvaluationExperienceExpected;
  qualifications?: string[];
  qualificationStatus?: "PARSED" | "UNPARSED" | "UNKNOWN";
  requirements?: Record<string, SkillRequirementLevel>;
};

export type EvaluationJob = {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  explicitSkills?: string[];
  experienceText?: string | null;
  qualificationText?: string | null;
  expected: EvaluationJobExpected;
};

export type EvaluationDataset = {
  classification: string;
  note: string;
  jobs: EvaluationJob[];
};

export type BinaryCounts = {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
};

export type AccuracyCounts = {
  correct: number;
  total: number;
};

export type EvaluationJobOutcome = {
  id: string;
  intelligence: JobIntelligenceResult;
  skill: { expected: string[]; actual: string[] };
  unresolved: { expected: string[]; actual: string[] };
  occupation: { expected?: string; actual: string | null; match: boolean | null };
  sector: { expected?: string; actual: string | null; match: boolean | null };
  experience: { match: boolean | null };
  qualification: { match: boolean | null };
  requirement: { expected: number; correct: number };
};

export type EvaluationSummary = {
  classification: string;
  jobCount: number;
  skill: BinaryCounts & { precision: number | null; recall: number | null };
  unresolved: BinaryCounts & { precision: number | null; recall: number | null };
  occupationAccuracy: AccuracyCounts & { accuracy: number | null };
  sectorAccuracy: AccuracyCounts & { accuracy: number | null };
  experienceAccuracy: AccuracyCounts & { accuracy: number | null };
  qualificationAccuracy: AccuracyCounts & { accuracy: number | null };
  requirementAccuracy: AccuracyCounts & { accuracy: number | null };
  outcomes: EvaluationJobOutcome[];
  limitation: string;
};

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

function accuracyOf(counts: AccuracyCounts): number | null {
  return ratio(counts.correct, counts.total);
}

function precisionRecall(counts: BinaryCounts) {
  return {
    ...counts,
    precision: ratio(counts.truePositive, counts.truePositive + counts.falsePositive),
    recall: ratio(counts.truePositive, counts.truePositive + counts.falseNegative),
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function scoreSets(expected: readonly string[], actual: readonly string[]): BinaryCounts {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  for (const value of actualSet) {
    if (expectedSet.has(value)) {
      truePositive += 1;
    } else {
      falsePositive += 1;
    }
  }
  for (const value of expectedSet) {
    if (!actualSet.has(value)) {
      falseNegative += 1;
    }
  }
  return { truePositive, falsePositive, falseNegative };
}

function resolvedCanonicalNames(result: JobIntelligenceResult): string[] {
  return uniqueSorted(
    result.skills
      .filter((row) => row.status === SKILL_INTELLIGENCE_STATUS.RESOLVED && row.canonicalName)
      .map((row) => row.canonicalName as string),
  );
}

function unresolvedRawTerms(result: JobIntelligenceResult): string[] {
  return uniqueSorted(
    result.skills
      .filter((row) => row.status === SKILL_INTELLIGENCE_STATUS.UNRESOLVED)
      .map((row) => row.rawTerm),
  );
}

function skillLookupKey(skill: JobIntelligenceResult["skills"][number]): string {
  return skill.canonicalName ?? skill.rawTerm;
}

function occupationActual(result: JobIntelligenceResult): string | null {
  if (result.occupation.status === "CLASSIFIED" && result.occupation.code) {
    return result.occupation.code;
  }
  return result.occupation.status;
}

function sectorActual(result: JobIntelligenceResult): string | null {
  if (result.sector.status === "CLASSIFIED" && result.sector.code) {
    return result.sector.code;
  }
  return result.sector.status;
}

function occupationMatch(
  expected: EvaluationJobExpected,
  result: JobIntelligenceResult,
): boolean | null {
  if (expected.occupationCode == null && expected.occupationStatus == null) {
    return null;
  }
  let ok = true;
  if (expected.occupationStatus != null) {
    ok = ok && result.occupation.status === expected.occupationStatus;
  }
  if (expected.occupationCode != null) {
    ok = ok && result.occupation.code === expected.occupationCode;
  }
  return ok;
}

function sectorMatch(
  expected: EvaluationJobExpected,
  result: JobIntelligenceResult,
): boolean | null {
  if (expected.sectorCode == null && expected.sectorStatus == null) {
    return null;
  }
  let ok = true;
  if (expected.sectorStatus != null) {
    ok = ok && result.sector.status === expected.sectorStatus;
  }
  if (expected.sectorCode != null) {
    ok = ok && result.sector.code === expected.sectorCode;
  }
  return ok;
}

function experienceMatch(
  expected: EvaluationExperienceExpected | undefined,
  result: JobIntelligenceResult,
): boolean | null {
  if (!expected) {
    return null;
  }
  if (result.experience.status !== expected.status) {
    return false;
  }
  if (expected.minYears != null && result.experience.minYears !== expected.minYears) {
    return false;
  }
  if (expected.maxYears !== undefined && result.experience.maxYears !== expected.maxYears) {
    return false;
  }
  if (
    expected.freshersAccepted != null &&
    result.experience.freshersAccepted !== expected.freshersAccepted
  ) {
    return false;
  }
  return true;
}

function qualificationMatch(
  expected: EvaluationJobExpected,
  result: JobIntelligenceResult,
): boolean | null {
  if (expected.qualifications == null && expected.qualificationStatus == null) {
    return null;
  }
  if (expected.qualificationStatus != null) {
    const statuses = result.qualifications.map((row) => row.status);
    if (expected.qualifications == null) {
      return statuses.every((status) => status === expected.qualificationStatus);
    }
  }
  if (expected.qualifications != null) {
    const actual = uniqueSorted(
      result.qualifications
        .filter((row) => row.normalized)
        .map((row) => row.normalized as string),
    );
    const scored = scoreSets(uniqueSorted(expected.qualifications), actual);
    return scored.falsePositive === 0 && scored.falseNegative === 0;
  }
  return true;
}

function requirementScore(
  expected: Record<string, SkillRequirementLevel> | undefined,
  result: JobIntelligenceResult,
): { expected: number; correct: number } {
  if (!expected) {
    return { expected: 0, correct: 0 };
  }
  const byKey = new Map(result.skills.map((skill) => [skillLookupKey(skill), skill]));
  let correct = 0;
  const keys = Object.keys(expected);
  for (const key of keys) {
    const skill = byKey.get(key);
    if (skill && skill.requirementLevel === expected[key]) {
      correct += 1;
    }
  }
  return { expected: keys.length, correct };
}

export function isEvaluationDataset(value: unknown): value is EvaluationDataset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as EvaluationDataset;
  return (
    record.classification === EVALUATION_DATA_CLASSIFICATION &&
    typeof record.note === "string" &&
    record.note.includes(EVALUATION_DATA_NOT_MARKET) &&
    Array.isArray(record.jobs)
  );
}

export function emptySummary(classification: string, jobCount: number): EvaluationSummary {
  const zero: BinaryCounts = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  const acc: AccuracyCounts = { correct: 0, total: 0 };
  return {
    classification,
    jobCount,
    skill: precisionRecall(zero),
    unresolved: precisionRecall(zero),
    occupationAccuracy: { ...acc, accuracy: null },
    sectorAccuracy: { ...acc, accuracy: null },
    experienceAccuracy: { ...acc, accuracy: null },
    qualificationAccuracy: { ...acc, accuracy: null },
    requirementAccuracy: { ...acc, accuracy: null },
    outcomes: [],
    limitation:
      "Metrics are descriptive of this small EVALUATION DATA set only. They are not labour-market statistics and are not a production quality bar.",
  };
}

/**
 * Compare one annotated evaluation job to a derived intelligence result.
 * Does not mutate `expected`.
 */
export function compareEvaluationJob(
  job: EvaluationJob,
  intelligence: JobIntelligenceResult,
): EvaluationJobOutcome {
  const expectedSkills = uniqueSorted(job.expected.skills ?? []);
  const actualSkills = resolvedCanonicalNames(intelligence);
  const expectedUnresolved = uniqueSorted(job.expected.unresolved ?? []);
  const actualUnresolved = unresolvedRawTerms(intelligence);
  const occupation = occupationMatch(job.expected, intelligence);
  const sector = sectorMatch(job.expected, intelligence);

  return {
    id: job.id,
    intelligence,
    skill: { expected: expectedSkills, actual: actualSkills },
    unresolved: { expected: expectedUnresolved, actual: actualUnresolved },
    occupation: {
      expected: job.expected.occupationCode ?? job.expected.occupationStatus,
      actual: occupationActual(intelligence),
      match: occupation,
    },
    sector: {
      expected: job.expected.sectorCode ?? job.expected.sectorStatus,
      actual: sectorActual(intelligence),
      match: sector,
    },
    experience: { match: experienceMatch(job.expected.experience, intelligence) },
    qualification: { match: qualificationMatch(job.expected, intelligence) },
    requirement: requirementScore(job.expected.requirements, intelligence),
  };
}

export function summarizeEvaluation(
  classification: string,
  outcomes: readonly EvaluationJobOutcome[],
  annotated: readonly EvaluationJob[],
): EvaluationSummary {
  const skillCounts: BinaryCounts = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  const unresolvedCounts: BinaryCounts = { truePositive: 0, falsePositive: 0, falseNegative: 0 };
  const occupation: AccuracyCounts = { correct: 0, total: 0 };
  const sector: AccuracyCounts = { correct: 0, total: 0 };
  const experience: AccuracyCounts = { correct: 0, total: 0 };
  const qualification: AccuracyCounts = { correct: 0, total: 0 };
  const requirement: AccuracyCounts = { correct: 0, total: 0 };

  for (let i = 0; i < outcomes.length; i += 1) {
    const outcome = outcomes[i];
    const job = annotated[i];
    if (!outcome || !job) {
      continue;
    }
    if (job.expected.skills) {
      const scored = scoreSets(outcome.skill.expected, outcome.skill.actual);
      skillCounts.truePositive += scored.truePositive;
      skillCounts.falsePositive += scored.falsePositive;
      skillCounts.falseNegative += scored.falseNegative;
    }
    if (job.expected.unresolved) {
      const scored = scoreSets(outcome.unresolved.expected, outcome.unresolved.actual);
      unresolvedCounts.truePositive += scored.truePositive;
      unresolvedCounts.falsePositive += scored.falsePositive;
      unresolvedCounts.falseNegative += scored.falseNegative;
    }
    if (outcome.occupation.match != null) {
      occupation.total += 1;
      if (outcome.occupation.match) {
        occupation.correct += 1;
      }
    }
    if (outcome.sector.match != null) {
      sector.total += 1;
      if (outcome.sector.match) {
        sector.correct += 1;
      }
    }
    if (outcome.experience.match != null) {
      experience.total += 1;
      if (outcome.experience.match) {
        experience.correct += 1;
      }
    }
    if (outcome.qualification.match != null) {
      qualification.total += 1;
      if (outcome.qualification.match) {
        qualification.correct += 1;
      }
    }
    if (outcome.requirement.expected > 0) {
      requirement.total += outcome.requirement.expected;
      requirement.correct += outcome.requirement.correct;
    }
  }

  const summary = emptySummary(classification, outcomes.length);
  return {
    ...summary,
    skill: precisionRecall(skillCounts),
    unresolved: precisionRecall(unresolvedCounts),
    occupationAccuracy: { ...occupation, accuracy: accuracyOf(occupation) },
    sectorAccuracy: { ...sector, accuracy: accuracyOf(sector) },
    experienceAccuracy: { ...experience, accuracy: accuracyOf(experience) },
    qualificationAccuracy: { ...qualification, accuracy: accuracyOf(qualification) },
    requirementAccuracy: { ...requirement, accuracy: accuracyOf(requirement) },
    outcomes: [...outcomes],
  };
}

/**
 * Run Phase 6 intelligence against EVALUATION DATA. persist=false.
 */
export async function runEvaluationDataset(
  dataset: EvaluationDataset,
): Promise<EvaluationSummary> {
  const outcomes: EvaluationJobOutcome[] = [];
  for (const job of dataset.jobs) {
    const { intelligence } = await processJobIntelligence({
      job: {
        id: `eval:${job.id}`,
        title: job.title,
        description: job.description ?? null,
      },
      explicitSkills: job.explicitSkills,
      experienceText: job.experienceText,
      qualificationText: job.qualificationText,
      persist: false,
    });
    outcomes.push(compareEvaluationJob(job, intelligence));
  }
  return summarizeEvaluation(dataset.classification, outcomes, dataset.jobs);
}
