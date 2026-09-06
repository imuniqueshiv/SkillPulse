export {
  DEMAND_METHODOLOGY_VERSION,
  DEMAND_QUALITY_WEIGHT,
  DEMAND_REQUIREMENT_WEIGHT,
  DEMAND_TREND_DIRECTION,
  DEMAND_TREND_THRESHOLD,
  DEMAND_MIN_TREND_SAMPLE,
  qualityWeight,
  requirementWeight,
  skillContribution,
  isStrongerRequirement,
} from "./policy";

export type * from "./contract";

export {
  periodFromDays,
  previousPeriodOfEqualDuration,
  defaultWindow,
  toDemandPeriod,
} from "./period";

export { classifyTrend } from "./trends";
export { dedupeJobSkills, compareDemandRows } from "./skills-util";
export { aggregateSkillDemand } from "./skills";
export { aggregateOccupationDemand } from "./occupations";
export { aggregateSectorDemand } from "./sectors";
export { aggregateGeographyDemand } from "./geography";
export {
  aggregateExperienceDemand,
  aggregateQualificationDemand,
} from "./experience";
export { demandScoreExplanation, selectTrendSkills } from "./scoring";
export { loadDemandObservations } from "./observations";
export { summarizeDemand, summarizeDemandFromObservations } from "./summary";
