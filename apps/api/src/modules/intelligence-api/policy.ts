/**
 * Phase 14 product/API policy — presentation adapters only.
 * Does not redefine Phase 7–13 analytical thresholds.
 */
export const PRODUCT_API_VERSION = "product-v1";

export const DEFAULT_INTELLIGENCE_LIMIT = 20;
export const MAX_INTELLIGENCE_LIMIT = 50;

/** Roles that may read government-wide intelligence. */
export const INTELLIGENCE_GOVERNMENT_ROLES = [
  "PLATFORM_ADMIN",
  "GOVERNMENT_MANAGER",
] as const;

/** Roles that may read scoped institute/program intelligence. */
export const INTELLIGENCE_SCOPED_ROLES = [
  "INSTITUTE_ADMIN",
  "TRAINER",
  "EMPLOYER",
] as const;

/** Roles that may read decisions. */
export const INTELLIGENCE_DECISION_ROLES = [
  "PLATFORM_ADMIN",
  "GOVERNMENT_MANAGER",
] as const;
