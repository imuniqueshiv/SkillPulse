import type { SkillGapSummary } from "../gaps/contract";
import { AppError } from "../../utils/errors";
import type {
  TrainingIntelligenceInput,
  TrainingIntelligenceSummary,
  TrainingProgramView,
} from "./contract";
import { analyzeProgramAlignment, buildMarketSignals } from "./coverage";
import { buildTrainingNeeds } from "./need";
import {
  DEFAULT_TRAINING_RANK_LIMIT,
  MAX_TRAINING_RANK_LIMIT,
  TRAINING_METHODOLOGY_VERSION,
} from "./policy";
import { loadTrainingPrograms } from "./programs";
import { SUPPLY_TYPE } from "../gaps/policy";
import type { SupplyObservation } from "../gaps/contract";

/**
 * Extract TRAINING_CAPACITY quantities by skill from Phase 9 supply observations.
 * Never converts other supply types into capacity.
 */
export function extractTrainingCapacity(
  observations: readonly SupplyObservation[],
): Record<string, number> {
  const bySkill: Record<string, number> = {};
  const seen = new Set<string>();
  for (const obs of observations) {
    if (obs.supplyType !== SUPPLY_TYPE.TRAINING_CAPACITY) {
      continue;
    }
    if (!obs.skillId || !obs.resolved) {
      continue;
    }
    if (seen.has(obs.observationId)) {
      continue;
    }
    seen.add(obs.observationId);
    bySkill[obs.skillId] = (bySkill[obs.skillId] ?? 0) + obs.quantity;
  }
  return bySkill;
}

/**
 * Phase 10 training & curriculum intelligence (training-v1).
 * Consumes Phase 9 SkillGapSummary + Curriculum/Course mappings.
 * Does not recompute demand or skill gaps.
 */
export function summarizeTrainingIntelligence(
  input: TrainingIntelligenceInput,
): TrainingIntelligenceSummary {
  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_TRAINING_RANK_LIMIT),
    MAX_TRAINING_RANK_LIMIT,
  );

  if (!input.gapSummary?.skills) {
    throw new AppError(400, "gapSummary is required");
  }
  if (!Array.isArray(input.programs)) {
    throw new AppError(400, "programs must be an array");
  }

  const trainingNeeds = buildTrainingNeeds({
    gaps: input.gapSummary.skills,
    programs: input.programs,
    trainingCapacityBySkill: input.trainingCapacityBySkill,
    rankLimit,
  });

  const market = buildMarketSignals(input.gapSummary.skills);
  const period = input.gapSummary.period;

  const programs = input.programs
    .map((program) =>
      analyzeProgramAlignment({ program, market, period }),
    )
    .sort((a, b) => {
      const ac = a.demandWeightedCoverage ?? -1;
      const bc = b.demandWeightedCoverage ?? -1;
      if (bc !== ac) return bc - ac;
      return a.courseName.localeCompare(b.courseName);
    })
    .slice(0, rankLimit);

  const curriculumGaps = programs
    .flatMap((p) => p.curriculumGaps)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.demandQuantity !== a.demandQuantity) {
        return b.demandQuantity - a.demandQuantity;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    })
    .slice(0, rankLimit);

  const buckets = {
    highNeed: trainingNeeds.filter((n) => n.trainingNeed === "HIGH").length,
    moderateNeed: trainingNeeds.filter((n) => n.trainingNeed === "MODERATE").length,
    lowNeed: trainingNeeds.filter((n) => n.trainingNeed === "LOW").length,
    insufficientNeed: trainingNeeds.filter(
      (n) => n.trainingNeed === "INSUFFICIENT_DATA",
    ).length,
    capacityGaps: trainingNeeds.filter((n) => n.intervention === "CAPACITY_GAP")
      .length,
    strongAlignment: programs.filter((p) => p.alignment === "STRONG").length,
    moderateAlignment: programs.filter((p) => p.alignment === "MODERATE").length,
    weakAlignment: programs.filter((p) => p.alignment === "WEAK").length,
    insufficientAlignment: programs.filter(
      (p) => p.alignment === "INSUFFICIENT_DATA",
    ).length,
    curriculumGapCount: curriculumGaps.length,
  };

  return {
    trainingVersion: TRAINING_METHODOLOGY_VERSION,
    gapVersion: input.gapSummary.gapVersion,
    demandVersion: input.gapSummary.demandVersion,
    period,
    trainingNeeds,
    programs,
    curriculumGaps,
    buckets,
    topTrainingNeeds: trainingNeeds
      .filter(
        (n) =>
          n.trainingNeed === "HIGH" || n.trainingNeed === "MODERATE",
      )
      .slice(0, Math.min(10, rankLimit)),
    topCurriculumGaps: curriculumGaps.slice(0, Math.min(10, rankLimit)),
    limitations: [
      "Phase 10 is analytical only — not learner/course recommendations or funding decisions.",
      "TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED.",
      "Training need (market) ≠ curriculum gap (program).",
      "Curriculum coverage uses CurriculumSkill presence only — no title/text inference.",
      "Synthetic or demo programs are not real labour-market or training statistics.",
    ],
    notes: [
      "training-v1 consumes Phase 9 gap-v1 and Phase 8 demand-v1 without recomputation.",
      ...input.gapSummary.notes.slice(0, 2),
    ],
  };
}

/**
 * Convenience: load DB programs + summarize from an existing gap summary.
 */
export async function summarizeTrainingIntelligenceFromDb(input: {
  gapSummary: SkillGapSummary;
  supplyObservations?: readonly SupplyObservation[];
  courseIds?: string[];
  includeDemo?: boolean;
  rankLimit?: number;
}): Promise<TrainingIntelligenceSummary> {
  const programs = await loadTrainingPrograms({
    courseIds: input.courseIds,
    includeDemo: input.includeDemo ?? true,
  });
  const trainingCapacityBySkill = input.supplyObservations
    ? extractTrainingCapacity(input.supplyObservations)
    : undefined;

  return summarizeTrainingIntelligence({
    gapSummary: input.gapSummary,
    programs,
    trainingCapacityBySkill,
    rankLimit: input.rankLimit,
  });
}

export type { TrainingProgramView };
