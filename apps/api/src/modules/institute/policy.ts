/**
 * Centralized institute-v1 policy.
 * Decision-support parameters — NOT scientifically calibrated.
 * Does NOT redefine Phase 10 curriculum-alignment thresholds.
 */
export const INSTITUTE_METHODOLOGY_VERSION = "institute-v1";

export const CAPABILITY_STATUS = {
  ADEQUATE: "ADEQUATE",
  LIMITED: "LIMITED",
  MISSING: "MISSING",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type CapabilityStatus =
  (typeof CAPABILITY_STATUS)[keyof typeof CAPABILITY_STATUS];

export const INSTITUTE_CAPACITY_STATUS = {
  AVAILABLE: "AVAILABLE",
  INSUFFICIENT: "INSUFFICIENT",
  UNAVAILABLE: "UNAVAILABLE",
  UNKNOWN: "UNKNOWN",
} as const;

export type InstituteCapacityStatus =
  (typeof INSTITUTE_CAPACITY_STATUS)[keyof typeof INSTITUTE_CAPACITY_STATUS];

export const INSTITUTE_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
} as const;

export type InstituteConfidence =
  (typeof INSTITUTE_CONFIDENCE)[keyof typeof INSTITUTE_CONFIDENCE];

/** High/severe gap severities from Phase 9 — do not invent "critical". */
export const HIGH_GAP_SEVERITIES = new Set(["HIGH", "SEVERE"]);

/** Program relevance score weights (sum ≈ 1). */
export const PROGRAM_RELEVANCE_WEIGHT = {
  gapSeverity: 0.3,
  skillCoverage: 0.25,
  curriculumAlignment: 0.2,
  capacity: 0.15,
  confidence: 0.1,
} as const;

/** Provider capability score weights (sum ≈ 1). */
export const PROVIDER_CAPABILITY_WEIGHT = {
  highGapCoverage: 0.35,
  skillCoverage: 0.25,
  alignment: 0.2,
  capacity: 0.1,
  confidence: 0.1,
} as const;

/** Weighted capability coverage thresholds. */
export const CAPABILITY_COVERAGE_THRESHOLD = {
  ADEQUATE: 0.7,
  LIMITED: 0.25,
} as const;

export const ALIGNMENT_SCORE_POINTS: Record<string, number> = {
  STRONG: 1,
  MODERATE: 0.6,
  WEAK: 0.25,
  INSUFFICIENT_DATA: 0.1,
};

export const SEVERITY_SCORE_POINTS: Record<string, number> = {
  SEVERE: 1,
  HIGH: 0.85,
  MODERATE: 0.5,
  BALANCED: 0.15,
  SURPLUS: 0,
  INSUFFICIENT_DATA: 0,
};

export const CONFIDENCE_SCORE_POINTS: Record<string, number> = {
  HIGH: 1,
  MEDIUM: 0.65,
  LOW: 0.35,
  INSUFFICIENT_DATA: 0.1,
};

export const CAPACITY_SCORE_POINTS: Record<string, number> = {
  AVAILABLE: 1,
  INSUFFICIENT: 0.35,
  UNAVAILABLE: 0.1,
  UNKNOWN: 0.2,
};

/** Capacity vs shortage: capacity >= shortage * ratio → AVAILABLE. */
export const INSTITUTE_CAPACITY_SUFFICIENCY_RATIO = 1.0;

export const DEFAULT_INSTITUTE_RANK_LIMIT = 20;
export const MAX_INSTITUTE_RANK_LIMIT = 50;

/** Minimum active programs in analysis set before MISSING (vs INSUFFICIENT_DATA). */
export const MIN_PROGRAMS_FOR_MISSING_CLAIM = 1;
