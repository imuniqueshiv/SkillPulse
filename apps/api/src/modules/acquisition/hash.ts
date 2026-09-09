import { createHash } from "node:crypto";
import { canonicalPayloadJson } from "../ingestion/raw-storage";

const CLOCK_KEYS = new Set(["observedAt", "ingestedAt"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Source identity for change detection. Never invented. */
export function ncsExternalId(record: unknown): string | null {
  if (!isPlainObject(record)) {
    return null;
  }
  const jobId = record.job_id;
  if (typeof jobId === "string" && jobId.trim() !== "") {
    return jobId.trim();
  }
  if (typeof jobId === "number" && Number.isFinite(jobId)) {
    return String(jobId);
  }
  const id = record.id;
  if (typeof id === "string" && id.trim() !== "") {
    return id.trim();
  }
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id);
  }
  return null;
}

/**
 * Hash of source-provided job content. Clock fields are excluded so repeated
 * ingestion of the same vacancy is UNCHANGED.
 */
export function computeRecordContentHash(record: unknown): string {
  if (!isPlainObject(record)) {
    return createHash("sha256").update(canonicalPayloadJson(record), "utf8").digest("hex");
  }
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (CLOCK_KEYS.has(key) || value === undefined) {
      continue;
    }
    stripped[key] = value;
  }
  return createHash("sha256")
    .update(canonicalPayloadJson(stripped), "utf8")
    .digest("hex");
}

export function computeBatchChecksum(records: readonly unknown[]): string {
  return createHash("sha256")
    .update(canonicalPayloadJson(records), "utf8")
    .digest("hex");
}
