export {
  GAP_METHODOLOGY_VERSION,
  SUPPLY_TYPE,
  GAP_COMPARABILITY,
  GAP_SEVERITY,
  GAP_CONFIDENCE,
  GAP_TREND_DIRECTION,
  GAP_MIN_DEMAND_SAMPLE,
  GAP_MIN_SUPPLY_SAMPLE,
  GAP_SEVERITY_THRESHOLD,
  GAP_TREND_THRESHOLD,
  GAP_PRIORITY_WEIGHT,
} from "./policy";

export type * from "./contract";
export type {
  SupplyType,
  GapComparability,
  GapSeverity,
  GapConfidence,
  GapTrendDirection,
} from "./policy";

export { computeGapMetrics } from "./compare";
export {
  resolveComparability,
  geographyScopesCompatible,
  inferGeographyLevel,
} from "./comparability";
export { classifySeverity } from "./severity";
export { classifyConfidence } from "./confidence";
export { classifyGapTrend } from "./trends";
export { computePriorityScore, compareGapRows } from "./priority";
export {
  normalizeSupplyObservations,
  aggregateSupplyBySkill,
} from "./supply";
export { adaptDemandSkills, adaptDemandSummary } from "./demand-adapter";
export { computeSkillGaps } from "./skills";
export {
  summarizeSkillGaps,
  summarizeSkillGapsFromParts,
  type SummarizeSkillGapsInput,
} from "./summary";
