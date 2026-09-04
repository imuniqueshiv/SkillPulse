import { AppError } from "../../utils/errors";
import {
  assessJobQuality,
  type AssessJobQualityInput,
  type AssessJobQualityResult,
} from "./pipeline";

export const DEFAULT_QUALITY_BULK_LIMIT = 100;
export const MAX_QUALITY_BULK_LIMIT = 100;

export type AssessJobsQualityInput = {
  jobIds: readonly string[];
  referenceTime: Date;
  persist?: boolean;
  assessmentVersion?: string;
  intelligenceProcessorVersion?: string;
  /** Bounded batch size. Default 100, max 100. */
  limit?: number;
  offset?: number;
};

export type AssessJobsQualityItem =
  | {
      jobId: string;
      status: "OK";
      result: AssessJobQualityResult;
    }
  | {
      jobId: string;
      status: "FAILED";
      error: { message: string; statusCode?: number };
    };

export type AssessJobsQualityResult = {
  referenceTime: string;
  limit: number;
  offset: number;
  requested: number;
  processed: number;
  succeeded: number;
  failed: number;
  created: number;
  unchanged: number;
  changed: number;
  results: AssessJobsQualityItem[];
};

/**
 * Phase 7.10 synchronous bulk quality assessment.
 * Deterministic jobId order. Continues on individual failures.
 * Never loads an unbounded set — applies limit/offset after sorting.
 */
export async function assessJobsQuality(
  input: AssessJobsQualityInput,
): Promise<AssessJobsQualityResult> {
  if (!(input.referenceTime instanceof Date) || Number.isNaN(input.referenceTime.getTime())) {
    throw new AppError(400, "referenceTime must be a valid instant");
  }
  if (!Array.isArray(input.jobIds)) {
    throw new AppError(400, "jobIds must be an array");
  }

  const limit = Math.min(
    Math.max(1, input.limit ?? DEFAULT_QUALITY_BULK_LIMIT),
    MAX_QUALITY_BULK_LIMIT,
  );
  const offset = Math.max(0, input.offset ?? 0);

  const ordered = [...new Set(input.jobIds.map((id) => id.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
  const batch = ordered.slice(offset, offset + limit);

  const results: AssessJobsQualityItem[] = [];
  let succeeded = 0;
  let failed = 0;
  let created = 0;
  let unchanged = 0;
  let changed = 0;

  for (const jobId of batch) {
    const assessInput: AssessJobQualityInput = {
      jobId,
      referenceTime: input.referenceTime,
      persist: input.persist ?? true,
      assessmentVersion: input.assessmentVersion,
      intelligenceProcessorVersion: input.intelligenceProcessorVersion,
    };
    try {
      const result = await assessJobQuality(assessInput);
      results.push({ jobId, status: "OK", result });
      succeeded += 1;
      if (result.persistence?.created) {
        created += 1;
      } else if (result.persistence?.unchanged) {
        unchanged += 1;
      } else if (result.persistence && !result.persistence.preserved) {
        changed += 1;
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown quality assessment error";
      const statusCode =
        error instanceof AppError ? error.statusCode : undefined;
      results.push({
        jobId,
        status: "FAILED",
        error: { message, statusCode },
      });
    }
  }

  return {
    referenceTime: input.referenceTime.toISOString(),
    limit,
    offset,
    requested: ordered.length,
    processed: batch.length,
    succeeded,
    failed,
    created,
    unchanged,
    changed,
    results,
  };
}
