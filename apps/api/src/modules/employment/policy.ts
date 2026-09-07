/**
 * Centralized employment-v1 policy.
 * Decision-support parameters — NOT scientifically calibrated.
 * Observational only — not prediction or ranking.
 */
export const EMPLOYMENT_METHODOLOGY_VERSION = "employment-v1";

export const OUTCOME_TYPE = {
  TRAINED: "TRAINED",
  CERTIFIED: "CERTIFIED",
  PLACED: "PLACED",
  EMPLOYED: "EMPLOYED",
} as const;

export type OutcomeType = (typeof OUTCOME_TYPE)[keyof typeof OUTCOME_TYPE];

export const OUTCOME_STATUS = {
  CONFIRMED: "CONFIRMED",
  REPORTED: "REPORTED",
  UNVERIFIED: "UNVERIFIED",
  UNKNOWN: "UNKNOWN",
} as const;

export type OutcomeStatus =
  (typeof OUTCOME_STATUS)[keyof typeof OUTCOME_STATUS];

export const EMPLOYMENT_EVIDENCE_TYPE = {
  OFFICIAL_RECORD: "OFFICIAL_RECORD",
  INSTITUTE_REPORT: "INSTITUTE_REPORT",
  EMPLOYER_REPORT: "EMPLOYER_REPORT",
  LEARNER_REPORT: "LEARNER_REPORT",
  OTHER: "OTHER",
} as const;

export type EmploymentEvidenceType =
  (typeof EMPLOYMENT_EVIDENCE_TYPE)[keyof typeof EMPLOYMENT_EVIDENCE_TYPE];

export const EMPLOYMENT_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN",
} as const;

export type EmploymentConfidence =
  (typeof EMPLOYMENT_CONFIDENCE)[keyof typeof EMPLOYMENT_CONFIDENCE];

export const SKILL_UTILIZATION_LEVEL = {
  FULL: "FULL",
  PARTIAL: "PARTIAL",
  LOW: "LOW",
  NONE: "NONE",
  UNKNOWN: "UNKNOWN",
} as const;

export type SkillUtilizationLevel =
  (typeof SKILL_UTILIZATION_LEVEL)[keyof typeof SKILL_UTILIZATION_LEVEL];

export const PROGRAM_EMPLOYMENT_ALIGNMENT = {
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type ProgramEmploymentAlignment =
  (typeof PROGRAM_EMPLOYMENT_ALIGNMENT)[keyof typeof PROGRAM_EMPLOYMENT_ALIGNMENT];

export const EMPLOYMENT_TREND_DIRECTION = {
  RISING: "RISING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type EmploymentTrendDirection =
  (typeof EMPLOYMENT_TREND_DIRECTION)[keyof typeof EMPLOYMENT_TREND_DIRECTION];

/** Skill utilization ratio thresholds. */
export const SKILL_UTILIZATION_THRESHOLD = {
  FULL: 0.75,
  PARTIAL: 0.4,
} as const;

/** Program employment alignment (matched / trained skills). */
export const EMPLOYMENT_ALIGNMENT_THRESHOLD = {
  STRONG: 0.75,
  MODERATE: 0.4,
} as const;

/** Reuse Phase 8-style trend thresholds. */
export const EMPLOYMENT_TREND_THRESHOLD = {
  RISING: 0.1,
  DECLINING: -0.1,
} as const;

export const EMPLOYMENT_MIN_TREND_SAMPLE = 3;
export const EMPLOYMENT_MIN_RATE_DENOMINATOR = 1;

/** Outcome type precedence for conflict resolution (higher = stronger). */
export const OUTCOME_TYPE_PRECEDENCE: Record<string, number> = {
  EMPLOYED: 4,
  PLACED: 3,
  CERTIFIED: 2,
  TRAINED: 1,
};

/** Outcome status precedence (higher = stronger verification). */
export const OUTCOME_STATUS_PRECEDENCE: Record<string, number> = {
  CONFIRMED: 4,
  REPORTED: 3,
  UNVERIFIED: 2,
  UNKNOWN: 1,
};

/** Evidence type quality points for confidence. */
export const EVIDENCE_QUALITY_POINTS: Record<string, number> = {
  OFFICIAL_RECORD: 1,
  EMPLOYER_REPORT: 0.75,
  INSTITUTE_REPORT: 0.55,
  LEARNER_REPORT: 0.35,
  OTHER: 0.2,
};

export const DEFAULT_EMPLOYMENT_RANK_LIMIT = 20;
export const MAX_EMPLOYMENT_RANK_LIMIT = 50;
