import { buildJobQualityAssessment } from "./assessment";
import type {
  BuildQualityAssessmentInput,
} from "./assessment";
import {
  QUALITY_ELIGIBILITY,
  type JobQualityAssessmentResult,
  type QualityEligibility,
} from "./contract";

/**
 * EVALUATION DATA only. Not labour-market evidence.
 */
export const QUALITY_EVALUATION_DATA_CLASSIFICATION = "EVALUATION DATA";
export const QUALITY_EVALUATION_DATA_NOT_MARKET = "NOT LABOUR-MARKET EVIDENCE";

export type QualityEvaluationExpected = {
  eligibility: QualityEligibility;
  reasonCodes?: string[];
  freshnessStatus?: string;
  duplicationStatus?: string;
  sourceTrustLevel?: string;
  intelligenceOverall?: string;
  completenessScore?: number;
  completenessScoreTolerance?: number;
};

export type QualityEvaluationCase = {
  id: string;
  label: string;
  input: BuildQualityAssessmentInput;
  expected: QualityEvaluationExpected;
};

export type QualityEvaluationDataset = {
  classification: string;
  note: string;
  cases: QualityEvaluationCase[];
};

export type QualityEvaluationOutcome = {
  id: string;
  actual: JobQualityAssessmentResult;
  eligibilityMatch: boolean;
  reasonCodesMatch: boolean | null;
  freshnessMatch: boolean | null;
  duplicationMatch: boolean | null;
  sourceTrustMatch: boolean | null;
  intelligenceMatch: boolean | null;
  completenessMatch: boolean | null;
};

export type QualityEvaluationSummary = {
  classification: string;
  caseCount: number;
  eligibilityAccuracy: { correct: number; total: number; accuracy: number | null };
  reasonCodeAccuracy: { correct: number; total: number; accuracy: number | null };
  freshnessAccuracy: { correct: number; total: number; accuracy: number | null };
  duplicationAccuracy: { correct: number; total: number; accuracy: number | null };
  sourceTrustAccuracy: { correct: number; total: number; accuracy: number | null };
  intelligenceAccuracy: { correct: number; total: number; accuracy: number | null };
  completenessAccuracy: { correct: number; total: number; accuracy: number | null };
  outcomes: QualityEvaluationOutcome[];
  limitation: string;
};

function ratio(correct: number, total: number): number | null {
  return total === 0 ? null : correct / total;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function isQualityEvaluationDataset(
  value: unknown,
): value is QualityEvaluationDataset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as QualityEvaluationDataset;
  return (
    record.classification === QUALITY_EVALUATION_DATA_CLASSIFICATION &&
    typeof record.note === "string" &&
    record.note.includes(QUALITY_EVALUATION_DATA_NOT_MARKET) &&
    Array.isArray(record.cases)
  );
}

export function compareQualityCase(
  evaluationCase: QualityEvaluationCase,
  actual: JobQualityAssessmentResult,
): QualityEvaluationOutcome {
  const expected = evaluationCase.expected;
  const eligibilityMatch = actual.eligibility === expected.eligibility;

  let reasonCodesMatch: boolean | null = null;
  if (expected.reasonCodes) {
    const actualCodes = sorted(actual.reasons.map((row) => row.code));
    const expectedCodes = sorted(expected.reasonCodes);
    reasonCodesMatch =
      actualCodes.length === expectedCodes.length &&
      actualCodes.every((code, index) => code === expectedCodes[index]);
  } else if (expected.eligibility === QUALITY_ELIGIBILITY.INCLUDE) {
    reasonCodesMatch = actual.reasons.length === 0;
  }

  return {
    id: evaluationCase.id,
    actual,
    eligibilityMatch,
    reasonCodesMatch,
    freshnessMatch:
      expected.freshnessStatus == null
        ? null
        : actual.freshness.status === expected.freshnessStatus,
    duplicationMatch:
      expected.duplicationStatus == null
        ? null
        : actual.duplication.status === expected.duplicationStatus,
    sourceTrustMatch:
      expected.sourceTrustLevel == null
        ? null
        : actual.sourceTrust.trustLevel === expected.sourceTrustLevel,
    intelligenceMatch:
      expected.intelligenceOverall == null
        ? null
        : actual.intelligenceConfidence.overall === expected.intelligenceOverall,
    completenessMatch:
      expected.completenessScore == null
        ? null
        : Math.abs(
            actual.completeness.score -
              expected.completenessScore,
          ) <= (expected.completenessScoreTolerance ?? 0.0001),
  };
}

