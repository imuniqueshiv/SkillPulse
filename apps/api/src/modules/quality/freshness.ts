import {
  DEFAULT_JOB_FRESHNESS_POLICY,
  evaluateJobFreshness,
  type JobFreshnessPolicy,
} from "../ingestion/job-freshness";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
  type JobIngestionRecord,
} from "../ingestion/contract";
import { JOB_VALIDATION_STATUS } from "../ingestion/job-validation";
import {
  QUALITY_CHECK_STATUS,
  QUALITY_SEVERITY,
  QUALITY_SIGNAL_AVAILABILITY,
  type FreshnessAssessment,
  type QualityJobInput,
  type QualityProvenanceInput,
  type QualityRuleCheck,
} from "./contract";

/**
 * Consume Phase 5 freshness.
 *
 * Prefer recomputing with evaluateJobFreshness + DEFAULT_JOB_FRESHNESS_POLICY
 * when referenceTime and Job postedAt/expiresAt (and provenance observedAt)
 * are available. Falls back to Evidence.metadata.freshnessStatus. Otherwise UNKNOWN.
 *
 * Does not invent a second policy. Does not use Date.now().
 */
export function assessFreshness(input: {
  job: QualityJobInput;
  provenance: QualityProvenanceInput | null;
  referenceTime: Date;
  policy?: JobFreshnessPolicy;
}): { assessment: FreshnessAssessment; checks: QualityRuleCheck[] } {
  const referenceIso = input.referenceTime.toISOString();
  const postedAt = input.job.postedAt;
  const expiresAt = input.job.expiresAt;
  const observedAt = input.provenance?.observedAt ?? null;
  const ingestedAtIso = input.provenance?.ingestedAt ?? null;

  if (observedAt && (postedAt || expiresAt || true)) {
    const ingestedAt = ingestedAtIso
      ? new Date(ingestedAtIso)
      : new Date(observedAt.getTime());
    const record: JobIngestionRecord = {
      kind: INGESTION_RECORD_KIND.JOB,
      contractVersion: INGESTION_CONTRACT_VERSION,
      adapterName: "quality-freshness-adapter",
      adapterVersion: "0.0.0",
      payload: {
        sourceId: input.job.sourceId ?? undefined,
        title: input.job.title,
        observedAt,
        ingestedAt: Number.isNaN(ingestedAt.getTime()) ? observedAt : ingestedAt,
        postedAt: postedAt ?? undefined,
        expiresAt: expiresAt ?? undefined,
      },
    };

    try {
      const freshness = evaluateJobFreshness({
        validation: {
          status: JOB_VALIDATION_STATUS.VALID,
          reasons: [],
          record,
        },
        referenceTime: input.referenceTime,
        policy: input.policy ?? DEFAULT_JOB_FRESHNESS_POLICY,
      });

      const assessment: FreshnessAssessment = {
        status: freshness.status,
        availability: QUALITY_SIGNAL_AVAILABILITY.RECOMPUTED,
        method: "PHASE5_EVALUATE",
        reason: freshness.reasons.map((row) => row.code).join(", ") || freshness.status,
        postedAt: postedAt ? postedAt.toISOString() : null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        observedAt: observedAt.toISOString(),
        referenceTime: referenceIso,
      };
      return { assessment, checks: freshnessChecks(assessment) };
    } catch {
      // fall through to metadata / unknown
    }
  }

  const meta = input.provenance?.freshnessStatus;
  if (meta) {
    const assessment: FreshnessAssessment = {
      status: meta,
      availability: QUALITY_SIGNAL_AVAILABILITY.AVAILABLE,
      method: "EVIDENCE_METADATA",
      reason: "Consumed Evidence.metadata.freshnessStatus from Phase 5.8",
      postedAt: postedAt ? postedAt.toISOString() : null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      observedAt: observedAt ? observedAt.toISOString() : null,
      referenceTime: referenceIso,
    };
    return { assessment, checks: freshnessChecks(assessment) };
  }

  const assessment: FreshnessAssessment = {
    status: "UNKNOWN",
    availability: QUALITY_SIGNAL_AVAILABILITY.UNKNOWN,
    method: "UNAVAILABLE",
    reason:
      "Phase 5 freshness is not safely recoverable: missing provenance observedAt and no Evidence.metadata.freshnessStatus",
    postedAt: postedAt ? postedAt.toISOString() : null,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    observedAt: null,
    referenceTime: referenceIso,
  };
  return { assessment, checks: freshnessChecks(assessment) };
}

function freshnessChecks(assessment: FreshnessAssessment): QualityRuleCheck[] {
  if (assessment.status === "STALE") {
    return [
      {
        rule: "FRESHNESS",
        status: QUALITY_CHECK_STATUS.FAIL,
        severity: QUALITY_SEVERITY.ERROR,
        message: "STALE for current time-sensitive analytics (historical record retained)",
      },
    ];
  }
  if (assessment.status === "AGING" || assessment.status === "UNKNOWN") {
    return [
      {
        rule: "FRESHNESS",
        status: QUALITY_CHECK_STATUS.WARN,
        severity: QUALITY_SEVERITY.WARNING,
        message: `Freshness is ${assessment.status}`,
      },
    ];
  }
  return [
    {
      rule: "FRESHNESS",
      status: QUALITY_CHECK_STATUS.PASS,
      severity: QUALITY_SEVERITY.INFO,
      message: "Freshness is FRESH",
    },
  ];
}
