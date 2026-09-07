import type { RateResult } from "./contract";
import { EMPLOYMENT_MIN_RATE_DENOMINATOR } from "./policy";

/**
 * Safe rate: null when denominator unknown or zero.
 * Never Infinity / NaN. Missing ≠ 0%.
 */
export function computeRate(
  numerator: number,
  denominator: number | null | undefined,
  noteWhenMissing = "Denominator unknown or zero — rate is null, not 0%.",
): RateResult {
  const num = Math.max(0, numerator);
  if (
    denominator === null ||
    denominator === undefined ||
    !Number.isFinite(denominator) ||
    denominator < EMPLOYMENT_MIN_RATE_DENOMINATOR
  ) {
    return {
      value: null,
      numerator: num,
      denominator:
        denominator === null || denominator === undefined
          ? null
          : Math.max(0, denominator),
      note: noteWhenMissing,
    };
  }
  const den = denominator;
  const value = num / den;
  if (!Number.isFinite(value)) {
    return {
      value: null,
      numerator: num,
      denominator: den,
      note: "Non-finite rate suppressed.",
    };
  }
  return {
    value: Number(value.toFixed(6)),
    numerator: num,
    denominator: den,
    note: "Observational rate for compatible cohort — not causal.",
  };
}

export function trainingToPlacementRate(
  placed: number,
  trained: number | null,
): RateResult {
  return computeRate(
    placed,
    trained,
    "Training→placement requires linked trained cohort — null when unavailable.",
  );
}

export function trainingToEmploymentRate(
  employed: number,
  trained: number | null,
): RateResult {
  return computeRate(
    employed,
    trained,
    "Training→employment requires linked trained cohort — null when unavailable.",
  );
}

export function certificationToEmploymentRate(
  employed: number,
  certified: number | null,
): RateResult {
  return computeRate(
    employed,
    certified,
    "Certification→employment requires linked certified cohort — null when unavailable.",
  );
}