export function summarizeQualityEvaluation(
  dataset: QualityEvaluationDataset,
  outcomes: readonly QualityEvaluationOutcome[],
): QualityEvaluationSummary {
  const buckets = {
    eligibility: { correct: 0, total: 0 },
    reason: { correct: 0, total: 0 },
    freshness: { correct: 0, total: 0 },
    duplication: { correct: 0, total: 0 },
    sourceTrust: { correct: 0, total: 0 },
    intelligence: { correct: 0, total: 0 },
    completeness: { correct: 0, total: 0 },
  };

  for (const outcome of outcomes) {
    buckets.eligibility.total += 1;
    if (outcome.eligibilityMatch) {
      buckets.eligibility.correct += 1;
    }
    if (outcome.reasonCodesMatch != null) {
      buckets.reason.total += 1;
      if (outcome.reasonCodesMatch) {
        buckets.reason.correct += 1;
      }
    }
    if (outcome.freshnessMatch != null) {
      buckets.freshness.total += 1;
      if (outcome.freshnessMatch) {
        buckets.freshness.correct += 1;
      }
    }
    if (outcome.duplicationMatch != null) {
      buckets.duplication.total += 1;
      if (outcome.duplicationMatch) {
        buckets.duplication.correct += 1;
      }
    }
    if (outcome.sourceTrustMatch != null) {
      buckets.sourceTrust.total += 1;
      if (outcome.sourceTrustMatch) {
        buckets.sourceTrust.correct += 1;
      }
    }
    if (outcome.intelligenceMatch != null) {
      buckets.intelligence.total += 1;
      if (outcome.intelligenceMatch) {
        buckets.intelligence.correct += 1;
      }
    }
    if (outcome.completenessMatch != null) {
      buckets.completeness.total += 1;
      if (outcome.completenessMatch) {
        buckets.completeness.correct += 1;
      }
    }
  }

  return {
    classification: dataset.classification,
    caseCount: outcomes.length,
    eligibilityAccuracy: {
      ...buckets.eligibility,
      accuracy: ratio(buckets.eligibility.correct, buckets.eligibility.total),
    },
    reasonCodeAccuracy: {
      ...buckets.reason,
      accuracy: ratio(buckets.reason.correct, buckets.reason.total),
    },
    freshnessAccuracy: {
      ...buckets.freshness,
      accuracy: ratio(buckets.freshness.correct, buckets.freshness.total),
    },
    duplicationAccuracy: {
      ...buckets.duplication,
      accuracy: ratio(buckets.duplication.correct, buckets.duplication.total),
    },
    sourceTrustAccuracy: {
      ...buckets.sourceTrust,
      accuracy: ratio(buckets.sourceTrust.correct, buckets.sourceTrust.total),
    },
    intelligenceAccuracy: {
      ...buckets.intelligence,
      accuracy: ratio(buckets.intelligence.correct, buckets.intelligence.total),
    },
    completenessAccuracy: {
      ...buckets.completeness,
      accuracy: ratio(buckets.completeness.correct, buckets.completeness.total),
    },
    outcomes: [...outcomes],
    limitation:
      "Metrics describe this small EVALUATION DATA set only. They are not labour-market statistics.",
  };
}

export function runQualityEvaluationDataset(
  dataset: QualityEvaluationDataset,
): QualityEvaluationSummary {
  const outcomes = dataset.cases.map((evaluationCase) => {
    const actual = buildJobQualityAssessment(evaluationCase.input);
    return compareQualityCase(evaluationCase, actual);
  });
  return summarizeQualityEvaluation(dataset, outcomes);
}
