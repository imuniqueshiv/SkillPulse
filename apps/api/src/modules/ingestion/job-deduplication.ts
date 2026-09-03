import { createHash } from "node:crypto";
import type { JobIngestionRecord, JobObservation } from "./contract";
import {
  JOB_VALIDATION_STATUS,
  type JobValidationResult,
} from "./job-validation";
import { AppError } from "../../utils/errors";

export const JOB_DEDUP_STATUS = {
  UNIQUE: "UNIQUE",
  DUPLICATE: "DUPLICATE",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
} as const;

export type JobDedupStatus =
  (typeof JOB_DEDUP_STATUS)[keyof typeof JOB_DEDUP_STATUS];

export const JOB_DEDUP_STRATEGY = {
  SOURCE_EXTERNAL_ID: "SOURCE_EXTERNAL_ID",
  CONTENT_FINGERPRINT: "CONTENT_FINGERPRINT",
  INSUFFICIENT_IDENTITY: "INSUFFICIENT_IDENTITY",
  NONE: "NONE",
} as const;

export type JobDedupStrategy =
  (typeof JOB_DEDUP_STRATEGY)[keyof typeof JOB_DEDUP_STRATEGY];

export const JOB_DEDUP_REASON = {
  SOURCE_EXTERNAL_ID_MATCH: "SOURCE_EXTERNAL_ID_MATCH",
  CROSS_SOURCE_EXTERNAL_ID: "CROSS_SOURCE_EXTERNAL_ID",
  DIFFERENT_EXTERNAL_ID: "DIFFERENT_EXTERNAL_ID",
  FINGERPRINT_MATCH: "FINGERPRINT_MATCH",
  TITLE_EMPLOYER_LOCATION_CONFLICT: "TITLE_EMPLOYER_LOCATION_CONFLICT",
  TITLE_EMPLOYER_MISMATCH: "TITLE_EMPLOYER_MISMATCH",
  INSUFFICIENT_IDENTITY: "INSUFFICIENT_IDENTITY",
  NO_MATCH: "NO_MATCH",
} as const;

export type JobDedupReasonCode =
  (typeof JOB_DEDUP_REASON)[keyof typeof JOB_DEDUP_REASON];

/**
 * One observation for classification. `observationId` is caller-supplied
 * (typically RawIngestionRecord.id). This module does not allocate IDs.
 */
export type JobDedupObservation = {
  observationId: string;
  validation: JobValidationResult;
  contentChecksum?: string;
};

export type JobContentFingerprint = {
  version: "1";
  digest: string;
  complete: boolean;
  title: string;
  employer: string | null;
  location: string | null;
  sourceScope: string;
};

export type JobDeduplicationResult = {
  status: JobDedupStatus;
  strategy: JobDedupStrategy;
  reason: JobDedupReasonCode;
  matchedObservationId: string | null;
  fingerprint: string | null;
  sameContentChecksumObservationIds: string[];
};

const FINGERPRINT_VERSION = "1" as const;
const UNIT = "\u001f";

function compareId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function recordOf(observation: JobDedupObservation): JobIngestionRecord | null {
  if (
    observation.validation.status === JOB_VALIDATION_STATUS.REJECTED ||
    !observation.validation.record
  ) {
    return null;
  }
  return observation.validation.record;
}

function requireRecord(observation: JobDedupObservation): JobIngestionRecord {
  const record = recordOf(observation);
  if (!record) {
    throw new AppError(400, "Job observation is not eligible for deduplication");
  }
  return record;
}

/** NFKC, trim, collapse whitespace, lowercase. Empty after normalize → null. Punctuation is kept. */
export function normalizeDedupText(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "" ? null : normalized;
}

export function sourceScope(payload: JobObservation): string {
  if (payload.sourceId) {
    return `id:${payload.sourceId}`;
  }
  return `code:${payload.sourceCode ?? ""}`;
}

function locationKey(payload: JobObservation): string | null {
  const location = payload.location;
  if (!location) {
    return null;
  }

  const parts = [
    normalizeDedupText(location.country),
    normalizeDedupText(location.state),
    normalizeDedupText(location.district),
    normalizeDedupText(location.city),
    normalizeDedupText(location.raw),
  ].filter((part): part is string => part !== null);

  return parts.length === 0 ? null : parts.join("|");
}

