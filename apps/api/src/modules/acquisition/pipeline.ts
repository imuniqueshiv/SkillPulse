import { randomUUID } from "node:crypto";
import type { IngestionAccessMethod, IngestionSnapshotStatus } from "@prisma/client";
import { getPrisma } from "../../config/database";
import { logger } from "../../utils/logger";
import { ingestJobObservation } from "../ingestion/job-ingestion-pipeline";
import { JOB_VALIDATION_STATUS } from "../ingestion/job-validation";
import { NCS_ADAPTER_VERSION, ncsAdapter } from "../ingestion/sources/ncs";
import {
  NCS_ACCESS_MODE,
  NCS_SOURCE_CODE,
  type NcsAccessMode,
} from "../ingestion/sources/ncs-access";
import { processJobIntelligenceById } from "../intelligence/pipeline";
import { assessJobQuality } from "../quality/pipeline";
import { connectorForMode } from "./connectors";
import {
  ACQUISITION_FAILURE,
  AcquisitionError,
  RECORD_OUTCOME,
  type AcquisitionFailureCode,
  type AcquisitionRecordOutcomeStatus,
} from "./errors";
import { computeRecordContentHash, ncsExternalId } from "./hash";
import { explicitWithdrawalStatus } from "./lifecycle";
import { persistIngestionSnapshot } from "./snapshot";
import { resolveMaharashtraLocationId } from "../ingestion/location-resolution";

export type NcsAcquisitionInput = {
  mode: NcsAccessMode;
  observedAt: string;
  ingestedAt: string;
  referenceTime: Date;
  retrievalTime?: Date;
  inputPath?: string;
  state?: string;
  district?: string;
  city?: string;
  limit?: number;
  expireMissing?: boolean;
  processDownstream?: boolean;
  /** Re-run Phase 5–7 even when contentHash is unchanged (enrichment). */
  forceReprocess?: boolean;
  apiBaseUrl?: string | null;
  apiToken?: string | null;
  runId?: string;
};

export type NcsAcquisitionRecordResult = {
  index: number;
  externalId: string | null;
  outcome: AcquisitionRecordOutcomeStatus;
  jobId?: string | null;
  observationId?: string;
  failureCode?: AcquisitionFailureCode;
  message?: string;
};

export type NcsAcquisitionResult = {
  runId: string;
  mode: NcsAccessMode;
  snapshotId: string;
  checksum: string;
  sourceReference: string;
  accessMethod: IngestionAccessMethod;
  parserVersion: string;
  status: IngestionSnapshotStatus;
  failureCode: AcquisitionFailureCode | null;
  state: string | null;
  district: string | null;
  city: string | null;
  total: number;
  created: number;
  changed: number;
  skipped: number;
  duplicates: number;
  accepted: number;
  expired: number;
  withdrawn: number;
  rejected: number;
  failed: number;
  qualityIncluded: number;
  qualityExcluded: number;
  unresolvedSkillTerms: string[];
  durationMs: number;
  records: NcsAcquisitionRecordResult[];
};

function redactFailureMessage(message: string): string {
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

function snapshotStatusFromFailure(
  code: AcquisitionFailureCode,
): IngestionSnapshotStatus {
  if (code === ACQUISITION_FAILURE.ACCESS_DENIED) {
    return "ACCESS_DENIED";
  }
  if (code === ACQUISITION_FAILURE.SOURCE_UNAVAILABLE) {
    return "SOURCE_UNAVAILABLE";
  }
  if (code === ACQUISITION_FAILURE.SCHEMA_CHANGED) {
    return "SCHEMA_CHANGED";
  }
  return "FAILED";
}

function accessMethodForMode(mode: NcsAccessMode): IngestionAccessMethod {
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_API) {
    return "AUTHORIZED_API";
  }
  if (mode === NCS_ACCESS_MODE.AUTHORIZED_FILE) {
    return "AUTHORIZED_FILE";
  }
  if (mode === NCS_ACCESS_MODE.PUBLIC_PAGE) {
    return "PUBLIC_PAGE";
  }
  return "SYNTHETIC_FIXTURE";
}

function withClock(
  record: Record<string, unknown>,
  observedAt: string,
  ingestedAt: string,
): Record<string, unknown> {
  return { ...record, observedAt, ingestedAt };
}

