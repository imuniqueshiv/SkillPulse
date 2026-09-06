import type { GapMetricBundle } from "./contract";
import type { GapComparability, GapSeverity } from "./policy";
import {
  GAP_COMPARABILITY,
  GAP_MIN_DEMAND_SAMPLE,
  GAP_MIN_SUPPLY_SAMPLE,
  GAP_SEVERITY,
  GAP_SEVERITY_THRESHOLD,
} from "./policy";

export function classifySeverity(input: {
  metrics: GapMetricBundle;
  demandSample: number;
  supplySample: number;
  comparability: GapComparability;
}): GapSeverity {
  if (input.metrics.bothZero) {
    return GAP_SEVERITY.INSUFFICIENT_DATA;
  }

  if (
    input.demandSample < GAP_MIN_DEMAND_SAMPLE ||
    (input.supplySample < GAP_MIN_SUPPLY_SAMPLE && !input.metrics.zeroSupply)
  ) {
    // Zero supply with enough demand still needs min demand sample.
    if (
      input.metrics.zeroSupply &&
      input.demandSample >= GAP_MIN_DEMAND_SAMPLE
    ) {
      // proceed with severity from shortage share
    } else if (input.demandSample < GAP_MIN_DEMAND_SAMPLE) {
      return GAP_SEVERITY.INSUFFICIENT_DATA;
    } else if (
      !input.metrics.zeroSupply &&
      input.supplySample < GAP_MIN_SUPPLY_SAMPLE
    ) {
      return GAP_SEVERITY.INSUFFICIENT_DATA;
    }
  }

  if (input.comparability === GAP_COMPARABILITY.UNKNOWN) {
    return GAP_SEVERITY.INSUFFICIENT_DATA;
  }

  if (input.metrics.netGap < 0) {
    return GAP_SEVERITY.SURPLUS;
  }

  if (input.metrics.zeroDemand) {
    return GAP_SEVERITY.INSUFFICIENT_DATA;
  }

  const share =
    input.metrics.gapPercentage === null
      ? 0
      : input.metrics.gapPercentage / 100;

  if (share < GAP_SEVERITY_THRESHOLD.BALANCED) {
    return GAP_SEVERITY.BALANCED;
  }
  if (share < GAP_SEVERITY_THRESHOLD.MODERATE) {
    return GAP_SEVERITY.MODERATE;
  }
  if (share < GAP_SEVERITY_THRESHOLD.HIGH) {
    return GAP_SEVERITY.HIGH;
  }
  return GAP_SEVERITY.SEVERE;
}
