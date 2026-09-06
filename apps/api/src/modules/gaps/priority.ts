import type { GapPriorityScore } from "./contract";
import type { GapConfidence, GapSeverity, GapTrendDirection } from "./policy";
import {
  CONFIDENCE_PRIORITY_POINTS,
  GAP_PRIORITY_WEIGHT,
  SEVERITY_PRIORITY_POINTS,
  TREND_PRIORITY_POINTS,
} from "./policy";

/**
 * Decision-support ranking only — not an objective economic truth.
 */
export function computePriorityScore(input: {
  shortageQuantity: number;
  demandQuantity: number;
  severity: GapSeverity;
  confidence: GapConfidence;
  trend: GapTrendDirection;
  /** Normalization denominator for magnitude components (max shortage/demand in set). */
  maxShortage: number;
  maxDemand: number;
}): GapPriorityScore {
  const shortageMagnitude =
    input.maxShortage > 0
      ? Math.min(1, input.shortageQuantity / input.maxShortage)
      : 0;
  const demandMagnitude =
    input.maxDemand > 0 ? Math.min(1, input.demandQuantity / input.maxDemand) : 0;
  const severity = SEVERITY_PRIORITY_POINTS[input.severity];
  const confidence = CONFIDENCE_PRIORITY_POINTS[input.confidence];
  const trend = TREND_PRIORITY_POINTS[input.trend];

  const score = Number(
    (
      GAP_PRIORITY_WEIGHT.shortageMagnitude * shortageMagnitude +
      GAP_PRIORITY_WEIGHT.demandMagnitude * demandMagnitude +
      GAP_PRIORITY_WEIGHT.severity * severity +
      GAP_PRIORITY_WEIGHT.confidence * confidence +
      GAP_PRIORITY_WEIGHT.trend * trend
    ).toFixed(6),
  );

  return {
    score,
    components: {
      shortageMagnitude: Number(shortageMagnitude.toFixed(6)),
      demandMagnitude: Number(demandMagnitude.toFixed(6)),
      severity,
      confidence,
      trend,
    },
    note: "gap-v1 decision-support ranking — not an official labour-market priority.",
  };
}

export function compareGapRows(
  a: { priority: { score: number }; metrics: { shortageQuantity: number }; canonicalName: string },
  b: { priority: { score: number }; metrics: { shortageQuantity: number }; canonicalName: string },
): number {
  if (b.priority.score !== a.priority.score) {
    return b.priority.score - a.priority.score;
  }
  if (b.metrics.shortageQuantity !== a.metrics.shortageQuantity) {
    return b.metrics.shortageQuantity - a.metrics.shortageQuantity;
  }
  return a.canonicalName.localeCompare(b.canonicalName);
}
