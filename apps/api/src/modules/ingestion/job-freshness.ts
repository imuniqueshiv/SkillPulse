import type { JobIngestionRecord } from "./contract";
import type { JobDedupStatus } from "./job-deduplication";
import {
  JOB_VALIDATION_STATUS,
  type JobValidationResult,
} from "./job-validation";
import { AppError } from "../../utils/errors";

export const JOB_FRESHNESS_STATUS = {
  FRESH: "FRESH",
  AGING: "AGING",
  STALE: "STALE",
  UNKNOWN: "UNKNOWN",
} as const;

export type JobFreshnessStatus =
  (typeof JOB_FRESHNESS_STATUS)[keyof typeof JOB_FRESHNESS_STATUS];

export const JOB_FRESHNESS_REASON = {
  WITHIN_FRESH_WINDOW: "WITHIN_FRESH_WINDOW",
  AGE_AGING: "AGE_AGING",
  AGE_STALE: "AGE_STALE",
  EXPIRED: "EXPIRED",
  MISSING_EVENT_TIME: "MISSING_EVENT_TIME",
  POSTED_IN_FUTURE: "POSTED_IN_FUTURE",
  OBSERVED_IN_FUTURE: "OBSERVED_IN_FUTURE",
  LAST_SEEN_BEFORE_INGESTED: "LAST_SEEN_BEFORE_INGESTED",
} as const;

export type JobFreshnessReasonCode =
  (typeof JOB_FRESHNESS_REASON)[keyof typeof JOB_FRESHNESS_REASON];

export type JobFreshnessIssue = {
  code: JobFreshnessReasonCode;
  message: string;
};

/** Inclusive lower bounds. Age uses postedAt only — never observedAt. */
export type JobFreshnessPolicy = {
  agingAfterMs: number;
  staleAfterMs: number;
};

export const DEFAULT_JOB_FRESHNESS_POLICY: JobFreshnessPolicy = {
  agingAfterMs: 14 * 24 * 60 * 60 * 1000,
  staleAfterMs: 45 * 24 * 60 * 60 * 1000,
};

export type JobFreshnessInput = {
  validation: JobValidationResult;
  referenceTime: Date;
  policy?: JobFreshnessPolicy;
  /** Other sightings of the same logical job. Used only to derive lastSeenAt. */
  relatedObservations?: readonly JobIngestionRecord[];
  /** Explicit last-seen instant. If omitted, max(ingestedAt of candidate and related). */
  lastSeenAt?: Date;
  /** Recorded on the result only. Never drives FRESH vs STALE. */
  dedupStatus?: JobDedupStatus | null;
};

export type JobFreshnessResult = {
  status: JobFreshnessStatus;
  reasons: JobFreshnessIssue[];
  observedAt: Date;
  ingestedAt: Date;
  lastSeenAt: Date;
  postedAt: Date | null;
  expiresAt: Date | null;
  ageMs: number | null;
  referenceTime: Date;
  policy: JobFreshnessPolicy;
  dedupStatus: JobDedupStatus | null;
};

function copyInstant(value: Date): Date {
  return new Date(value.getTime());
}

function requireValidInstant(value: Date, label: string): Date {
  if (Number.isNaN(value.getTime())) {
    throw new AppError(400, `${label} must be a valid instant`);
  }
  return value;
}

function requireEligibleRecord(validation: JobValidationResult): JobIngestionRecord {
  if (validation.status === JOB_VALIDATION_STATUS.REJECTED || !validation.record) {
    throw new AppError(400, "Job observation is not eligible for freshness evaluation");
  }
  return validation.record;
}

function resolvePolicy(policy: JobFreshnessPolicy | undefined): JobFreshnessPolicy {
  const resolved = policy ?? DEFAULT_JOB_FRESHNESS_POLICY;
  if (
    !Number.isFinite(resolved.agingAfterMs) ||
    !Number.isFinite(resolved.staleAfterMs) ||
    resolved.agingAfterMs < 0 ||
    resolved.staleAfterMs < 0 ||
    resolved.agingAfterMs > resolved.staleAfterMs
  ) {
    throw new AppError(400, "Invalid freshness policy");
  }
  return {
    agingAfterMs: resolved.agingAfterMs,
    staleAfterMs: resolved.staleAfterMs,
  };
}

function deriveLastSeenAt(
  ingestedAt: Date,
  related: readonly JobIngestionRecord[],
  explicit?: Date,
): Date {
  if (explicit) {
    return copyInstant(requireValidInstant(explicit, "lastSeenAt"));
  }

  let latest = ingestedAt.getTime();
  for (const observation of related) {
    const time = observation.payload.ingestedAt.getTime();
    if (time > latest) {
      latest = time;
    }
  }
  return new Date(latest);
}

