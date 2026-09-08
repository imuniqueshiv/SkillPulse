import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import {
  getJobSourceAdapter,
  registerJobSourceAdapter,
  type JobSourceAdapter,
} from "./adapter";
import {
  ingestJobObservation,
  type IngestJobObservationResult,
} from "./job-ingestion-pipeline";
import { JOB_VALIDATION_STATUS } from "./job-validation";
import { mahaswayamRojgarAdapter } from "./sources/mahaswayam-rojgar";
import { ncsAdapter } from "./sources/ncs";

/**
 * Built-in executable adapters. Add a future state/source here; do not branch
 * in job-ingestion-pipeline.ts.
 */
const BUILTIN_JOB_SOURCE_ADAPTERS: JobSourceAdapter<unknown>[] = [
  mahaswayamRojgarAdapter as JobSourceAdapter<unknown>,
  ncsAdapter as JobSourceAdapter<unknown>,
];

export type IngestSourceDatasetInput<TSource = unknown> = {
  records: readonly unknown[];
  referenceTime: Date;
  observedAt: string;
  ingestedAt: string;
  adapter?: JobSourceAdapter<TSource>;
  sourceCode?: string;
};

export type IngestSourceRecordOutcome = {
  index: number;
  status: "ACCEPTED" | "REJECTED" | "FAILED";
  observationId?: string;
  jobId?: string | null;
  jobCreated?: boolean | null;
  message?: string;
};

export type IngestSourceDatasetResult = {
  sourceCode: string;
  geographicScope: string | null;
  total: number;
  accepted: number;
  rejected: number;
  failed: number;
  jobsCreated: number;
  jobsReused: number;
  unresolvedSkillTerms: string[];
  outcomes: IngestSourceRecordOutcome[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneRecord(value: unknown): unknown {
  if (Array.isArray(value) || isPlainObject(value)) {
    return JSON.parse(JSON.stringify(value)) as unknown;
  }
  return value;
}

function withClock(
  record: unknown,
  observedAt: string,
  ingestedAt: string,
): unknown {
  if (!isPlainObject(record)) {
    return record;
  }
  return { ...record, observedAt, ingestedAt };
}

function isSourceConfigError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.message === "Data source not found" ||
      error.message === "Unknown source adapter" ||
      error.message === "Source id and source code do not match" ||
      error.message === "Adapter already registered for source")
  );
}

export function registerBuiltinJobSourceAdapters(): void {
  for (const adapter of BUILTIN_JOB_SOURCE_ADAPTERS) {
    try {
      getJobSourceAdapter(adapter.sourceCode);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        registerJobSourceAdapter(adapter);
        continue;
      }
      throw error;
    }
  }
}

function resolveAdapter<TSource>(
  input: IngestSourceDatasetInput<TSource>,
): JobSourceAdapter<TSource> {
  if (input.adapter) {
    return input.adapter;
  }
  if (!input.sourceCode) {
    throw new AppError(400, "sourceCode or adapter is required");
  }
  registerBuiltinJobSourceAdapters();
  return getJobSourceAdapter(input.sourceCode) as JobSourceAdapter<TSource>;
}

/**
 * Iterate source records through a registered adapter and Phase 5.11.
 *
 * Policy:
 * - Unreadable dataset / missing adapter / unknown DataSource → abort (source-level).
 * - Malformed, REJECTED, or persist-failed records → continue (record-level).
 * - Partial success is intended. There is no all-or-nothing batch transaction.
 */
export async function ingestSourceDataset<TSource = unknown>(
  input: IngestSourceDatasetInput<TSource>,
): Promise<IngestSourceDatasetResult> {
  if (!Array.isArray(input.records)) {
    throw new AppError(400, "Dataset records are required");
  }
  if (!input.referenceTime || Number.isNaN(input.referenceTime.getTime())) {
    throw new AppError(400, "referenceTime is required");
  }

  const adapter = resolveAdapter(input);
  const sourceCode = adapter.sourceCode;
  const prisma = getPrisma();
  const source = await prisma.dataSource.findUnique({
    where: { code: sourceCode },
    select: { code: true, geographicScope: true },
  });
  if (!source) {
    throw new AppError(404, "Data source not found");
  }

  const outcomes: IngestSourceRecordOutcome[] = [];
  const unresolved = new Set<string>();
  let accepted = 0;
  let rejected = 0;
  let failed = 0;
  let jobsCreated = 0;
  let jobsReused = 0;
  let started = false;

  for (const [index, record] of input.records.entries()) {
    try {
      const mapped = adapter.map(
        withClock(record, input.observedAt, input.ingestedAt) as TSource,
      );
      const result: IngestJobObservationResult = await ingestJobObservation({
        record: mapped,
        rawPayload: cloneRecord(record),
        referenceTime: new Date(input.referenceTime.getTime()),
      });
      started = true;

      if (result.validationStatus === JOB_VALIDATION_STATUS.REJECTED) {
        rejected += 1;
        outcomes.push({
          index,
          status: "REJECTED",
          observationId: result.observationId,
          jobId: null,
          jobCreated: false,
        });
        continue;
      }

      accepted += 1;
      if (result.jobCreated) {
        jobsCreated += 1;
      } else if (result.jobId) {
        jobsReused += 1;
      }
      for (const term of result.unresolvedTerms) {
        unresolved.add(term);
      }
      outcomes.push({
        index,
        status: "ACCEPTED",
        observationId: result.observationId,
        jobId: result.jobId,
        jobCreated: result.jobCreated,
      });
    } catch (error) {
      if (!started && isSourceConfigError(error)) {
        throw error;
      }
      failed += 1;
      outcomes.push({
        index,
        status: "FAILED",
        message: error instanceof Error ? error.message : "Record ingestion failed",
      });
    }
  }

  return {
    sourceCode,
    geographicScope: source.geographicScope,
    total: input.records.length,
    accepted,
    rejected,
    failed,
    jobsCreated,
    jobsReused,
    unresolvedSkillTerms: [...unresolved].sort(),
    outcomes,
  };
}
