import type { ProgramAlignmentRow } from "../training/contract";
import type {
  CapacityAggregateResult,
  ProgramRelevanceScore,
  ProviderCapabilityScore,
} from "./contract";
import {
  ALIGNMENT_SCORE_POINTS,
  CAPACITY_SCORE_POINTS,
  CONFIDENCE_SCORE_POINTS,
  HIGH_GAP_SEVERITIES,
  PROGRAM_RELEVANCE_LEVEL,
  PROGRAM_RELEVANCE_THRESHOLD,
  PROGRAM_RELEVANCE_WEIGHT,
  PROVIDER_CAPABILITY_WEIGHT,
  SEVERITY_SCORE_POINTS,
  type InstituteConfidence,
  type ProgramRelevanceLevel,
} from "./policy";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function round6(n: number): number {
  return Number(n.toFixed(6));
}

export function classifyProgramRelevanceLevel(
  score: number,
  confidence: InstituteConfidence,
): ProgramRelevanceLevel {
  if (confidence === "INSUFFICIENT_DATA") {
    return PROGRAM_RELEVANCE_LEVEL.INSUFFICIENT_DATA;
  }
  if (score >= PROGRAM_RELEVANCE_THRESHOLD.HIGH) {
    return PROGRAM_RELEVANCE_LEVEL.HIGH_RELEVANCE;
  }
  if (score >= PROGRAM_RELEVANCE_THRESHOLD.MODERATE) {
    return PROGRAM_RELEVANCE_LEVEL.MODERATE_RELEVANCE;
  }
  return PROGRAM_RELEVANCE_LEVEL.LOW_RELEVANCE;
}

export function computeProgramRelevance(input: {
  coveredHighGapCount: number;
  totalHighGapCount: number;
  maxCoveredSeverity: string | null;
  alignment: ProgramAlignmentRow | null;
  capacity: CapacityAggregateResult;
  confidence: InstituteConfidence;
}): ProgramRelevanceScore {
  const gapSeverity = clamp01(
    input.maxCoveredSeverity
      ? (SEVERITY_SCORE_POINTS[input.maxCoveredSeverity] ?? 0)
      : 0,
  );
  const skillCoverage =
    input.totalHighGapCount > 0
      ? clamp01(input.coveredHighGapCount / input.totalHighGapCount)
      : input.coveredHighGapCount > 0
        ? 0.5
        : 0;
  const curriculumAlignment = clamp01(
    input.alignment
      ? (ALIGNMENT_SCORE_POINTS[input.alignment.alignment] ?? 0.1)
      : 0.1,
  );
  const capacity = clamp01(
    CAPACITY_SCORE_POINTS[input.capacity.status] ?? 0.2,
  );
  const confidence = clamp01(
    CONFIDENCE_SCORE_POINTS[input.confidence] ?? 0.1,
  );

  const score = round6(
    PROGRAM_RELEVANCE_WEIGHT.gapSeverity * gapSeverity +
      PROGRAM_RELEVANCE_WEIGHT.skillCoverage * skillCoverage +
      PROGRAM_RELEVANCE_WEIGHT.curriculumAlignment * curriculumAlignment +
      PROGRAM_RELEVANCE_WEIGHT.capacity * capacity +
      PROGRAM_RELEVANCE_WEIGHT.confidence * confidence,
  );

  return {
    score,
    level: classifyProgramRelevanceLevel(score, input.confidence),
    components: {
      gapSeverity: round6(gapSeverity),
      skillCoverage: round6(skillCoverage),
      curriculumAlignment: round6(curriculumAlignment),
      capacity: round6(capacity),
      confidence: round6(confidence),
    },
    note: "Decision-support program relevance — not a marketplace rating.",
  };
}

export function computeProviderCapabilityScore(input: {
  highGapCovered: number;
  highGapTotal: number;
  skillsCovered: number;
  marketSkillCount: number;
  bestAlignment: string | null;
  capacity: CapacityAggregateResult;
  confidence: InstituteConfidence;
}): ProviderCapabilityScore {
  const highGapCoverage =
    input.highGapTotal > 0
      ? clamp01(input.highGapCovered / input.highGapTotal)
      : 0;
  const skillCoverage =
    input.marketSkillCount > 0
      ? clamp01(input.skillsCovered / input.marketSkillCount)
      : 0;
  const alignment = clamp01(
    input.bestAlignment
      ? (ALIGNMENT_SCORE_POINTS[input.bestAlignment] ?? 0.1)
      : 0.1,
  );
  const capacity = clamp01(
    CAPACITY_SCORE_POINTS[input.capacity.status] ?? 0.2,
  );
  const confidence = clamp01(
    CONFIDENCE_SCORE_POINTS[input.confidence] ?? 0.1,
  );

  const score = round6(
    PROVIDER_CAPABILITY_WEIGHT.highGapCoverage * highGapCoverage +
      PROVIDER_CAPABILITY_WEIGHT.skillCoverage * skillCoverage +
      PROVIDER_CAPABILITY_WEIGHT.alignment * alignment +
      PROVIDER_CAPABILITY_WEIGHT.capacity * capacity +
      PROVIDER_CAPABILITY_WEIGHT.confidence * confidence,
  );

  return {
    score,
    components: {
      highGapCoverage: round6(highGapCoverage),
      skillCoverage: round6(skillCoverage),
      alignment: round6(alignment),
      capacity: round6(capacity),
      confidence: round6(confidence),
    },
    note: "Provider Capability Score — not a best-institute ranking.",
  };
}

export function isHighGapSeverity(severity: string): boolean {
  return HIGH_GAP_SEVERITIES.has(severity);
}

export function degradeConfidence(
  parts: Array<InstituteConfidence | null | undefined>,
): InstituteConfidence {
  const order = [
    "INSUFFICIENT_DATA",
    "LOW",
    "MEDIUM",
    "HIGH",
  ] as const;
  let worstIdx = order.length - 1;
  let any = false;
  for (const p of parts) {
    if (!p) continue;
    any = true;
    const idx = order.indexOf(p as (typeof order)[number]);
    if (idx >= 0 && idx < worstIdx) worstIdx = idx;
  }
  if (!any) return "INSUFFICIENT_DATA";
  return order[worstIdx]!;
}
