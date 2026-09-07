import type { EmploymentTrendMetric } from "./contract";
import {
  countByType,
  resolveOutcomeGroups,
  type ResolvedOutcomeGroup,
} from "./outcomes";
import {
  EMPLOYMENT_MIN_TREND_SAMPLE,
  EMPLOYMENT_TREND_DIRECTION,
  EMPLOYMENT_TREND_THRESHOLD,
  OUTCOME_TYPE,
  type EmploymentTrendDirection,
} from "./policy";
import type { EmploymentOutcomeObservation } from "./contract";

/**
 * Equivalent-period trend — reuses Phase 8 semantics (RISING/STABLE/DECLINING).
 * Observational change only — not a forecast.
 */
export function classifyEmploymentTrend(input: {
  current: number;
  previous: number;
  currentSample: number;
  previousSample: number;
  metric: EmploymentTrendMetric["metric"];
}): EmploymentTrendMetric {
  const min = EMPLOYMENT_MIN_TREND_SAMPLE;
  const current = Number.isFinite(input.current) ? input.current : 0;
  const previous = Number.isFinite(input.previous) ? input.previous : 0;

  if (input.currentSample < min && input.previousSample < min) {
    return trend(
      input.metric,
      EMPLOYMENT_TREND_DIRECTION.INSUFFICIENT_DATA,
      current,
      previous,
      null,
      input.currentSample,
      input.previousSample,
      "Sample below employment-v1 minimum — not a forecast.",
    );
  }

  if (previous === 0) {
    if (current === 0) {
      return trend(
        input.metric,
        EMPLOYMENT_TREND_DIRECTION.STABLE,
        current,
        previous,
        0,
        input.currentSample,
        input.previousSample,
        "Both periods zero — STABLE.",
      );
    }
    return trend(
      input.metric,
      EMPLOYMENT_TREND_DIRECTION.INSUFFICIENT_DATA,
      current,
      previous,
      null,
      input.currentSample,
      input.previousSample,
      "Zero previous baseline — growth rate unreliable.",
    );
  }

  const growthRate = (current - previous) / previous;
  let direction: EmploymentTrendDirection = EMPLOYMENT_TREND_DIRECTION.STABLE;
  if (growthRate >= EMPLOYMENT_TREND_THRESHOLD.RISING) {
    direction = EMPLOYMENT_TREND_DIRECTION.RISING;
  } else if (growthRate <= EMPLOYMENT_TREND_THRESHOLD.DECLINING) {
    direction = EMPLOYMENT_TREND_DIRECTION.DECLINING;
  }

  return trend(
    input.metric,
    direction,
    current,
    previous,
    Number(growthRate.toFixed(6)),
    input.currentSample,
    input.previousSample,
    "Observed period-over-period change — not a prediction.",
  );
}

function trend(
  metric: EmploymentTrendMetric["metric"],
  direction: EmploymentTrendDirection,
  current: number,
  previous: number,
  growthRate: number | null,
  currentSample: number,
  previousSample: number,
  note: string,
): EmploymentTrendMetric {
  return {
    metric,
    direction,
    current,
    previous,
    growthRate,
    currentSample,
    previousSample,
    note,
  };
}

export function buildEmploymentTrends(input: {
  currentGroups: readonly ResolvedOutcomeGroup[];
  previousObservations?: readonly EmploymentOutcomeObservation[];
}): EmploymentTrendMetric[] {
  const prevGroups = input.previousObservations
    ? resolveOutcomeGroups(input.previousObservations)
    : [];

  const metrics: EmploymentTrendMetric["metric"][] = [
    "employed",
    "placed",
    "trained",
  ];
  const typeMap = {
    employed: OUTCOME_TYPE.EMPLOYED,
    placed: OUTCOME_TYPE.PLACED,
    trained: OUTCOME_TYPE.TRAINED,
  } as const;

  return metrics.map((metric) => {
    const type = typeMap[metric];
    const current = countByType(input.currentGroups, type);
    const previous = countByType(prevGroups, type);
    return classifyEmploymentTrend({
      metric,
      current,
      previous,
      currentSample: input.currentGroups.length,
      previousSample: prevGroups.length,
    });
  });
}
