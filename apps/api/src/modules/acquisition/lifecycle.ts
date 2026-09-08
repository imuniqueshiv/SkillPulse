/**
 * Job lifecycle semantics for government acquisition.
 *
 * ACTIVE    — observed in the latest authorized acquisition (or newly created).
 * EXPIRED   — missing from an authorized full feed refresh (AUTHORIZED_API /
 *             AUTHORIZED_FILE with expireMissing=true). Absence from a
 *             synthetic/partial filter is NEVER treated as expired.
 * WITHDRAWN — source explicitly signals withdrawal/cancellation. "Not observed"
 *             alone is NOT withdrawn.
 *
 * Historical Jobs and RawIngestionRecords are never deleted by acquisition.
 */

export const JOB_LIFECYCLE = {
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  WITHDRAWN: "WITHDRAWN",
} as const;

export type JobLifecycle = (typeof JOB_LIFECYCLE)[keyof typeof JOB_LIFECYCLE];

const WITHDRAWAL_TOKENS = new Set([
  "withdrawn",
  "withdrawal",
  "cancelled",
  "canceled",
  "closed",
  "removed",
]);

/**
 * Map an optional source-provided status token to WITHDRAWN when explicit.
 * Returns null when the source does not affirm withdrawal.
 */
export function explicitWithdrawalStatus(
  record: Record<string, unknown>,
): "WITHDRAWN" | null {
  for (const key of ["status", "job_status", "listing_status", "lifecycle"]) {
    const value = record[key];
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim().toLowerCase();
    if (WITHDRAWAL_TOKENS.has(normalized)) {
      return "WITHDRAWN";
    }
  }
  return null;
}
