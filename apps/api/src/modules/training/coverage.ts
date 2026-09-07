import type { SkillGapRow } from "../gaps/contract";
import type {
  CurriculumGapRow,
  MarketSkillSignal,
  ProgramAlignmentRow,
  TrainingProgramView,
} from "./contract";
import {
  ALIGNMENT_THRESHOLD,
  CURRICULUM_COVERAGE_STATUS,
  CURRICULUM_GAP_PRIORITY_WEIGHT,
  PROGRAM_ALIGNMENT,
  SEVERITY_NEED_POINTS,
  TRAINING_CONFIDENCE,
  TRAINING_INTERVENTION,
  TRAINING_METHODOLOGY_VERSION,
  TRAINING_MIN_DEMAND_SAMPLE,
  TREND_NEED_POINTS,
  CONFIDENCE_NEED_POINTS,
  type ProgramAlignment,
  type TrainingConfidence,
} from "./policy";

export function buildMarketSignals(
  gaps: readonly SkillGapRow[],
): MarketSkillSignal[] {
  return gaps
    .filter((g) => g.metrics.demandQuantity > 0 || g.metrics.shortageQuantity > 0)
    .map((g) => ({
      skillId: g.skillId,
      canonicalName: g.canonicalName,
      name: g.name,
      demandQuantity: g.metrics.demandQuantity,
      gap: g,
    }))
    .sort((a, b) => {
      if (b.demandQuantity !== a.demandQuantity) {
        return b.demandQuantity - a.demandQuantity;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    });
}

/**
 * Demand-weighted coverage:
 * sum(demand of covered relevant skills) / sum(demand of relevant skills)
 * Never Infinity/NaN — null when denominator is 0.
 */
export function computeDemandWeightedCoverage(input: {
  program: TrainingProgramView;
  market: readonly MarketSkillSignal[];
}): {
  coverage: number | null;
  coveredWeightedDemand: number;
  totalRelevantWeightedDemand: number;
  coveredSkillCount: number;
  relevantSkillCount: number;
} {
  const coveredIds = new Set(input.program.skills.map((s) => s.skillId));
  const relevant = input.market.filter((m) => m.demandQuantity > 0);
  const total = relevant.reduce((s, m) => s + m.demandQuantity, 0);
  const covered = relevant.filter((m) => coveredIds.has(m.skillId));
  const coveredDemand = covered.reduce((s, m) => s + m.demandQuantity, 0);

  return {
    coverage: total > 0 ? Number((coveredDemand / total).toFixed(6)) : null,
    coveredWeightedDemand: Number(coveredDemand.toFixed(6)),
    totalRelevantWeightedDemand: Number(total.toFixed(6)),
    coveredSkillCount: covered.length,
    relevantSkillCount: relevant.length,
  };
}

export function classifyAlignment(
  coverage: number | null,
  relevantSkillCount: number,
): ProgramAlignment {
  if (coverage === null || relevantSkillCount === 0) {
    return PROGRAM_ALIGNMENT.INSUFFICIENT_DATA;
  }
  if (coverage >= ALIGNMENT_THRESHOLD.STRONG) {
    return PROGRAM_ALIGNMENT.STRONG;
  }
  if (coverage >= ALIGNMENT_THRESHOLD.MODERATE) {
    return PROGRAM_ALIGNMENT.MODERATE;
  }
  return PROGRAM_ALIGNMENT.WEAK;
}

export function computeCurriculumGapPriority(input: {
  demandQuantity: number;
  shortageQuantity: number;
  gapSeverity: string | null;
  gapTrend: string | null;
  gapConfidence: string | null;
  maxDemand: number;
  maxShortage: number;
}): number {
  const demand =
    input.maxDemand > 0 ? Math.min(1, input.demandQuantity / input.maxDemand) : 0;
  const gapMagnitude =
    input.maxShortage > 0
      ? Math.min(1, input.shortageQuantity / input.maxShortage)
      : 0;
  const gapSeverity = SEVERITY_NEED_POINTS[input.gapSeverity ?? ""] ?? 0;
  const trend = TREND_NEED_POINTS[input.gapTrend ?? ""] ?? 0.25;
  const confidence = CONFIDENCE_NEED_POINTS[input.gapConfidence ?? ""] ?? 0.1;

  return Number(
    (
      CURRICULUM_GAP_PRIORITY_WEIGHT.demand * demand +
      CURRICULUM_GAP_PRIORITY_WEIGHT.gapMagnitude * gapMagnitude +
      CURRICULUM_GAP_PRIORITY_WEIGHT.gapSeverity * gapSeverity +
      CURRICULUM_GAP_PRIORITY_WEIGHT.trend * trend +
      CURRICULUM_GAP_PRIORITY_WEIGHT.confidence * confidence
    ).toFixed(6),
  );
}

export function analyzeProgramAlignment(input: {
  program: TrainingProgramView;
  market: readonly MarketSkillSignal[];
  period: SkillGapRow["period"];
}): ProgramAlignmentRow {
  const stats = computeDemandWeightedCoverage({
    program: input.program,
    market: input.market,
  });
  const alignment = classifyAlignment(stats.coverage, stats.relevantSkillCount);
  const coveredIds = new Set(input.program.skills.map((s) => s.skillId));

  const highGapMarket = input.market.filter(
    (m) =>
      m.gap &&
      (m.gap.severity === "HIGH" || m.gap.severity === "SEVERE") &&
      m.gap.demandJobCount >= TRAINING_MIN_DEMAND_SAMPLE,
  );
  const highGapSkillsCovered = highGapMarket.filter((m) =>
    coveredIds.has(m.skillId),
  ).length;
  const highGapSkillsMissing = highGapMarket.length - highGapSkillsCovered;

  const maxDemand = Math.max(0, ...input.market.map((m) => m.demandQuantity));
  const maxShortage = Math.max(
    0,
    ...input.market.map((m) => m.gap?.metrics.shortageQuantity ?? 0),
  );

  const curriculumGaps: CurriculumGapRow[] = input.market
    .filter((m) => m.demandQuantity > 0 && !coveredIds.has(m.skillId))
    .map((m): CurriculumGapRow => {
      const priority = computeCurriculumGapPriority({
        demandQuantity: m.demandQuantity,
        shortageQuantity: m.gap?.metrics.shortageQuantity ?? 0,
        gapSeverity: m.gap?.severity ?? null,
        gapTrend: m.gap?.trend.direction ?? null,
        gapConfidence: m.gap?.confidence ?? null,
        maxDemand,
        maxShortage,
      });
      const confidence: TrainingConfidence =
        m.gap?.confidence === "HIGH"
          ? TRAINING_CONFIDENCE.HIGH
          : m.gap?.confidence === "MEDIUM"
            ? TRAINING_CONFIDENCE.MEDIUM
            : m.gap?.confidence === "INSUFFICIENT_DATA"
              ? TRAINING_CONFIDENCE.INSUFFICIENT_DATA
              : TRAINING_CONFIDENCE.LOW;

      return {
        programId: input.program.programId,
        courseName: input.program.courseName,
        curriculumTitle: input.program.curriculumTitle,
        skillId: m.skillId,
        canonicalName: m.canonicalName,
        name: m.name,
        demandQuantity: m.demandQuantity,
        gapSeverity: m.gap?.severity ?? null,
        gapTrend: m.gap?.trend.direction ?? null,
        coverageStatus: CURRICULUM_COVERAGE_STATUS.NOT_COVERED,
        priority,
        confidence,
        intervention: TRAINING_INTERVENTION.CURRICULUM_UPDATE_NEEDED,
        period: input.period,
        evidence: {
          curriculumId: input.program.curriculumId,
          courseId: input.program.courseId,
          gapVersion: m.gap?.gapVersion ?? null,
        },
        notes: [
          "Curriculum gap is program-level — distinct from market training need.",
        ],
        policyVersion: TRAINING_METHODOLOGY_VERSION,
      };
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.demandQuantity !== a.demandQuantity) {
        return b.demandQuantity - a.demandQuantity;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    });

  const confidence: TrainingConfidence =
    stats.relevantSkillCount === 0
      ? TRAINING_CONFIDENCE.INSUFFICIENT_DATA
      : stats.coverage !== null && stats.coverage >= ALIGNMENT_THRESHOLD.STRONG
        ? TRAINING_CONFIDENCE.HIGH
        : TRAINING_CONFIDENCE.MEDIUM;

  return {
    programId: input.program.programId,
    courseName: input.program.courseName,
    curriculumTitle: input.program.curriculumTitle,
    alignment,
    demandWeightedCoverage: stats.coverage,
    coveredWeightedDemand: stats.coveredWeightedDemand,
    totalRelevantWeightedDemand: stats.totalRelevantWeightedDemand,
    coveredSkillCount: stats.coveredSkillCount,
    relevantSkillCount: stats.relevantSkillCount,
    highGapSkillsTotal: highGapMarket.length,
    highGapSkillsCovered,
    highGapSkillsMissing,
    curriculumGaps,
    confidence,
    notes: [
      "Demand-weighted coverage uses Phase 8/9 demand quantities — not skill-count share.",
      "Presence of CurriculumSkill ⇒ FULL coverage; PARTIAL is not inferred.",
    ],
    policyVersion: TRAINING_METHODOLOGY_VERSION,
  };
}
