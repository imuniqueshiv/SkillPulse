import type { DemandGeographyFilter, DemandPeriod, SkillDemandRow } from "../demand/contract";
import type {
  GapComparability,
  GapConfidence,
  GapSeverity,
  GapTrendDirection,
  SupplyType,
} from "./policy";
import { GAP_METHODOLOGY_VERSION } from "./policy";

export { GAP_METHODOLOGY_VERSION };

export type GapGeographyRef = {
  locationId: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  known: boolean;
  /** Geographic scope level for this observation/result. */
  level: "COUNTRY" | "STATE" | "DISTRICT" | "CITY" | "UNKNOWN";
};

/**
 * Normalized supply observation.
 * Quantity semantics depend on supplyType — types are never silently mixed.
 */
export type SupplyObservation = {
  observationId: string;
  sourceId: string | null;
  skillId: string | null;
  canonicalName: string | null;
  /** Unresolved when skillId is null. */
  resolved: boolean;
  occupationId: string | null;
  sectorId: string | null;
  geography: GapGeographyRef;
  /** Observation period using explicit from/to (ISO). */
  periodFrom: string;
  periodTo: string;
  supplyType: SupplyType;
  quantity: number;
  confidence: GapConfidence | null;
  evidenceId: string | null;
  notes?: string;
};

export type SupplySkillAggregate = {
  skillId: string;
  canonicalName: string;
  supplyType: SupplyType;
  quantity: number;
  observationCount: number;
  observationIds: string[];
  sourceIds: string[];
  geography: GapGeographyRef;
  occupationId: string | null;
  sectorId: string | null;
  comparability: GapComparability;
};

export type GapDemandSignal = {
  skillId: string;
  canonicalName: string;
  name: string;
  demandQuantity: number;
  jobCount: number;
  trendDirection: string;
  includedJobs: number;
  cautionJobs: number;
  occupationId: string | null;
  sectorId: string | null;
};

export type GapMetricBundle = {
  demandQuantity: number;
  supplyQuantity: number;
  netGap: number;
  shortageQuantity: number;
  /** null when supply = 0 (never Infinity). */
  demandSupplyRatio: number | null;
  /** null when demand = 0. */
  supplyCoverageRatio: number | null;
  /** null when demand = 0. Percentage 0–100. */
  gapPercentage: number | null;
  zeroSupply: boolean;
  zeroDemand: boolean;
  bothZero: boolean;
};

export type GapTrendMetric = {
  direction: GapTrendDirection;
  currentShortage: number;
  previousShortage: number;
  growthRate: number | null;
  currentSample: number;
  previousSample: number;
  method: typeof GAP_METHODOLOGY_VERSION;
};

export type GapPriorityScore = {
  score: number;
  components: {
    shortageMagnitude: number;
    demandMagnitude: number;
    severity: number;
    confidence: number;
    trend: number;
  };
  note: string;
};

export type SkillGapRow = {
  skillId: string;
  canonicalName: string;
  name: string;
  supplyType: SupplyType;
  comparability: GapComparability;
  metrics: GapMetricBundle;
  severity: GapSeverity;
  confidence: GapConfidence;
  trend: GapTrendMetric;
  priority: GapPriorityScore;
  geography: GapGeographyRef;
  period: DemandPeriod;
  demandVersion: string;
  gapVersion: typeof GAP_METHODOLOGY_VERSION;
  demandJobCount: number;
  supplyObservationCount: number;
  occupationId: string | null;
  sectorId: string | null;
  evidence: {
    demandIncludedJobs: number;
    demandCautionJobs: number;
    supplyObservationIds: string[];
    supplySourceIds: string[];
  };
  notes: string[];
};

export type OccupationGapRow = {
  occupationId: string;
  name: string;
  supplyType: SupplyType;
  comparability: GapComparability;
  metrics: GapMetricBundle;
  severity: GapSeverity;
  confidence: GapConfidence;
  skillIds: string[];
};

export type SectorGapRow = {
  sectorId: string;
  name: string;
  supplyType: SupplyType;
  comparability: GapComparability;
  metrics: GapMetricBundle;
  severity: GapSeverity;
  confidence: GapConfidence;
  skillIds: string[];
};

export type GeographyGapRow = {
  key: string;
  geography: GapGeographyRef;
  supplyType: SupplyType;
  comparability: GapComparability;
  metrics: GapMetricBundle;
  severity: GapSeverity;
  confidence: GapConfidence;
  skillCount: number;
};

export type SkillGapSummary = {
  gapVersion: typeof GAP_METHODOLOGY_VERSION;
  demandVersion: string;
  period: DemandPeriod;
  previousPeriod: DemandPeriod;
  filters: {
    geography: DemandGeographyFilter | null;
    supplyType: SupplyType | null;
  };
  policy: {
    minDemandSample: number;
    minSupplySample: number;
    severityThresholds: typeof import("./policy").GAP_SEVERITY_THRESHOLD;
    trendThresholds: typeof import("./policy").GAP_TREND_THRESHOLD;
  };
  coverage: {
    demandSkills: number;
    supplySkills: number;
    matchedSkills: number;
    demandOnlySkills: number;
    supplyOnlySkills: number;
    unresolvedSupplyObservations: number;
  };
  skills: SkillGapRow[];
  occupations: OccupationGapRow[];
  sectors: SectorGapRow[];
  geography: GeographyGapRow[];
  buckets: {
    shortages: number;
    balanced: number;
    surplus: number;
    insufficientData: number;
    severe: number;
    high: number;
    direct: number;
    proxy: number;
    unknownComparability: number;
    widening: number;
    narrowing: number;
    stable: number;
  };
  topPriority: SkillGapRow[];
  limitations: string[];
  notes: string[];
};

export type DemandSkillInput = Pick<
  SkillDemandRow,
  | "skillId"
  | "canonicalName"
  | "name"
  | "weightedDemand"
  | "jobCount"
  | "trend"
  | "qualityCoverage"
>;
