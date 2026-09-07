/**
 * Centralized training-v1 policy.
 * Decision-support parameters — NOT scientifically calibrated.
 */
export const TRAINING_METHODOLOGY_VERSION = "training-v1";

export const TRAINING_NEED_LEVEL = {
  HIGH: "HIGH",
  MODERATE: "MODERATE",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type TrainingNeedLevel =
  (typeof TRAINING_NEED_LEVEL)[keyof typeof TRAINING_NEED_LEVEL];

export const TRAINING_CAPACITY_STATUS = {
  AVAILABLE: "AVAILABLE",
  INSUFFICIENT: "INSUFFICIENT",
  UNAVAILABLE: "UNAVAILABLE",
  UNKNOWN: "UNKNOWN",
} as const;

export type TrainingCapacityStatus =
  (typeof TRAINING_CAPACITY_STATUS)[keyof typeof TRAINING_CAPACITY_STATUS];

export const CURRICULUM_COVERAGE_STATUS = {
  FULL: "FULL",
  /** Reserved — only when source evidence supports partial coverage. */
  PARTIAL: "PARTIAL",
  UNKNOWN: "UNKNOWN",
  NOT_COVERED: "NOT_COVERED",
} as const;

export type CurriculumCoverageStatus =
  (typeof CURRICULUM_COVERAGE_STATUS)[keyof typeof CURRICULUM_COVERAGE_STATUS];

export const PROGRAM_ALIGNMENT = {
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type ProgramAlignment =
  (typeof PROGRAM_ALIGNMENT)[keyof typeof PROGRAM_ALIGNMENT];

export const TRAINING_INTERVENTION = {
  SKILL_TRAINING_NEED: "SKILL_TRAINING_NEED",
  CURRICULUM_UPDATE_NEEDED: "CURRICULUM_UPDATE_NEEDED",
  CAPACITY_GAP: "CAPACITY_GAP",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type TrainingIntervention =
  (typeof TRAINING_INTERVENTION)[keyof typeof TRAINING_INTERVENTION];

export const TRAINING_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type TrainingConfidence =
  (typeof TRAINING_CONFIDENCE)[keyof typeof TRAINING_CONFIDENCE];

/** Demand-weighted coverage thresholds for alignment. */
export const ALIGNMENT_THRESHOLD = {
  STRONG: 0.75,
  MODERATE: 0.45,
} as const;

/** Capacity vs shortage: capacity >= shortage * ratio → AVAILABLE. */
export const CAPACITY_SUFFICIENCY_RATIO = 1.0;

export const TRAINING_NEED_PRIORITY_WEIGHT = {
  gapSeverity: 0.35,
  gapMagnitude: 0.25,
  demandMagnitude: 0.15,
  trend: 0.1,
  confidence: 0.1,
  capacity: 0.05,
} as const;

export const CURRICULUM_GAP_PRIORITY_WEIGHT = {
  demand: 0.3,
  gapMagnitude: 0.3,
  gapSeverity: 0.25,
  trend: 0.1,
  confidence: 0.05,
} as const;

export const DEFAULT_TRAINING_RANK_LIMIT = 20;
export const MAX_TRAINING_RANK_LIMIT = 50;
export const TRAINING_MIN_DEMAND_SAMPLE = 3;

export const SEVERITY_NEED_POINTS: Record<string, number> = {
  SEVERE: 1,
  HIGH: 0.85,
  MODERATE: 0.55,
  BALANCED: 0.15,
  SURPLUS: 0,
  INSUFFICIENT_DATA: 0,
};

export const TREND_NEED_POINTS: Record<string, number> = {
  WIDENING: 1,
  STABLE: 0.4,
  NARROWING: 0.15,
  INSUFFICIENT_DATA: 0.25,
};

export const CONFIDENCE_NEED_POINTS: Record<string, number> = {
  HIGH: 1,
  MEDIUM: 0.65,
  LOW: 0.35,
  INSUFFICIENT_DATA: 0.1,
};
