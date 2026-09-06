import type { GapTrendMetric } from "./contract";
import {
  GAP_METHODOLOGY_VERSION,
  GAP_MIN_TREND_SAMPLE,
  GAP_TREND_DIRECTION,
  GAP_TREND_THRESHOLD,
  type GapTrendDirection,
} from "./policy";

/**
 * Observed period-over-period shortage change — not a forecast.
 */
export function classifyGapTrend(input: {
  currentShortage: number;
  previousShortage: number;
  currentSample: number;
  previousSample: number;
}): GapTrendMetric {
  const current = Number.isFinite(input.currentShortage)
    ? Math.max(0, input.currentShortage)
    : 0;
  const previous = Number.isFinite(input.previousShortage)
    ? Math.max(0, input.previousShortage)
    : 0;
  const currentSample = Math.max(0, input.currentSample);
  const previousSample = Math.max(0, input.previousSample);

  if (
    currentSample < GAP_MIN_TREND_SAMPLE &&
    previousSample < GAP_MIN_TREND_SAMPLE
  ) {
    return metric(
      GAP_TREND_DIRECTION.INSUFFICIENT_DATA,
      current,
      previous,
      null,
      currentSample,
      previousSample,
    );
  }

  if (previous === 0) {
    if (current === 0) {
      return metric(
        GAP_TREND_DIRECTION.STABLE,
        current,
        previous,
        0,
        currentSample,
        previousSample,
      );
    }
    return metric(
      GAP_TREND_DIRECTION.INSUFFICIENT_DATA,
      current,
      previous,
      null,
      currentSample,
      previousSample,
    );
  }

  const growthRate = (current - previous) / previous;
  let direction: GapTrendDirection = GAP_TREND_DIRECTION.STABLE;
  if (growthRate >= GAP_TREND_THRESHOLD.WIDENING) {
    direction = GAP_TREND_DIRECTION.WIDENING;
  } else if (growthRate <= GAP_TREND_THRESHOLD.NARROWING) {
    direction = GAP_TREND_DIRECTION.NARROWING;
  }

  return metric(
    direction,
    current,
    previous,
    Number(growthRate.toFixed(6)),
    currentSample,
    previousSample,
  );
}

function metric(
  direction: GapTrendDirection,
  currentShortage: number,
  previousShortage: number,
  growthRate: number | null,
  currentSample: number,
  previousSample: number,
): GapTrendMetric {
  return {
    direction,
    currentShortage,
    previousShortage,
    growthRate,
    currentSample,
    previousSample,
    method: GAP_METHODOLOGY_VERSION,
  };
}
