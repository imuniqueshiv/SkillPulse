import { AppError } from "../../utils/errors";
import {
  DEFAULT_DEMAND_JOB_LIMIT,
  DEFAULT_DEMAND_RANK_LIMIT,
  DEFAULT_DEMAND_WINDOW_DAYS,
  MAX_DEMAND_JOB_LIMIT,
  MAX_DEMAND_RANK_LIMIT,
} from "./policy";
import type { DemandFilters, DemandPeriod } from "./contract";

/**
 * Explicit period helpers. Never use Date.now() inside deterministic analytics.
 * Windows are half-open [from, to) on postedAt.
 */
export function periodFromDays(
  referenceTime: Date,
  days: number,
): { from: Date; to: Date } {
  if (!(referenceTime instanceof Date) || Number.isNaN(referenceTime.getTime())) {
    throw new AppError(400, "referenceTime must be a valid instant");
  }
  if (!Number.isInteger(days) || days <= 0) {
    throw new AppError(400, "days must be a positive integer");
  }
  const to = new Date(referenceTime.getTime());
  const from = new Date(referenceTime.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export function previousPeriodOfEqualDuration(from: Date, to: Date): {
  from: Date;
  to: Date;
} {
  const durationMs = to.getTime() - from.getTime();
  if (!(durationMs > 0)) {
    throw new AppError(400, "period to must be after from");
  }
  return {
    from: new Date(from.getTime() - durationMs),
    to: new Date(from.getTime()),
  };
}

export function toDemandPeriod(from: Date, to: Date): DemandPeriod {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    dateField: "postedAt",
  };
}

export function defaultWindow(
  referenceTime: Date,
  key: keyof typeof DEFAULT_DEMAND_WINDOW_DAYS = "D30",
): { from: Date; to: Date } {
  return periodFromDays(referenceTime, DEFAULT_DEMAND_WINDOW_DAYS[key]);
}

export function normalizeDemandLimits(input: {
  limit?: number;
  offset?: number;
  rankLimit?: number;
}): { limit: number; offset: number; rankLimit: number } {
  const limit = Math.min(
    Math.max(1, input.limit ?? DEFAULT_DEMAND_JOB_LIMIT),
    MAX_DEMAND_JOB_LIMIT,
  );
  const offset = Math.max(0, input.offset ?? 0);
  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_DEMAND_RANK_LIMIT),
    MAX_DEMAND_RANK_LIMIT,
  );
  return { limit, offset, rankLimit };
}

export function assertValidPeriod(from: Date, to: Date): void {
  if (!(from instanceof Date) || Number.isNaN(from.getTime())) {
    throw new AppError(400, "from must be a valid instant");
  }
  if (!(to instanceof Date) || Number.isNaN(to.getTime())) {
    throw new AppError(400, "to must be a valid instant");
  }
  if (!(to.getTime() > from.getTime())) {
    throw new AppError(400, "to must be after from");
  }
}

export function observationInPeriod(
  postedAt: string | null,
  from: Date,
  to: Date,
): boolean {
  if (!postedAt) {
    return false;
  }
  const t = Date.parse(postedAt);
  if (Number.isNaN(t)) {
    return false;
  }
  return t >= from.getTime() && t < to.getTime();
}

export function resolveFilters(input: DemandFilters): DemandFilters & {
  limit: number;
  offset: number;
  rankLimit: number;
} {
  assertValidPeriod(input.from, input.to);
  const limits = normalizeDemandLimits(input);
  return { ...input, ...limits };
}
