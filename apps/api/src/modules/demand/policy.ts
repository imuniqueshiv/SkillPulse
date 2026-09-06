import {
  QUALITY_ELIGIBILITY,
  type QualityEligibility,
} from "../quality/contract";
import {
  SKILL_REQUIREMENT_LEVEL,
  type SkillRequirementLevel,
} from "../intelligence/contract";

/**
 * Centralized demand-v1 policy.
 * Weights are transparent MVP policy values — NOT scientifically calibrated
 * labour-market probabilities.
 */
export const DEMAND_METHODOLOGY_VERSION = "demand-v1";

export const DEMAND_QUALITY_WEIGHT = {
  [QUALITY_ELIGIBILITY.INCLUDE]: 1.0,
  [QUALITY_ELIGIBILITY.INCLUDE_WITH_CAUTION]: 0.5,
  [QUALITY_ELIGIBILITY.EXCLUDE]: 0.0,
} as const satisfies Record<QualityEligibility, number>;

export const DEMAND_REQUIREMENT_WEIGHT = {
  [SKILL_REQUIREMENT_LEVEL.REQUIRED]: 1.0,
  [SKILL_REQUIREMENT_LEVEL.PREFERRED]: 0.75,
  [SKILL_REQUIREMENT_LEVEL.OPTIONAL]: 0.5,
  [SKILL_REQUIREMENT_LEVEL.MENTIONED]: 0.25,
} as const satisfies Record<SkillRequirementLevel, number>;

/** Strongest → weakest for job-level skill deduplication. */
export const REQUIREMENT_STRENGTH_ORDER: readonly SkillRequirementLevel[] = [
  SKILL_REQUIREMENT_LEVEL.REQUIRED,
  SKILL_REQUIREMENT_LEVEL.PREFERRED,
  SKILL_REQUIREMENT_LEVEL.OPTIONAL,
  SKILL_REQUIREMENT_LEVEL.MENTIONED,
];

export const DEMAND_TREND_DIRECTION = {
  RISING: "RISING",
  STABLE: "STABLE",
  DECLINING: "DECLINING",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type DemandTrendDirection =
  (typeof DEMAND_TREND_DIRECTION)[keyof typeof DEMAND_TREND_DIRECTION];

/** Absolute growth rate thresholds for demand-v1 (not scientifically validated). */
export const DEMAND_TREND_THRESHOLD = {
  RISING: 0.1,
  DECLINING: -0.1,
} as const;

/** Minimum observations in current OR previous period for a trend label. */
export const DEMAND_MIN_TREND_SAMPLE = 10;

export const DEFAULT_DEMAND_WINDOW_DAYS = {
  D7: 7,
  D30: 30,
  D90: 90,
} as const;

/** Safe bound for jobs loaded into one demand analysis. */
export const DEFAULT_DEMAND_JOB_LIMIT = 500;
export const MAX_DEMAND_JOB_LIMIT = 2000;

/** Safe bound for ranked list pages in demand summaries. */
export const DEFAULT_DEMAND_RANK_LIMIT = 20;
export const MAX_DEMAND_RANK_LIMIT = 50;

export function qualityWeight(eligibility: QualityEligibility): number {
  return DEMAND_QUALITY_WEIGHT[eligibility];
}

export function requirementWeight(level: SkillRequirementLevel): number {
  return DEMAND_REQUIREMENT_WEIGHT[level];
}

export function skillContribution(
  eligibility: QualityEligibility,
  level: SkillRequirementLevel,
): number {
  return qualityWeight(eligibility) * requirementWeight(level);
}

export function isStrongerRequirement(
  candidate: SkillRequirementLevel,
  current: SkillRequirementLevel,
): boolean {
  return (
    REQUIREMENT_STRENGTH_ORDER.indexOf(candidate) <
    REQUIREMENT_STRENGTH_ORDER.indexOf(current)
  );
}