async function applyCurrentState(
  jobId: string,
  record: Record<string, unknown>,
  lifecycleStatus: "ACTIVE" | "WITHDRAWN",
): Promise<void> {
  const mapped = ncsAdapter.parse(record as never);
  const payload = mapped.payload;
  const prisma = getPrisma();
  const locationId = await resolveMaharashtraLocationId(prisma, {
    city: payload.location?.city,
    state: payload.location?.state,
    sourceLocations: payload.sourceMetadata?.sourceLocations,
  });
  await prisma.job.update({
    where: { id: jobId },
    data: {
      title: payload.title,
      description: payload.description ?? null,
      companyName: payload.employerName ?? null,
      postedAt: payload.postedAt ?? null,
      sourceUrl: payload.sourceUrl ?? null,
      lifecycleStatus,
      ...(locationId ? { locationId } : {}),
    },
  });
}

async function processDownstream(
  jobId: string,
  referenceTime: Date,
  observedAt: string,
  ingestedAt: string,
): Promise<"INCLUDE" | "INCLUDE_WITH_CAUTION" | "EXCLUDE" | "UNKNOWN"> {
  await processJobIntelligenceById(jobId, { persist: true });
  const quality = await assessJobQuality({
    jobId,
    referenceTime,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(observedAt),
      ingestedAt,
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });
  return quality.assessment.eligibility ?? "UNKNOWN";
}

/**
 * Acquire NCS-shaped records, persist an immutable snapshot, skip unchanged
 * jobs, and send only new/changed jobs through Phase 5 (then 6–7).
 * Does not delete historical jobs. Does not retrain ML models.
 */