function classifyListing(
  postedAt: Date | null,
  expiresAt: Date | null,
  referenceMs: number,
  policy: JobFreshnessPolicy,
): { status: JobFreshnessStatus; reasons: JobFreshnessIssue[]; ageMs: number | null } {
  const reasons: JobFreshnessIssue[] = [];

  if (expiresAt && expiresAt.getTime() <= referenceMs) {
    reasons.push({
      code: JOB_FRESHNESS_REASON.EXPIRED,
      message: "expiresAt is at or before the reference time",
    });
    return { status: JOB_FRESHNESS_STATUS.STALE, reasons, ageMs: postedAt ? referenceMs - postedAt.getTime() : null };
  }

  if (postedAt) {
    const ageMs = referenceMs - postedAt.getTime();
    if (ageMs < 0) {
      reasons.push({
        code: JOB_FRESHNESS_REASON.POSTED_IN_FUTURE,
        message: "postedAt is after the reference time",
      });
      return { status: JOB_FRESHNESS_STATUS.UNKNOWN, reasons, ageMs };
    }
    if (ageMs >= policy.staleAfterMs) {
      reasons.push({
        code: JOB_FRESHNESS_REASON.AGE_STALE,
        message: "postedAt age is at or beyond the stale threshold",
      });
      return { status: JOB_FRESHNESS_STATUS.STALE, reasons, ageMs };
    }
    if (ageMs >= policy.agingAfterMs) {
      reasons.push({
        code: JOB_FRESHNESS_REASON.AGE_AGING,
        message: "postedAt age is at or beyond the aging threshold",
      });
      return { status: JOB_FRESHNESS_STATUS.AGING, reasons, ageMs };
    }
    reasons.push({
      code: JOB_FRESHNESS_REASON.WITHIN_FRESH_WINDOW,
      message: "postedAt age is below the aging threshold",
    });
    return { status: JOB_FRESHNESS_STATUS.FRESH, reasons, ageMs };
  }

  if (expiresAt && expiresAt.getTime() > referenceMs) {
    reasons.push({
      code: JOB_FRESHNESS_REASON.WITHIN_FRESH_WINDOW,
      message: "expiresAt is after the reference time and postedAt is absent",
    });
    return { status: JOB_FRESHNESS_STATUS.FRESH, reasons, ageMs: null };
  }

  reasons.push({
    code: JOB_FRESHNESS_REASON.MISSING_EVENT_TIME,
    message: "postedAt and expiresAt are absent; observedAt is not used as event time",
  });
  return { status: JOB_FRESHNESS_STATUS.UNKNOWN, reasons, ageMs: null };
}

/**
 * Phase 5.7 freshness classification.
 * Does not persist, mutate raw observations, or use Date.now().
 * Dedup status is echoed and never mapped to FRESH/STALE.
 */
export function evaluateJobFreshness(input: JobFreshnessInput): JobFreshnessResult {
  const record = requireEligibleRecord(input.validation);
  const policy = resolvePolicy(input.policy);
  const referenceTime = copyInstant(
    requireValidInstant(input.referenceTime, "referenceTime"),
  );
  const payload = record.payload;
  const observedAt = copyInstant(payload.observedAt);
  const ingestedAt = copyInstant(payload.ingestedAt);
  const postedAt = payload.postedAt ? copyInstant(payload.postedAt) : null;
  const expiresAt = payload.expiresAt ? copyInstant(payload.expiresAt) : null;
  const related = input.relatedObservations ?? [];
  const lastSeenAt = deriveLastSeenAt(ingestedAt, related, input.lastSeenAt);

  const listing = classifyListing(postedAt, expiresAt, referenceTime.getTime(), policy);
  const reasons = [...listing.reasons];
  let status = listing.status;

  if (observedAt.getTime() > referenceTime.getTime()) {
    reasons.push({
      code: JOB_FRESHNESS_REASON.OBSERVED_IN_FUTURE,
      message: "observedAt is after the reference time",
    });
    if (status !== JOB_FRESHNESS_STATUS.STALE) {
      status = JOB_FRESHNESS_STATUS.UNKNOWN;
    }
  }

  if (lastSeenAt.getTime() < ingestedAt.getTime()) {
    reasons.push({
      code: JOB_FRESHNESS_REASON.LAST_SEEN_BEFORE_INGESTED,
      message: "lastSeenAt is earlier than ingestedAt",
    });
  }

  return {
    status,
    reasons,
    observedAt,
    ingestedAt,
    lastSeenAt,
    postedAt,
    expiresAt,
    ageMs: listing.ageMs,
    referenceTime,
    policy,
    dedupStatus: input.dedupStatus ?? null,
  };
}
