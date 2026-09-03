import { AppError } from "../../utils/errors";
import { storeRawObservation } from "./raw-storage";
import {
  JOB_VALIDATION_STATUS,
  validateJobIngestion,
  type JobValidationResult,
  type JobValidationStatus,
} from "./job-validation";
import {
  deduplicateJobObservation,
  type JobDedupObservation,
  type JobDedupStatus,
} from "./job-deduplication";
import {
  evaluateJobFreshness,
  type JobFreshnessPolicy,
  type JobFreshnessStatus,
} from "./job-freshness";
import { recordJobPostingEvidence } from "./job-provenance";
import {
  normalizeJobObservationSkills,
  type JobSkillInputTerm,
} from "./job-skill-normalization";
import { persistCanonicalJob } from "./job-persistence";
import type { JobIngestionRecord } from "./contract";

export type IngestJobObservationInput = {
  /** Already-adapted Phase 5.2 contract object. */
  record?: unknown;
  /** Optional in-process adapter. When set, `sourceRecord` is mapped first. */
  adapter?: { parse(record: unknown): unknown };
  sourceRecord?: unknown;
  /** Stored as the raw payload. Defaults to `sourceRecord` or `record`. */
  rawPayload?: unknown;
  /** Required. Never taken from Date.now(). */
  referenceTime: Date;
  freshnessPolicy?: JobFreshnessPolicy;
  relatedObservations?: readonly JobDedupObservation[];
  skills?: readonly JobSkillInputTerm[] | null;
};

export type IngestJobObservationResult = {
  observationId: string;
  validationStatus: JobValidationStatus;
  dedupStatus: JobDedupStatus | null;
  freshnessStatus: JobFreshnessStatus | null;
  evidenceId: string | null;
  evidenceCreated: boolean | null;
  unresolvedTerms: string[];
  resolvedSkillIds: string[];
  jobId: string | null;
  jobCreated: boolean | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireContract(input: IngestJobObservationInput): unknown {
  if (input.adapter) {
    if (input.sourceRecord === undefined) {
      throw new AppError(400, "sourceRecord is required when adapter is provided");
    }
    return input.adapter.parse(input.sourceRecord);
  }
  if (input.record === undefined) {
    throw new AppError(400, "Ingestion record is required");
  }
  return input.record;
}

function rawStoreInput(contract: unknown, rawPayload: unknown) {
  if (!isPlainObject(contract) || !isPlainObject(contract.payload)) {
    throw new AppError(400, "Ingestion record is required");
  }

  const payload = contract.payload;
  return {
    sourceId: typeof payload.sourceId === "string" ? payload.sourceId : undefined,
    sourceCode: typeof payload.sourceCode === "string" ? payload.sourceCode : undefined,
    externalId:
      typeof payload.externalId === "string" ? payload.externalId : undefined,
    observedAt: payload.observedAt,
    adapterName:
      typeof contract.adapterName === "string" ? contract.adapterName : undefined,
    adapterVersion:
      typeof contract.adapterVersion === "string"
        ? contract.adapterVersion
        : undefined,
    payload: rawPayload,
  };
}

function relatedRecords(
  related: readonly JobDedupObservation[] | undefined,
): JobIngestionRecord[] {
  if (!related) {
    return [];
  }
  const records: JobIngestionRecord[] = [];
  for (const observation of related) {
    if (observation.validation.record) {
      records.push(observation.validation.record);
    }
  }
  return records;
}

function rejectedResult(
  observationId: string,
  validation: JobValidationResult,
): IngestJobObservationResult {
  return {
    observationId,
    validationStatus: validation.status,
    dedupStatus: null,
    freshnessStatus: null,
    evidenceId: null,
    evidenceCreated: null,
    unresolvedTerms: [],
    resolvedSkillIds: [],
    jobId: null,
    jobCreated: false,
  };
}

/**
 * Thin Phase 5 ingestion orchestrator. Calls existing stages in order.
 * Does not reimplement validation, dedup, freshness, provenance, taxonomy, or Job mapping.
 */
export async function ingestJobObservation(
  input: IngestJobObservationInput,
): Promise<IngestJobObservationResult> {
  if (!input.referenceTime || Number.isNaN(input.referenceTime.getTime())) {
    throw new AppError(400, "referenceTime is required");
  }

  const contract = requireContract(input);
  const rawPayload = input.rawPayload ?? input.sourceRecord ?? contract;
  const stored = await storeRawObservation(rawStoreInput(contract, rawPayload));
  const observationId = stored.record.id;

  const validation = validateJobIngestion(contract);
  if (validation.status === JOB_VALIDATION_STATUS.REJECTED) {
    return rejectedResult(observationId, validation);
  }

  const related = input.relatedObservations ?? [];
  const dedup = deduplicateJobObservation(
    {
      observationId,
      validation,
      contentChecksum: stored.record.checksum,
    },
    related,
  );

  const freshness = evaluateJobFreshness({
    validation,
    referenceTime: new Date(input.referenceTime.getTime()),
    policy: input.freshnessPolicy,
    relatedObservations: relatedRecords(related),
    dedupStatus: dedup.status,
  });

  const provenance = await recordJobPostingEvidence({
    observationId,
    validation,
    dedupStatus: dedup.status,
    freshnessStatus: freshness.status,
  });

  const skills = await normalizeJobObservationSkills({
    observationId,
    validation,
    skills: input.skills,
    dedupStatus: dedup.status,
    freshnessStatus: freshness.status,
  });

  const persisted = await persistCanonicalJob({
    observationId,
    validation,
    skills,
  });

  return {
    observationId,
    validationStatus: validation.status,
    dedupStatus: dedup.status,
    freshnessStatus: freshness.status,
    evidenceId: provenance.evidence.id,
    evidenceCreated: provenance.created,
    unresolvedTerms: [...skills.unresolvedTerms],
    resolvedSkillIds: skills.resolvedSkills.map((row) => row.skillId),
    jobId: persisted.job.id,
    jobCreated: persisted.created,
  };
}
