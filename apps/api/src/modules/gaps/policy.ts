/**
 * Centralized gap-v1 policy.
 * Analytical decision-support parameters — NOT scientifically calibrated
 * labour-market probabilities or official shortage determinations.
 */
export const GAP_METHODOLOGY_VERSION = "gap-v1";

export const SUPPLY_TYPE = {
  TRAINED: "TRAINED",
  CERTIFIED: "CERTIFIED",
  AVAILABLE_WORKFORCE: "AVAILABLE_WORKFORCE",
  TRAINING_CAPACITY: "TRAINING_CAPACITY",
  OTHER: "OTHER",
} as const;

export type SupplyType = (typeof SUPPLY_TYPE)[keyof typeof SUPPLY_TYPE];

/**
 * Default comparability of supplyType vs Phase 8 job demand.
 * AVAILABLE_WORKFORCE is treated as DIRECT only when geography scopes match.
 * TRAINING_CAPACITY / TRAINED / CERTIFIED are proxies — never silent workforce.
 */
export const SUPPLY_COMPARABILITY_DEFAULT = {
  [SUPPLY_TYPE.AVAILABLE_WORKFORCE]: "DIRECT",
  [SUPPLY_TYPE.TRAINED]: "PROXY",
  [SUPPLY_TYPE.CERTIFIED]: "PROXY",
  [SUPPLY_TYPE.TRAINING_CAPACITY]: "PROXY",
  [SUPPLY_TYPE.OTHER]: "UNKNOWN",
} as const;

export const GAP_COMPARABILITY = {
  DIRECT: "DIRECT",
  PROXY: "PROXY",
  UNKNOWN: "UNKNOWN",
} as const;

export type GapComparability =
  (typeof GAP_COMPARABILITY)[keyof typeof GAP_COMPARABILITY];

export const GAP_SEVERITY = {
  SURPLUS: "SURPLUS",
  BALANCED: "BALANCED",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
  SEVERE: "SEVERE",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type GapSeverity = (typeof GAP_SEVERITY)[keyof typeof GAP_SEVERITY];

export const GAP_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type GapConfidence = (typeof GAP_CONFIDENCE)[keyof typeof GAP_CONFIDENCE];

export const GAP_TREND_DIRECTION = {
  WIDENING: "WIDENING",
  STABLE: "STABLE",
  NARROWING: "NARROWING",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type GapTrendDirection =
  (typeof GAP_TREND_DIRECTION)[keyof typeof GAP_TREND_DIRECTION];

/** Minimum demand jobCount (or equivalent sample) before strong severity. */
export const GAP_MIN_DEMAND_SAMPLE = 5;

/** Minimum supply observation count before strong severity. */
export const GAP_MIN_SUPPLY_SAMPLE = 3;

/** Shortage share of demand thresholds (gapPercentage / 100). */
export const GAP_SEVERITY_THRESHOLD = {
  /** |netGap|/demand below this → BALANCED when not surplus. */
  BALANCED: 0.1,
  MODERATE: 0.3,
  HIGH: 0.5,
} as const;

/** Absolute shortage growth rate for trend labels. */
export const GAP_TREND_THRESHOLD = {
  WIDENING: 0.1,
  NARROWING: -0.1,
} as const;

export const GAP_MIN_TREND_SAMPLE = 5;

/** Priority score component weights (sum ≈ 1). Decision-support only. */
export const GAP_PRIORITY_WEIGHT = {
  shortageMagnitude: 0.35,
  demandMagnitude: 0.2,
  severity: 0.2,
  confidence: 0.15,
  trend: 0.1,
} as const;

export const DEFAULT_GAP_RANK_LIMIT = 20;
export const MAX_GAP_RANK_LIMIT = 50;
export const MAX_SUPPLY_OBSERVATIONS = 5000;

export const SEVERITY_PRIORITY_POINTS: Record<GapSeverity, number> = {
  SEVERE: 1,
  HIGH: 0.75,
  MODERATE: 0.5,
  BALANCED: 0.15,
  SURPLUS: 0,
  INSUFFICIENT_DATA: 0,
};

export const CONFIDENCE_PRIORITY_POINTS: Record<GapConfidence, number> = {
  HIGH: 1,
  MEDIUM: 0.65,
  LOW: 0.35,
  INSUFFICIENT_DATA: 0.1,
};

export const TREND_PRIORITY_POINTS: Record<GapTrendDirection, number> = {
  WIDENING: 1,
  STABLE: 0.4,
  NARROWING: 0.15,
  INSUFFICIENT_DATA: 0.25,
};
