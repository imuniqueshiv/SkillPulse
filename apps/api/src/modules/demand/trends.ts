import {
  DEMAND_TREND_DIRECTION,
  DEMAND_TREND_THRESHOLD,
  DEMAND_MIN_TREND_SAMPLE,
  DEMAND_METHODOLOGY_VERSION,
  type DemandTrendDirection,
} from "./policy";
import type { DemandTrendMetric } from "./contract";

/**
 * Deterministic period-over-period trend classification (demand-v1).
 * Never returns Infinity. Small samples → INSUFFICIENT_DATA.
 */
export function classifyTrend(input: {
  current: number;
  previous: number;
  currentSample: number;
  previousSample: number;
  minSample?: number;
  risingThreshold?: number;
  decliningThreshold?: number;
}): DemandTrendMetric {
  const minSample = input.minSample ?? DEMAND_MIN_TREND_SAMPLE;
  const risingThreshold = input.risingThreshold ?? DEMAND_TREND_THRESHOLD.RISING;
  const decliningThreshold =
    input.decliningThreshold ?? DEMAND_TREND_THRESHOLD.DECLINING;

  const current = Number.isFinite(input.current) ? input.current : 0;
  const previous = Number.isFinite(input.previous) ? input.previous : 0;
  const currentSample = Math.max(0, input.currentSample);
  const previousSample = Math.max(0, input.previousSample);

  if (currentSample < minSample && previousSample < minSample) {
    return metric(
      DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA,
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
        DEMAND_TREND_DIRECTION.STABLE,
        current,
        previous,
        0,
        currentSample,
        previousSample,
      );
    }
    // Non-zero current from a zero baseline is not a reliable % surge.
    return metric(
      DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA,
      current,
      previous,
      null,
      currentSample,
      previousSample,
    );
  }

  const growthRate = (current - previous) / previous;
  let direction: DemandTrendDirection = DEMAND_TREND_DIRECTION.STABLE;
  if (growthRate >= risingThreshold) {
    direction = DEMAND_TREND_DIRECTION.RISING;
  } else if (growthRate <= decliningThreshold) {
    direction = DEMAND_TREND_DIRECTION.DECLINING;
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
  direction: DemandTrendDirection,
  current: number,
  previous: number,
  growthRate: number | null,
  currentSample: number,
  previousSample: number,
): DemandTrendMetric {
  return {
    direction,
    current,
    previous,
    growthRate,
    currentSample,
    previousSample,
    method: DEMAND_METHODOLOGY_VERSION,
  };
}
