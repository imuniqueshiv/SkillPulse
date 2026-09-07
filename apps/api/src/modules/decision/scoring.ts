import type { DecisionEvidenceItem, DecisionScoreBreakdown } from "./contract";
import {
  ALIGNMENT_CONCERN_SCORE,
  CAPACITY_CONSTRAINT_SCORE,
  DECISION_SCORE_WEIGHT,
  GAP_SEVERITY_SCORE,
  PRIORITY_SCORE_THRESHOLD,
  DECISION_PRIORITY,
  type DecisionPriority,
} from "./policy";

export function evidence(
  source: DecisionEvidenceItem["source"],
  referenceId: string,
  metric: string,
  value: DecisionEvidenceItem["value"],
  interpretation: string,
): DecisionEvidenceItem {
  return { source, referenceId, metric, value, interpretation };
}

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/**
 * Optional explainable decision score 0–100.
 * Returns null when core evidence is insufficient (no false precision).
 */
export function computeDecisionScore(input: {
  gapSeverity: string | null;
  demandSufficient: boolean;
  capacityStatus: string | null;
  capabilityStatus: string | null;
  alignment: string | null;
  employmentRate: number | null;
  employmentSampleOk: boolean;
  gapTrend: string | null;
}): DecisionScoreBreakdown | null {
  if (!input.gapSeverity || input.gapSeverity === "INSUFFICIENT_DATA") {
    return null;
  }
  if (!input.demandSufficient) {
    return null;
  }

  const gap = GAP_SEVERITY_SCORE[input.gapSeverity] ?? 0;
  const demand = input.demandSufficient ? 80 : 0;
  const capacityKey =
    input.capabilityStatus ?? input.capacityStatus ?? "UNKNOWN";
  const capacity = CAPACITY_CONSTRAINT_SCORE[capacityKey] ?? 40;
  const alignment = input.alignment
    ? (ALIGNMENT_CONCERN_SCORE[input.alignment] ?? 30)
    : 30;

  let employment = 40;
  if (input.employmentSampleOk && input.employmentRate !== null) {
    // Higher concern when employment is weaker
    employment = clamp100((1 - input.employmentRate) * 100);
  }

  let trend = 40;
  if (input.gapTrend === "WIDENING") trend = 90;
  else if (input.gapTrend === "STABLE") trend = 45;
  else if (input.gapTrend === "NARROWING") trend = 20;
  else if (input.gapTrend === "INSUFFICIENT_DATA") trend = 35;

  // Capacity/alignment concern blended into capacity component when alignment weak
  const capacityBlend = clamp100(
    capacity * 0.7 + (input.alignment === "WEAK" ? alignment * 0.3 : 0),
  );

  const score = clamp100(
    DECISION_SCORE_WEIGHT.gap * gap +
      DECISION_SCORE_WEIGHT.demand * demand +
      DECISION_SCORE_WEIGHT.capacity * capacityBlend +
      DECISION_SCORE_WEIGHT.employment * employment +
      DECISION_SCORE_WEIGHT.trend * trend,
  );

  return {
    score: Number(score.toFixed(2)),
    components: {
      gap: Number(gap.toFixed(2)),
      demand: Number(demand.toFixed(2)),
      capacity: Number(capacityBlend.toFixed(2)),
      employment: Number(employment.toFixed(2)),
      trend: Number(trend.toFixed(2)),
    },
    note: "Optional decision-support score — engineering weights, not validated government urgency.",
  };
}

export function priorityFromScore(
  score: DecisionScoreBreakdown | null,
  fallback: DecisionPriority,
): DecisionPriority {
  if (!score) return fallback;
  if (score.score >= PRIORITY_SCORE_THRESHOLD.CRITICAL) {
    return DECISION_PRIORITY.CRITICAL;
  }
  if (score.score >= PRIORITY_SCORE_THRESHOLD.HIGH) {
    return DECISION_PRIORITY.HIGH;
  }
  if (score.score >= PRIORITY_SCORE_THRESHOLD.MEDIUM) {
    return DECISION_PRIORITY.MEDIUM;
  }
  return DECISION_PRIORITY.LOW;
}

export function degradeConfidence(
  parts: Array<string | null | undefined>,
): import("./policy").DecisionConfidence {
  const order = [
    "INSUFFICIENT_DATA",
    "UNKNOWN",
    "LOW",
    "MEDIUM",
    "HIGH",
  ] as const;
  let worst = 4;
  let any = false;
  for (const p of parts) {
    if (!p) continue;
    any = true;
    const mapped =
      p === "UNKNOWN" ? "INSUFFICIENT_DATA" : (p as (typeof order)[number]);
    const idx = order.indexOf(mapped);
    if (idx >= 0 && idx < worst) worst = idx;
  }
  if (!any) return "INSUFFICIENT_DATA";
  const v = order[worst]!;
  if (v === "UNKNOWN") return "INSUFFICIENT_DATA";
  return v as import("./policy").DecisionConfidence;
}
