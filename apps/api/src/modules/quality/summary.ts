import { DataSourceGeographicScope, Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  JOB_QUALITY_ASSESSMENT_VERSION,
  OVERALL_INTELLIGENCE_CONFIDENCE,
  SOURCE_TRUST_LEVEL,
  type JobQualityAssessmentResult,
  type OverallIntelligenceConfidence,
  type QualityEligibility,
  type SourceTrustLevel,
} from "./contract";

export type QualitySummaryInput = {
  assessmentVersion?: string;
  sourceId?: string;
  /** DataSource.geographicScope filter when practical. */
  geographicScope?: DataSourceGeographicScope | string;
};

export type QualitySummary = {
  assessmentVersion: string;
  total: number;
  eligibility: Record<QualityEligibility, number>;
  freshness: Record<"FRESH" | "AGING" | "STALE" | "UNKNOWN", number>;
  intelligence: Record<OverallIntelligenceConfidence, number>;
  sourceTrust: Record<SourceTrustLevel, number>;
  completeness: {
    averageScore: number | null;
    high: number;
    medium: number;
    low: number;
  };
  notes: string[];
};

function emptyEligibility(): Record<QualityEligibility, number> {
  return {
    INCLUDE: 0,
    INCLUDE_WITH_CAUTION: 0,
    EXCLUDE: 0,
  };
}

function emptyFreshness(): QualitySummary["freshness"] {
  return { FRESH: 0, AGING: 0, STALE: 0, UNKNOWN: 0 };
}

function emptyIntelligence(): Record<OverallIntelligenceConfidence, number> {
  return {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    UNKNOWN: 0,
  };
}

function emptySourceTrust(): Record<SourceTrustLevel, number> {
  return {
    VERIFIED: 0,
    TRUSTED: 0,
    STANDARD: 0,
    UNVERIFIED: 0,
  };
}

/**
 * Phase 7.11 summary over persisted PROCESSED assessments only.
 * One row per (jobId, assessmentVersion) — nested previousAssessment is not counted.
 * FAILED rows are excluded.
 */
export async function summarizeQualityAssessments(
  input: QualitySummaryInput = {},
): Promise<QualitySummary> {
  const assessmentVersion = input.assessmentVersion ?? JOB_QUALITY_ASSESSMENT_VERSION;
  if (!assessmentVersion.trim()) {
    throw new AppError(400, "assessmentVersion is required");
  }

  const prisma = getPrisma();
  const jobFilter: Prisma.JobWhereInput = {};
  if (input.sourceId) {
    jobFilter.sourceId = input.sourceId;
  }
  if (input.geographicScope) {
    const scope = input.geographicScope as DataSourceGeographicScope;
    if (!Object.values(DataSourceGeographicScope).includes(scope)) {
      throw new AppError(400, "geographicScope is invalid");
    }
    jobFilter.source = { geographicScope: scope };
  }

  const rows = await prisma.jobQualityAssessment.findMany({
    where: {
      assessmentVersion,
      status: "PROCESSED",
      ...(Object.keys(jobFilter).length > 0 ? { job: jobFilter } : {}),
    },
    select: {
      eligibility: true,
      result: true,
    },
  });

  const eligibility = emptyEligibility();
  const freshness = emptyFreshness();
  const intelligence = emptyIntelligence();
  const sourceTrust = emptySourceTrust();
  let scoreSum = 0;
  let scoreCount = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const row of rows) {
    eligibility[row.eligibility] += 1;
    const result = row.result as JobQualityAssessmentResult;

    const freshnessStatus = result.freshness?.status ?? "UNKNOWN";
    if (freshnessStatus in freshness) {
      freshness[freshnessStatus] += 1;
    } else {
      freshness.UNKNOWN += 1;
    }

    const intel =
      result.intelligenceConfidence?.overall ?? OVERALL_INTELLIGENCE_CONFIDENCE.UNKNOWN;
    if (intel in intelligence) {
      intelligence[intel] += 1;
    } else {
      intelligence.UNKNOWN += 1;
    }

    const trust = result.sourceTrust?.trustLevel ?? SOURCE_TRUST_LEVEL.UNVERIFIED;
    if (trust in sourceTrust) {
      sourceTrust[trust] += 1;
    } else {
      sourceTrust.UNVERIFIED += 1;
    }

    const score = result.completeness?.score;
    if (typeof score === "number" && Number.isFinite(score)) {
      scoreSum += score;
      scoreCount += 1;
      if (score >= 0.8) {
        high += 1;
      } else if (score >= 0.55) {
        medium += 1;
      } else {
        low += 1;
      }
    }
  }

  return {
    assessmentVersion,
    total: rows.length,
    eligibility,
    freshness,
    intelligence,
    sourceTrust,
    completeness: {
      averageScore:
        scoreCount === 0 ? null : Number((scoreSum / scoreCount).toFixed(4)),
      high,
      medium,
      low,
    },
    notes: [
      "Counts PROCESSED JobQualityAssessment rows only.",
      "FAILED assessments are excluded.",
      "Nested previousAssessment history is not double-counted.",
      "This is a quality summary only — not market demand analytics.",
    ],
  };
}