export function computeJobContentFingerprint(
  record: JobIngestionRecord,
): JobContentFingerprint {
  const title = normalizeDedupText(record.payload.title) ?? "";
  const employer = normalizeDedupText(record.payload.employerName);
  const location = locationKey(record.payload);
  const scope = sourceScope(record.payload);
  const material = [
    FINGERPRINT_VERSION,
    scope,
    title,
    employer ?? "",
    location ?? "",
  ].join(UNIT);

  return {
    version: FINGERPRINT_VERSION,
    digest: createHash("sha256").update(material, "utf8").digest("hex"),
    complete: title !== "" && employer !== null && location !== null,
    title,
    employer,
    location,
    sourceScope: scope,
  };
}

function result(partial: JobDeduplicationResult): JobDeduplicationResult {
  return {
    ...partial,
    sameContentChecksumObservationIds: [
      ...partial.sameContentChecksumObservationIds,
    ].sort(compareId),
  };
}

function checksumPeers(
  candidate: JobDedupObservation,
  priors: JobDedupObservation[],
): string[] {
  const checksum = candidate.contentChecksum;
  if (!checksum) {
    return [];
  }
  return priors
    .filter((prior) => prior.contentChecksum === checksum)
    .map((prior) => prior.observationId)
    .sort(compareId);
}

/**
 * Classify a validated observation against prior observations.
 * Does not persist, delete, merge, or mutate raw records.
 * Does not call validateJobIngestion.
 */
