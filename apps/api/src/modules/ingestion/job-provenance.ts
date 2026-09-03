import { Prisma } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import type { JobDedupStatus } from "./job-deduplication";
import type { JobFreshnessStatus } from "./job-freshness";
import {
  JOB_VALIDATION_STATUS,
  type JobValidationResult,
} from "./job-validation";

export const RAW_INGESTION_REFERENCE_PREFIX = "raw-ingestion:" as const;

export type JobProvenanceInput = {
  observationId: string;
  validation: JobValidationResult;
  dedupStatus?: JobDedupStatus | null;
  freshnessStatus?: JobFreshnessStatus | null;
};

export type JobProvenanceMetadata = {
  sourceCode?: string;
  externalId?: string;
  sourceUrl?: string;
  observationId: string;
  adapterName: string;
  adapterVersion: string;
  contractVersion: string;
  validationStatus: "VALID" | "REVIEW";
  ingestedAt: string;
  dedupStatus?: JobDedupStatus;
  freshnessStatus?: JobFreshnessStatus;
};

export type JobPostingProvenance = {
  type: "JOB_POSTING";
  sourceId: string | null;
  sourceCode: string | null;
  reference: string;
  observedAt: Date;
  confidence: null;
  metadata: JobProvenanceMetadata;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const evidenceSelect = {
  id: true,
  sourceId: true,
  type: true,
  reference: true,
  observedAt: true,
  confidence: true,
  metadata: true,
  createdAt: true,
  source: { select: { id: true, code: true, name: true } },
} as const;

function copyInstant(value: Date): Date {
  return new Date(value.getTime());
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function requireEligibleRecord(validation: JobValidationResult) {
  if (validation.status === JOB_VALIDATION_STATUS.REJECTED || !validation.record) {
    throw new AppError(400, "Job observation is not eligible for provenance");
  }
  return validation.record;
}

export function rawIngestionReference(observationId: string): string {
  return `${RAW_INGESTION_REFERENCE_PREFIX}${observationId}`;
}

/**
 * Pure provenance builder. Does not persist, fetch URLs, or copy raw payloads.
 * Evidence.observedAt is the contract observation time, not ingestedAt.
 */
export function buildJobPostingProvenance(
  input: JobProvenanceInput,
): JobPostingProvenance {
  const observationId = input.observationId.trim();
  if (!observationId) {
    throw new AppError(400, "observationId is required");
  }

  const record = requireEligibleRecord(input.validation);
  const payload = record.payload;
  const validationStatus = input.validation.status as "VALID" | "REVIEW";

  const metadata: JobProvenanceMetadata = {
    observationId,
    adapterName: record.adapterName,
    adapterVersion: record.adapterVersion,
    contractVersion: record.contractVersion,
    validationStatus,
    ingestedAt: payload.ingestedAt.toISOString(),
  };

  if (payload.sourceCode) {
    metadata.sourceCode = payload.sourceCode;
  }
  if (payload.externalId) {
    metadata.externalId = payload.externalId;
  }
  if (payload.sourceUrl) {
    metadata.sourceUrl = payload.sourceUrl;
  }
  if (input.dedupStatus) {
    metadata.dedupStatus = input.dedupStatus;
  }
  if (input.freshnessStatus) {
    metadata.freshnessStatus = input.freshnessStatus;
  }

  return {
    type: "JOB_POSTING",
    sourceId: payload.sourceId ?? null,
    sourceCode: payload.sourceCode ?? null,
    reference: rawIngestionReference(observationId),
    observedAt: copyInstant(payload.observedAt),
    confidence: null,
    metadata,
  };
}

async function resolveSource(sourceId?: string, sourceCode?: string) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.findFirst({
    where: sourceId && isUuid(sourceId) ? { id: sourceId } : { code: sourceCode },
    select: { id: true, code: true, name: true },
  });

  if (!source) {
    throw new AppError(404, "Data source not found");
  }

  if (sourceId && sourceCode && source.code !== sourceCode) {
    throw new AppError(400, "Source id and source code do not match");
  }

  return source;
}

/**
 * Persist JOB_POSTING Evidence. Idempotent on (sourceId, type, reference).
 * Does not update an existing row. Does not write Job or JobSkill.
 */
export async function recordJobPostingEvidence(input: JobProvenanceInput) {
  const provenance = buildJobPostingProvenance(input);
  const source = await resolveSource(
    provenance.sourceId ?? undefined,
    provenance.sourceCode ?? undefined,
  );
  const prisma = getPrisma();

  const existing = await prisma.evidence.findFirst({
    where: {
      sourceId: source.id,
      type: "JOB_POSTING",
      reference: provenance.reference,
    },
    select: evidenceSelect,
  });

  if (existing) {
    return { evidence: existing, created: false, provenance };
  }

  const evidence = await prisma.evidence.create({
    data: {
      sourceId: source.id,
      type: "JOB_POSTING",
      reference: provenance.reference,
      observedAt: provenance.observedAt,
      confidence: null,
      metadata: provenance.metadata as Prisma.InputJsonValue,
    },
    select: evidenceSelect,
  });

  return { evidence, created: true, provenance };
}
