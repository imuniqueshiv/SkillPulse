import type { SkillGapRow } from "../gaps/contract";
import type { TrainingCapacitySignal, TrainingNeedRow } from "./contract";
import {
  CAPACITY_SUFFICIENCY_RATIO,
  CONFIDENCE_NEED_POINTS,
  SEVERITY_NEED_POINTS,
  TRAINING_CAPACITY_STATUS,
  TRAINING_CONFIDENCE,
  TRAINING_INTERVENTION,
  TRAINING_METHODOLOGY_VERSION,
  TRAINING_MIN_DEMAND_SAMPLE,
  TRAINING_NEED_LEVEL,
  TRAINING_NEED_PRIORITY_WEIGHT,
  TREND_NEED_POINTS,
  type TrainingCapacityStatus,
  type TrainingConfidence,
  type TrainingNeedLevel,
} from "./policy";
import type { TrainingProgramView } from "./contract";
import { programsCoveringSkill } from "./programs";

export function classifyTrainingCapacity(input: {
  capacityQuantity: number | null | undefined;
  shortageQuantity: number;
  hasCapacityObservations: boolean;
}): Omit<TrainingCapacitySignal, "skillId"> {
  if (
    !input.hasCapacityObservations ||
    input.capacityQuantity === null ||
    input.capacityQuantity === undefined
  ) {
    return {
      quantity: null,
      status: TRAINING_CAPACITY_STATUS.UNKNOWN,
      observationCount: 0,
    };
  }
  const quantity = Math.max(0, input.capacityQuantity);
  if (quantity <= 0) {
    return {
      quantity: 0,
      status: TRAINING_CAPACITY_STATUS.UNAVAILABLE,
      observationCount: 1,
    };
  }
  if (input.shortageQuantity <= 0) {
    return {
      quantity,
      status: TRAINING_CAPACITY_STATUS.AVAILABLE,
      observationCount: 1,
    };
  }
  if (quantity >= input.shortageQuantity * CAPACITY_SUFFICIENCY_RATIO) {
    return {
      quantity,
      status: TRAINING_CAPACITY_STATUS.AVAILABLE,
      observationCount: 1,
    };
  }
  return {
    quantity,
    status: TRAINING_CAPACITY_STATUS.INSUFFICIENT,
    observationCount: 1,
  };
}

export function classifyTrainingNeed(input: {
  gap: SkillGapRow;
  capacityStatus: TrainingCapacityStatus;
}): TrainingNeedLevel {
  if (
    input.gap.severity === "INSUFFICIENT_DATA" ||
    input.gap.confidence === "INSUFFICIENT_DATA" ||
    input.gap.demandJobCount < TRAINING_MIN_DEMAND_SAMPLE
  ) {
    return TRAINING_NEED_LEVEL.INSUFFICIENT_DATA;
  }
  if (input.gap.severity === "SURPLUS" || input.gap.severity === "BALANCED") {
    return TRAINING_NEED_LEVEL.LOW;
  }
  if (input.gap.severity === "SEVERE" || input.gap.severity === "HIGH") {
    return TRAINING_NEED_LEVEL.HIGH;
  }
  if (input.gap.severity === "MODERATE") {
    return TRAINING_NEED_LEVEL.MODERATE;
  }
  return TRAINING_NEED_LEVEL.INSUFFICIENT_DATA;
}

export function classifyTrainingConfidence(input: {
  gapConfidence: string;
  capacityStatus: TrainingCapacityStatus;
  programsCovering: number;
}): TrainingConfidence {
  if (input.gapConfidence === "INSUFFICIENT_DATA") {
    return TRAINING_CONFIDENCE.INSUFFICIENT_DATA;
  }
  let level: TrainingConfidence =
    input.gapConfidence === "HIGH"
      ? TRAINING_CONFIDENCE.HIGH
      : input.gapConfidence === "MEDIUM"
        ? TRAINING_CONFIDENCE.MEDIUM
        : TRAINING_CONFIDENCE.LOW;

  if (input.capacityStatus === TRAINING_CAPACITY_STATUS.UNKNOWN) {
    level = downgrade(level);
  }
  return level;
}

function downgrade(level: TrainingConfidence): TrainingConfidence {
  if (level === TRAINING_CONFIDENCE.HIGH) return TRAINING_CONFIDENCE.MEDIUM;
  if (level === TRAINING_CONFIDENCE.MEDIUM) return TRAINING_CONFIDENCE.LOW;
  return level;
}

export function computeTrainingNeedPriority(input: {
  gap: SkillGapRow;
  capacityStatus: TrainingCapacityStatus;
  maxShortage: number;
  maxDemand: number;
}): TrainingNeedRow["priority"] {
  const gapSeverity = SEVERITY_NEED_POINTS[input.gap.severity] ?? 0;
  const gapMagnitude =
    input.maxShortage > 0
      ? Math.min(1, input.gap.metrics.shortageQuantity / input.maxShortage)
      : 0;
  const demandMagnitude =
    input.maxDemand > 0
      ? Math.min(1, input.gap.metrics.demandQuantity / input.maxDemand)
      : 0;
  const trend = TREND_NEED_POINTS[input.gap.trend.direction] ?? 0.25;
  const confidence = CONFIDENCE_NEED_POINTS[input.gap.confidence] ?? 0.1;
  const capacity =
    input.capacityStatus === TRAINING_CAPACITY_STATUS.INSUFFICIENT
      ? 1
      : input.capacityStatus === TRAINING_CAPACITY_STATUS.UNAVAILABLE
        ? 0.85
        : input.capacityStatus === TRAINING_CAPACITY_STATUS.UNKNOWN
          ? 0.4
          : 0.1;

  const score = Number(
    (
      TRAINING_NEED_PRIORITY_WEIGHT.gapSeverity * gapSeverity +
      TRAINING_NEED_PRIORITY_WEIGHT.gapMagnitude * gapMagnitude +
      TRAINING_NEED_PRIORITY_WEIGHT.demandMagnitude * demandMagnitude +
      TRAINING_NEED_PRIORITY_WEIGHT.trend * trend +
      TRAINING_NEED_PRIORITY_WEIGHT.confidence * confidence +
      TRAINING_NEED_PRIORITY_WEIGHT.capacity * capacity
    ).toFixed(6),
  );

  return {
    score,
    components: {
      gapSeverity,
      gapMagnitude: Number(gapMagnitude.toFixed(6)),
      demandMagnitude: Number(demandMagnitude.toFixed(6)),
      trend,
      confidence,
      capacity,
    },
    note: "training-v1 decision-support ranking — not an official training priority.",
  };
}

