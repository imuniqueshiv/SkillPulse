/**
 * Centralized decision-v1 policy.
 * Decision-support parameters — NOT scientifically validated government policy.
 * Observational synthesis only — not autonomous action.
 */
export const DECISION_METHODOLOGY_VERSION = "decision-v1";

export const DECISION_CATEGORY = {
  SKILL_SHORTAGE: "SKILL_SHORTAGE",
  TRAINING_CAPACITY: "TRAINING_CAPACITY",
  CURRICULUM_ALIGNMENT: "CURRICULUM_ALIGNMENT",
  EMPLOYMENT_OUTCOME: "EMPLOYMENT_OUTCOME",
  GEOGRAPHIC_MISMATCH: "GEOGRAPHIC_MISMATCH",
  DATA_QUALITY: "DATA_QUALITY",
  PROGRAM_REVIEW: "PROGRAM_REVIEW",
} as const;

export type DecisionCategory =
  (typeof DECISION_CATEGORY)[keyof typeof DECISION_CATEGORY];

export const DECISION_ACTION = {
  REVIEW_CURRICULUM: "REVIEW_CURRICULUM",
  REVIEW_TRAINING_CAPACITY: "REVIEW_TRAINING_CAPACITY",
  REVIEW_PROGRAM: "REVIEW_PROGRAM",
  INVESTIGATE_EMPLOYMENT_OUTCOME: "INVESTIGATE_EMPLOYMENT_OUTCOME",
  INVESTIGATE_GEOGRAPHIC_GAP: "INVESTIGATE_GEOGRAPHIC_GAP",
  IMPROVE_DATA_COLLECTION: "IMPROVE_DATA_COLLECTION",
  MONITOR: "MONITOR",
} as const;

export type DecisionAction =
  (typeof DECISION_ACTION)[keyof typeof DECISION_ACTION];

export const DECISION_PRIORITY = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type DecisionPriority =
  (typeof DECISION_PRIORITY)[keyof typeof DECISION_PRIORITY];

export const DECISION_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type DecisionConfidence =
  (typeof DECISION_CONFIDENCE)[keyof typeof DECISION_CONFIDENCE];

/** Minimum unique learners / samples before employment-based signals. */
export const DECISION_MIN_EMPLOYMENT_SAMPLE = 3;

/** Minimum demand jobs/sample for demand-backed signals. */
export const DECISION_MIN_DEMAND_SAMPLE = 3;

/** Employment rate below this (when known) is considered weak. */
export const WEAK_EMPLOYMENT_RATE_THRESHOLD = 0.35;

/** Strong employment rate — healthy case should not invent negative signals. */
export const STRONG_EMPLOYMENT_RATE_THRESHOLD = 0.6;

/** Weighted demand above this (relative or absolute in eval) treated as strong when jobCount also sufficient. */
export const STRONG_DEMAND_WEIGHTED_MIN = 10;

/**
 * Optional decision score weights (sum = 1).
 * Engineering/policy choices — NOT empirically validated.
 */
export const DECISION_SCORE_WEIGHT = {
  gap: 0.3,
  demand: 0.25,
  capacity: 0.2,
  employment: 0.15,
  trend: 0.1,
} as const;

export const GAP_SEVERITY_SCORE: Record<string, number> = {
  SEVERE: 100,
  HIGH: 80,
  MODERATE: 50,
  BALANCED: 15,
  SURPLUS: 0,
  INSUFFICIENT_DATA: 0,
};

export const CAPACITY_CONSTRAINT_SCORE: Record<string, number> = {
  INSUFFICIENT: 90,
  UNAVAILABLE: 85,
  UNKNOWN: 40,
  AVAILABLE: 10,
  MISSING: 95,
  LIMITED: 70,
  ADEQUATE: 10,
  INSUFFICIENT_DATA: 40,
};

export const ALIGNMENT_CONCERN_SCORE: Record<string, number> = {
  WEAK: 85,
  MODERATE: 40,
  STRONG: 10,
  INSUFFICIENT_DATA: 30,
};

export const DEFAULT_DECISION_RANK_LIMIT = 50;
export const MAX_DECISION_RANK_LIMIT = 100;

/** Priority from optional score bands — only when score is computed. */
export const PRIORITY_SCORE_THRESHOLD = {
  CRITICAL: 85,
  HIGH: 70,
  MEDIUM: 45,
} as const;
