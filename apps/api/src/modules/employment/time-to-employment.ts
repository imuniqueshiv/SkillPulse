import type { TimeToEmploymentStats } from "./contract";
import type { ResolvedOutcomeGroup } from "./outcomes";
import { OUTCOME_TYPE } from "./policy";

function parseDay(iso: string | null): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return t;
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Number(((sorted[mid - 1]! + sorted[mid]!) / 2).toFixed(2));
  }
  return Number(sorted[mid]!.toFixed(2));
}

/**
 * Time-to-employment from trainingCompletionDate → employmentStartDate.
 * Negative / impossible durations rejected (not silently corrected).
 * Missing dates → UNKNOWN (not estimated).
 */
export function computeTimeToEmployment(
  groups: readonly ResolvedOutcomeGroup[],
): TimeToEmploymentStats {
  const days: number[] = [];
  let rejectedInvalid = 0;
  const notes: string[] = [
    "Median is primary indicator. Completion dates are never inferred from enrollment.",
  ];

  for (const g of groups) {
    const obs = g.primary;
    if (
      obs.outcomeType !== OUTCOME_TYPE.EMPLOYED &&
      obs.outcomeType !== OUTCOME_TYPE.PLACED
    ) {
      continue;
    }
    const start = parseDay(obs.employmentStartDate);
    const complete = parseDay(obs.trainingCompletionDate);
    if (start === null || complete === null) {
      continue;
    }
    const diffMs = start - complete;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (!Number.isFinite(diffDays) || diffDays < 0) {
      rejectedInvalid += 1;
      continue;
    }
    days.push(Number(diffDays.toFixed(2)));
  }

  days.sort((a, b) => a - b);
  if (rejectedInvalid > 0) {
    notes.push(
      `${rejectedInvalid} observation(s) rejected for invalid/negative duration.`,
    );
  }
  if (days.length === 0) {
    notes.push("No valid trainingCompletionDate + employmentStartDate pairs.");
  }

  const sum = days.reduce((a, b) => a + b, 0);
  return {
    knownCount: days.length,
    medianDays: median(days),
    averageDays:
      days.length > 0 ? Number((sum / days.length).toFixed(2)) : null,
    minDays: days.length > 0 ? days[0]! : null,
    maxDays: days.length > 0 ? days[days.length - 1]! : null,
    rejectedInvalid,
    notes,
  };
}

export function medianOf(values: readonly number[]): number | null {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  return median(sorted);
}