export async function runNcsAcquisition(
  input: NcsAcquisitionInput,
): Promise<NcsAcquisitionResult> {
  const started = Date.now();
  const runId = input.runId ?? randomUUID();
  const prisma = getPrisma();
  const parserVersion = NCS_ADAPTER_VERSION;
  const source = await prisma.dataSource.findUnique({
    where: { code: NCS_SOURCE_CODE },
    select: { id: true },
  });
  if (!source) {
    throw new AcquisitionError(
      ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
      "Data source sp.source.ncs is not registered",
    );
  }

  const retrievalTime = input.retrievalTime ?? new Date(input.observedAt);
  const expireMissing =
    input.expireMissing ??
    (input.mode === NCS_ACCESS_MODE.AUTHORIZED_API ||
      input.mode === NCS_ACCESS_MODE.AUTHORIZED_FILE);
  const processDownstreamEnabled = input.processDownstream !== false;
  const accessMethod = accessMethodForMode(input.mode);

  logger.info("NCS acquisition started", {
    runId,
    source: NCS_SOURCE_CODE,
    mode: input.mode,
    state: input.state ?? null,
    district: input.district ?? null,
    city: input.city ?? null,
    limit: input.limit ?? null,
  });

  const emptyResult = (
    snapshotId: string,
    checksum: string,
    sourceReference: string,
    status: IngestionSnapshotStatus,
    failureCode: AcquisitionFailureCode | null,
  ): NcsAcquisitionResult => ({
    runId,
    mode: input.mode,
    snapshotId,
    checksum,
    sourceReference,
    accessMethod,
    parserVersion,
    status,
    failureCode,
    state: input.state ?? null,
    district: input.district ?? null,
    city: input.city ?? null,
    total: 0,
    created: 0,
    changed: 0,
    skipped: 0,
    duplicates: 0,
    accepted: 0,
    expired: 0,
    withdrawn: 0,
    rejected: 0,
    failed: 0,
    qualityIncluded: 0,
    qualityExcluded: 0,
    unresolvedSkillTerms: [],
    durationMs: Date.now() - started,
    records: [],
  });

  const fail = async (
    code: AcquisitionFailureCode,
    message: string,
    sourceReference = "unacquired",
    checksum = "unacquired",
  ): Promise<NcsAcquisitionResult> => {
    const snapshot = await persistIngestionSnapshot({
      sourceId: source.id,
      retrievalTime,
      sourceReference,
      accessMethod,
      recordCount: 0,
      checksum,
      parserVersion,
      status: snapshotStatusFromFailure(code),
      failureCode: code,
      failureMessage: redactFailureMessage(message),
      metadata: {
        runId,
        mode: input.mode,
        stateFilter: input.state ?? null,
        districtFilter: input.district ?? null,
        cityFilter: input.city ?? null,
      },
    });
    logger.warn("NCS acquisition failed", {
      runId,
      snapshotId: snapshot.id,
      failureCode: code,
      mode: input.mode,
      durationMs: Date.now() - started,
    });
    return emptyResult(
      snapshot.id,
      checksum,
      sourceReference,
      snapshot.status,
      code,
    );
  };

  if (input.mode === NCS_ACCESS_MODE.DISABLED) {
    return fail(
      ACQUISITION_FAILURE.ACCESS_DENIED,
      "ACCESS_NOT_CONFIGURED: NCS acquisition mode is DISABLED",
    );
  }

  let batch;
  try {
    const connector = connectorForMode(input.mode, {
      baseUrl: input.apiBaseUrl ?? process.env.NCS_API_BASE_URL,
      token: input.apiToken ?? process.env.NCS_API_TOKEN,
    });
    batch = await connector.acquire({
      inputPath: input.inputPath,
      state: input.state,
      district: input.district,
      city: input.city,
      limit: input.limit,
      observedAt: input.observedAt,
      ingestedAt: input.ingestedAt,
    });
  } catch (error) {
    if (error instanceof AcquisitionError) {
      return fail(error.code, error.message);
    }
    return fail(
      ACQUISITION_FAILURE.SOURCE_UNAVAILABLE,
      error instanceof Error ? error.message : "Acquisition failed",
    );
  }

  const existing = await prisma.job.findMany({
    where: { sourceId: source.id, externalId: { not: null } },
    select: {
      id: true,
      externalId: true,
      contentHash: true,
      lifecycleStatus: true,
    },
  });
  const byExternalId = new Map(
    existing
      .filter((row): row is typeof row & { externalId: string } =>
        Boolean(row.externalId),
      )
      .map((row) => [row.externalId, row]),
  );

  const outcomes: NcsAcquisitionRecordResult[] = [];
  const seen = new Set<string>();
  const unresolvedSkills = new Set<string>();
  let created = 0;
  let changed = 0;
  let skipped = 0;
  let duplicates = 0;
  let accepted = 0;
  let withdrawn = 0;
  let rejected = 0;
  let failed = 0;
  let qualityIncluded = 0;
  let qualityExcluded = 0;

  for (const [index, record] of batch.records.entries()) {
    const externalId = ncsExternalId(record);
    const contentHash = computeRecordContentHash(record);
    if (externalId) {
      if (seen.has(externalId)) {
        duplicates += 1;
        outcomes.push({
          index,
          externalId,
          outcome: RECORD_OUTCOME.DUPLICATE,
          failureCode: ACQUISITION_FAILURE.DUPLICATE,
          message: "Duplicate externalId within the same acquisition batch",
        });
        continue;
      }
      seen.add(externalId);
    }

    const withdrawal = explicitWithdrawalStatus(record);
    const prior = externalId ? byExternalId.get(externalId) : undefined;
    if (
      prior &&
      prior.contentHash === contentHash &&
      !withdrawal &&
      !input.forceReprocess
    ) {
      skipped += 1;
      duplicates += 1;
      await prisma.job.update({
        where: { id: prior.id },
        data: {
          lastObservedAt: new Date(input.observedAt),
          lifecycleStatus: "ACTIVE",
        },
      });
      outcomes.push({
        index,
        externalId,
        outcome: RECORD_OUTCOME.UNCHANGED,
        jobId: prior.id,
        failureCode: ACQUISITION_FAILURE.DUPLICATE,
      });
      continue;
    }

    const clocked = withClock(record, input.observedAt, input.ingestedAt);
    try {
      const ingested = await ingestJobObservation({
        adapter: ncsAdapter,
        sourceRecord: clocked,
        rawPayload: { ...record },
        referenceTime: new Date(input.referenceTime.getTime()),
      });

      for (const term of ingested.unresolvedTerms) {
        unresolvedSkills.add(term);
      }

      if (ingested.validationStatus === JOB_VALIDATION_STATUS.REJECTED) {
        rejected += 1;
        outcomes.push({
          index,
          externalId,
          outcome: RECORD_OUTCOME.VALIDATION_FAILED,
          observationId: ingested.observationId,
          failureCode: ACQUISITION_FAILURE.VALIDATION_FAILED,
        });
        continue;
      }

      if (!ingested.jobId) {
        failed += 1;
        outcomes.push({
          index,
          externalId,
          outcome: RECORD_OUTCOME.PROCESSING_FAILED,
          observationId: ingested.observationId,
          failureCode: ACQUISITION_FAILURE.PROCESSING_FAILED,
          message: "Canonical job was not persisted",
        });
        continue;
      }

      const lifecycleStatus = withdrawal ?? "ACTIVE";
      const isChange = Boolean(prior);
      if (isChange) {
        await applyCurrentState(ingested.jobId, clocked, lifecycleStatus);
        changed += 1;
      } else {
        created += 1;
        if (withdrawal) {
          await prisma.job.update({
            where: { id: ingested.jobId },
            data: { lifecycleStatus: "WITHDRAWN" },
          });
        }
      }

      if (withdrawal) {
        withdrawn += 1;
      }

      await prisma.job.update({
        where: { id: ingested.jobId },
        data: {
          contentHash,
          lastObservedAt: new Date(input.observedAt),
          lifecycleStatus,
        },
      });
      byExternalId.set(externalId ?? ingested.jobId, {
        id: ingested.jobId,
        externalId: externalId ?? ingested.jobId,
        contentHash,
        lifecycleStatus,
      });

      accepted += 1;

      if (processDownstreamEnabled && !withdrawal) {
        try {
          const eligibility = await processDownstream(
            ingested.jobId,
            input.referenceTime,
            input.observedAt,
            input.ingestedAt,
          );
          if (eligibility === "EXCLUDE") {
            qualityExcluded += 1;
          } else if (
            eligibility === "INCLUDE" ||
            eligibility === "INCLUDE_WITH_CAUTION"
          ) {
            qualityIncluded += 1;
          }
        } catch (error) {
          failed += 1;
          outcomes.push({
            index,
            externalId,
            outcome: RECORD_OUTCOME.PROCESSING_FAILED,
            jobId: ingested.jobId,
            observationId: ingested.observationId,
            failureCode: ACQUISITION_FAILURE.PROCESSING_FAILED,
            message:
              error instanceof Error ? error.message : "Downstream processing failed",
          });
          continue;
        }
      }

      outcomes.push({
        index,
        externalId,
        outcome: isChange ? RECORD_OUTCOME.CHANGED : RECORD_OUTCOME.CREATED,
        jobId: ingested.jobId,
        observationId: ingested.observationId,
      });
    } catch (error) {
      failed += 1;
      outcomes.push({
        index,
        externalId,
        outcome: RECORD_OUTCOME.PROCESSING_FAILED,
        failureCode: ACQUISITION_FAILURE.PROCESSING_FAILED,
        message: error instanceof Error ? error.message : "Record acquisition failed",
      });
    }
  }

  let expired = 0;
  if (expireMissing && seen.size > 0) {
    const stale = existing.filter(
      (row) =>
        Boolean(row.contentHash) &&
        row.externalId &&
        !seen.has(row.externalId) &&
        row.lifecycleStatus === "ACTIVE",
    );
    if (stale.length > 0) {
      await prisma.job.updateMany({
        where: { id: { in: stale.map((row) => row.id) } },
        data: { lifecycleStatus: "EXPIRED" },
      });
      expired = stale.length;
    }
  }

  const status: IngestionSnapshotStatus =
    failed > 0 || rejected > 0 ? "PARTIAL_SYNC" : "COMPLETED";
  const failureCode: AcquisitionFailureCode | null =
    failed > 0 || rejected > 0 ? ACQUISITION_FAILURE.PARTIAL_SYNC : null;

  const snapshot = await persistIngestionSnapshot({
    sourceId: source.id,
    retrievalTime,
    sourceReference: batch.sourceReference,
    accessMethod: batch.accessMethod,
    recordCount: batch.records.length,
    checksum: batch.checksum,
    parserVersion: batch.parserVersion ?? parserVersion,
    status,
    failureCode,
    createdCount: created,
    changedCount: changed,
    skippedCount: skipped,
    duplicateCount: duplicates,
    acceptedCount: accepted,
    expiredCount: expired,
    withdrawnCount: withdrawn,
    rejectedCount: rejected,
    failedCount: failed,
    metadata: {
      runId,
      mode: input.mode,
      stateFilter: input.state ?? null,
      districtFilter: input.district ?? null,
      cityFilter: input.city ?? null,
      expireMissing,
      qualityIncluded,
      qualityExcluded,
      unresolvedSkillTerms: [...unresolvedSkills].sort().slice(0, 50),
    },
  });

  const durationMs = Date.now() - started;
  logger.info("NCS acquisition completed", {
    runId,
    snapshotId: snapshot.id,
    source: NCS_SOURCE_CODE,
    mode: input.mode,
    state: input.state ?? null,
    district: input.district ?? null,
    recordCount: batch.records.length,
    accepted,
    rejected,
    duplicates,
    unchanged: skipped,
    changed,
    persisted: created + changed,
    failed,
    durationMs,
    status,
  });

  return {
    runId,
    mode: input.mode,
    snapshotId: snapshot.id,
    checksum: batch.checksum,
    sourceReference: batch.sourceReference,
    accessMethod: batch.accessMethod,
    parserVersion: batch.parserVersion ?? parserVersion,
    status,
    failureCode,
    state: input.state ?? null,
    district: input.district ?? null,
    city: input.city ?? null,
    total: batch.records.length,
    created,
    changed,
    skipped,
    duplicates,
    accepted,
    expired,
    withdrawn,
    rejected,
    failed,
    qualityIncluded,
    qualityExcluded,
    unresolvedSkillTerms: [...unresolvedSkills].sort(),
    durationMs,
    records: outcomes,
  };
}
