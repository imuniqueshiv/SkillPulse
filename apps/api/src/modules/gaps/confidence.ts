import type { GapComparability, GapConfidence, GapSeverity } from "./policy";
import {
  GAP_COMPARABILITY,
  GAP_CONFIDENCE,
  GAP_MIN_DEMAND_SAMPLE,
  GAP_MIN_SUPPLY_SAMPLE,
  GAP_SEVERITY,
} from "./policy";

/**
 * Deterministic confidence from sample sizes and comparability.
 * Never invents supply quality — missing supply confidence stays LOW ceiling.
 */
export function classifyConfidence(input: {
  demandSample: number;
  supplySample: number;
  comparability: GapComparability;
  severity: GapSeverity;
  supplyConfidence: GapConfidence | null;
  demandCautionShare: number;
}): GapConfidence {
  if (input.severity === GAP_SEVERITY.INSUFFICIENT_DATA) {
    return GAP_CONFIDENCE.INSUFFICIENT_DATA;
  }
  if (input.comparability === GAP_COMPARABILITY.UNKNOWN) {
    return GAP_CONFIDENCE.LOW;
  }
  if (
    input.demandSample < GAP_MIN_DEMAND_SAMPLE ||
    (input.supplySample < GAP_MIN_SUPPLY_SAMPLE && input.supplySample > 0)
  ) {
    return GAP_CONFIDENCE.INSUFFICIENT_DATA;
  }

  let level: GapConfidence = GAP_CONFIDENCE.HIGH;

  if (input.comparability === GAP_COMPARABILITY.PROXY) {
    level = GAP_CONFIDENCE.MEDIUM;
  }
  if (input.demandCautionShare > 0.5) {
    level = downgrade(level);
  }
  if (input.supplyConfidence === GAP_CONFIDENCE.LOW) {
    level = downgrade(level);
  }
  if (input.supplyConfidence === GAP_CONFIDENCE.INSUFFICIENT_DATA) {
    level = GAP_CONFIDENCE.LOW;
  }
  if (input.supplySample === 0 && input.demandSample >= GAP_MIN_DEMAND_SAMPLE) {
    // Zero supply is an explicit observation pattern; keep at most MEDIUM.
    level = level === GAP_CONFIDENCE.HIGH ? GAP_CONFIDENCE.MEDIUM : level;
  }

  return level;
}

function downgrade(level: GapConfidence): GapConfidence {
  if (level === GAP_CONFIDENCE.HIGH) {
    return GAP_CONFIDENCE.MEDIUM;
  }
  if (level === GAP_CONFIDENCE.MEDIUM) {
    return GAP_CONFIDENCE.LOW;
  }
  return level;
}