export function buildTrainingNeeds(input: {
  gaps: readonly SkillGapRow[];
  programs: readonly TrainingProgramView[];
  trainingCapacityBySkill?: Record<string, number>;
  rankLimit: number;
}): TrainingNeedRow[] {
  const maxShortage = Math.max(
    0,
    ...input.gaps.map((g) => g.metrics.shortageQuantity),
  );
  const maxDemand = Math.max(
    0,
    ...input.gaps.map((g) => g.metrics.demandQuantity),
  );

  const rows: TrainingNeedRow[] = input.gaps.map((gap) => {
    const capacityRaw = input.trainingCapacityBySkill?.[gap.skillId];
    const hasCapacity =
      input.trainingCapacityBySkill !== undefined &&
      Object.prototype.hasOwnProperty.call(input.trainingCapacityBySkill, gap.skillId);
    const capacityBase = classifyTrainingCapacity({
      capacityQuantity: hasCapacity ? (capacityRaw ?? 0) : null,
      shortageQuantity: gap.metrics.shortageQuantity,
      hasCapacityObservations: hasCapacity,
    });
    const capacity: TrainingCapacitySignal = {
      skillId: gap.skillId,
      quantity: capacityBase.quantity,
      status: capacityBase.status,
      observationCount: capacityBase.observationCount,
    };

    const trainingNeed = classifyTrainingNeed({
      gap,
      capacityStatus: capacity.status,
    });
    const covering = programsCoveringSkill(input.programs, gap.skillId);
    const confidence = classifyTrainingConfidence({
      gapConfidence: gap.confidence,
      capacityStatus: capacity.status,
      programsCovering: covering.length,
    });

    let intervention: TrainingNeedRow["intervention"] =
      TRAINING_INTERVENTION.INSUFFICIENT_DATA;
    if (trainingNeed === TRAINING_NEED_LEVEL.INSUFFICIENT_DATA) {
      intervention = TRAINING_INTERVENTION.INSUFFICIENT_DATA;
    } else if (
      capacity.status === TRAINING_CAPACITY_STATUS.INSUFFICIENT ||
      capacity.status === TRAINING_CAPACITY_STATUS.UNAVAILABLE
    ) {
      intervention = TRAINING_INTERVENTION.CAPACITY_GAP;
    } else if (
      trainingNeed === TRAINING_NEED_LEVEL.HIGH ||
      trainingNeed === TRAINING_NEED_LEVEL.MODERATE
    ) {
      intervention = TRAINING_INTERVENTION.SKILL_TRAINING_NEED;
    }

    const notes: string[] = [
      "Training need is a market-level signal — not a curriculum gap.",
    ];
    if (covering.length > 0 && trainingNeed === TRAINING_NEED_LEVEL.HIGH) {
      notes.push(
        `${covering.length} program(s) cover this skill; high need may reflect capacity, not missing curriculum.`,
      );
    }
    if (capacity.status === TRAINING_CAPACITY_STATUS.UNKNOWN) {
      notes.push("TRAINING_CAPACITY not provided for this skill.");
    }

    return {
      skillId: gap.skillId,
      canonicalName: gap.canonicalName,
      name: gap.name,
      demandQuantity: gap.metrics.demandQuantity,
      supplyQuantity: gap.metrics.supplyQuantity,
      netGap: gap.metrics.netGap,
      shortageQuantity: gap.metrics.shortageQuantity,
      gapSeverity: gap.severity,
      gapTrend: gap.trend.direction,
      gapConfidence: gap.confidence,
      comparability: gap.comparability,
      trainingNeed,
      capacity,
      priority: computeTrainingNeedPriority({
        gap,
        capacityStatus: capacity.status,
        maxShortage,
        maxDemand,
      }),
      confidence,
      intervention,
      programsCovering: covering.length,
      geography: gap.geography,
      period: gap.period,
      evidence: {
        gapVersion: gap.gapVersion,
        demandVersion: gap.demandVersion,
        supplyObservationIds: gap.evidence.supplyObservationIds,
      },
      notes,
      policyVersion: TRAINING_METHODOLOGY_VERSION,
    };
  });

  rows.sort((a, b) => {
    if (b.priority.score !== a.priority.score) {
      return b.priority.score - a.priority.score;
    }
    if (b.shortageQuantity !== a.shortageQuantity) {
      return b.shortageQuantity - a.shortageQuantity;
    }
    return a.canonicalName.localeCompare(b.canonicalName);
  });

  return rows.slice(0, input.rankLimit);
}