export function deduplicateJobObservation(
  candidate: JobDedupObservation,
  priors: readonly JobDedupObservation[],
): JobDeduplicationResult {
  const candidateRecord = requireRecord(candidate);
  const candidateFingerprint = computeJobContentFingerprint(candidateRecord);
  const candidateExternalId = candidateRecord.payload.externalId;
  const candidateScope = candidateFingerprint.sourceScope;

  const eligiblePriors = priors
    .filter((prior) => prior.observationId !== candidate.observationId)
    .filter((prior) => recordOf(prior) !== null)
    .slice()
    .sort((a, b) => compareId(a.observationId, b.observationId));

  const sameContentChecksumObservationIds = checksumPeers(
    candidate,
    eligiblePriors,
  );

  if (candidateExternalId) {
    const level1 = eligiblePriors.filter((prior) => {
      const payload = recordOf(prior)!.payload;
      return (
        sourceScope(payload) === candidateScope &&
        payload.externalId === candidateExternalId
      );
    });

    if (level1[0]) {
      return result({
        status: JOB_DEDUP_STATUS.DUPLICATE,
        strategy: JOB_DEDUP_STRATEGY.SOURCE_EXTERNAL_ID,
        reason: JOB_DEDUP_REASON.SOURCE_EXTERNAL_ID_MATCH,
        matchedObservationId: level1[0].observationId,
        fingerprint: candidateFingerprint.digest,
        sameContentChecksumObservationIds,
      });
    }

    const crossSource = eligiblePriors.some((prior) => {
      const payload = recordOf(prior)!.payload;
      return (
        payload.externalId === candidateExternalId &&
        sourceScope(payload) !== candidateScope
      );
    });
    const sameSourceDifferentId = eligiblePriors.some((prior) => {
      const payload = recordOf(prior)!.payload;
      return (
        sourceScope(payload) === candidateScope &&
        payload.externalId !== undefined &&
        payload.externalId !== candidateExternalId
      );
    });

    return result({
      status: JOB_DEDUP_STATUS.UNIQUE,
      strategy: JOB_DEDUP_STRATEGY.NONE,
      reason: crossSource
        ? JOB_DEDUP_REASON.CROSS_SOURCE_EXTERNAL_ID
        : sameSourceDifferentId
          ? JOB_DEDUP_REASON.DIFFERENT_EXTERNAL_ID
          : JOB_DEDUP_REASON.NO_MATCH,
      matchedObservationId: null,
      fingerprint: candidateFingerprint.digest,
      sameContentChecksumObservationIds,
    });
  }

  const sameSourcePriors = eligiblePriors.filter((prior) => {
    return sourceScope(recordOf(prior)!.payload) === candidateScope;
  });

  const strongMatches = sameSourcePriors.filter((prior) => {
    const payload = recordOf(prior)!.payload;
    if (payload.externalId) {
      return false;
    }
    const priorFingerprint = computeJobContentFingerprint(recordOf(prior)!);
    return (
      candidateFingerprint.complete &&
      priorFingerprint.complete &&
      priorFingerprint.digest === candidateFingerprint.digest
    );
  });

  if (strongMatches[0]) {
    return result({
      status: JOB_DEDUP_STATUS.DUPLICATE,
      strategy: JOB_DEDUP_STRATEGY.CONTENT_FINGERPRINT,
      reason: JOB_DEDUP_REASON.FINGERPRINT_MATCH,
      matchedObservationId: strongMatches[0].observationId,
      fingerprint: candidateFingerprint.digest,
      sameContentChecksumObservationIds,
    });
  }

  const titleEmployerLocationConflict = sameSourcePriors.find((prior) => {
    const priorFingerprint = computeJobContentFingerprint(recordOf(prior)!);
    return (
      priorFingerprint.title === candidateFingerprint.title &&
      candidateFingerprint.employer !== null &&
      priorFingerprint.employer !== null &&
      priorFingerprint.employer === candidateFingerprint.employer &&
      candidateFingerprint.location !== null &&
      priorFingerprint.location !== null &&
      priorFingerprint.location !== candidateFingerprint.location
    );
  });

  if (titleEmployerLocationConflict) {
    return result({
      status: JOB_DEDUP_STATUS.POSSIBLE_DUPLICATE,
      strategy: JOB_DEDUP_STRATEGY.CONTENT_FINGERPRINT,
      reason: JOB_DEDUP_REASON.TITLE_EMPLOYER_LOCATION_CONFLICT,
      matchedObservationId: titleEmployerLocationConflict.observationId,
      fingerprint: candidateFingerprint.digest,
      sameContentChecksumObservationIds,
    });
  }

  const differentEmployer = sameSourcePriors.some((prior) => {
    const priorFingerprint = computeJobContentFingerprint(recordOf(prior)!);
    return (
      priorFingerprint.title === candidateFingerprint.title &&
      candidateFingerprint.employer !== null &&
      priorFingerprint.employer !== null &&
      priorFingerprint.employer !== candidateFingerprint.employer
    );
  });

  if (differentEmployer) {
    return result({
      status: JOB_DEDUP_STATUS.UNIQUE,
      strategy: JOB_DEDUP_STRATEGY.NONE,
      reason: JOB_DEDUP_REASON.TITLE_EMPLOYER_MISMATCH,
      matchedObservationId: null,
      fingerprint: candidateFingerprint.digest,
      sameContentChecksumObservationIds,
    });
  }

  if (!candidateFingerprint.complete) {
    const weakTitle = sameSourcePriors.find((prior) => {
      const priorFingerprint = computeJobContentFingerprint(recordOf(prior)!);
      return priorFingerprint.title === candidateFingerprint.title;
    });

    return result({
      status: JOB_DEDUP_STATUS.POSSIBLE_DUPLICATE,
      strategy: JOB_DEDUP_STRATEGY.INSUFFICIENT_IDENTITY,
      reason: JOB_DEDUP_REASON.INSUFFICIENT_IDENTITY,
      matchedObservationId: weakTitle?.observationId ?? null,
      fingerprint: candidateFingerprint.digest,
      sameContentChecksumObservationIds,
    });
  }

  return result({
    status: JOB_DEDUP_STATUS.UNIQUE,
    strategy: JOB_DEDUP_STRATEGY.NONE,
    reason: JOB_DEDUP_REASON.NO_MATCH,
    matchedObservationId: null,
    fingerprint: candidateFingerprint.digest,
    sameContentChecksumObservationIds,
  });
}
