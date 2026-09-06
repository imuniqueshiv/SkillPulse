import type { QualityEligibility } from "../quality/contract";
import type {
  JobIntelligenceExperience,
  JobIntelligenceQualification,
  SkillRequirementLevel,
} from "../intelligence/contract";
import type { DemandTrendDirection } from "./policy";
import { DEMAND_METHODOLOGY_VERSION } from "./policy";

export { DEMAND_METHODOLOGY_VERSION };

export type DemandPeriod = {
  from: string;
  to: string;
  /** Inclusive labour-market event date field used for filtering. */
  dateField: "postedAt";
};

export type DemandGeographyFilter = {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locationId?: string;
};

export type DemandFilters = {
  from: Date;
  to: Date;
  referenceTime?: Date;
  sourceId?: string;
  skillId?: string;
  occupationId?: string;
  sectorId?: string;
  geography?: DemandGeographyFilter;
  assessmentVersion?: string;
  intelligenceProcessorVersion?: string;
  /** Bound on jobs scanned for this analysis. */
  limit?: number;
  offset?: number;
  /** Max ranked rows returned per dimension. */
  rankLimit?: number;
};

export type DemandQualityCoverage = {
  totalObservations: number;
  included: number;
  caution: number;
  excluded: number;
  /** Jobs with PROCESSED quality assessment in scope (included+caution+excluded). */
  analyzed: number;
  /** Jobs missing PROCESSED quality assessment in the date/geo/source scope. */
  missingQuality: number;
  /** Jobs missing PROCESSED intelligence among quality-analyzed jobs. */
  missingIntelligence: number;
  /** Sum of quality weights for contributing jobs (INCLUDE + CAUTION). */
  weightedEligibleJobs: number;
};

export type DemandLocationRef = {
  locationId: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  known: boolean;
};

export type DemandSkillRef = {
  skillId: string;
  canonicalName: string;
  name: string;
  requirementLevel: SkillRequirementLevel;
  requirementWeight: number;
  contribution: number;
};

export type DemandOccupationRef = {
  status: "CLASSIFIED" | "UNCLASSIFIED";
  occupationId: string | null;
  code: string | null;
  name: string | null;
};

export type DemandSectorRef = {
  status: "CLASSIFIED" | "UNCLASSIFIED";
  sectorId: string | null;
  code: string | null;
  name: string | null;
};

/**
 * Lightweight analytical observation derived from Job + Phase 6 + Phase 7.
 * Not a Prisma model; not raw ingestion payload.
 */
export type DemandJobObservation = {
  jobId: string;
  postedAt: string | null;
  sourceId: string | null;
  eligibility: QualityEligibility;
  qualityWeight: number;
  location: DemandLocationRef;
  skills: DemandSkillRef[];
  occupation: DemandOccupationRef;
  sector: DemandSectorRef;
  experience: Pick<
    JobIntelligenceExperience,
    "status" | "minYears" | "maxYears" | "freshersAccepted" | "confidenceTier"
  >;
  qualifications: Array<
    Pick<
      JobIntelligenceQualification,
      "status" | "normalized" | "type" | "confidenceTier"
    >
  >;
};

export type RequirementBreakdown = Record<SkillRequirementLevel, number>;

export type SkillDemandRow = {
  skillId: string;
  canonicalName: string;
  name: string;
  jobCount: number;
  weightedDemand: number;
  /** weightedDemand / weightedEligibleJobs in scope (0 when denominator 0). */
  jobPenetration: number;
  /** weightedDemand / sum(weightedDemand of all skills) in scope. */
  skillDemandShare: number;
  requirementBreakdown: RequirementBreakdown;
  recentWeightedDemand: number;
  trend: DemandTrendMetric;
  qualityCoverage: {
    includedJobs: number;
    cautionJobs: number;
  };
};

export type OccupationDemandRow = {
  occupationId: string | null;
  code: string | null;
  name: string;
  status: "CLASSIFIED" | "UNCLASSIFIED";
  jobCount: number;
  weightedDemand: number;
  jobPenetration: number;
  occupationDemandShare: number;
  recentWeightedDemand: number;
  trend: DemandTrendMetric;
  geography: Array<{
    key: string;
    state: string | null;
    city: string | null;
    jobCount: number;
    weightedDemand: number;
  }>;
};

export type SectorDemandRow = {
  sectorId: string | null;
  code: string | null;
  name: string;
  status: "CLASSIFIED" | "UNCLASSIFIED";
  jobCount: number;
  weightedDemand: number;
  jobPenetration: number;
  sectorDemandShare: number;
  recentWeightedDemand: number;
  trend: DemandTrendMetric;
  geography: Array<{
    key: string;
    state: string | null;
    city: string | null;
    jobCount: number;
    weightedDemand: number;
  }>;
};

export type GeographyDemandRow = {
  key: string;
  locationId: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  known: boolean;
  jobCount: number;
  weightedDemand: number;
  jobPenetration: number;
  geographyDemandShare: number;
  recentWeightedDemand: number;
  trend: DemandTrendMetric;
};

export type CoverageSplit = {
  known: number;
  unknown: number;
  coverageRate: number | null;
  note: string;
};

export type ExperienceDemandSummary = {
  coverage: CoverageSplit;
  /** Among jobs with identifiable (PARSED) experience only. */
  amongKnown: {
    freshersAccepted: number;
    withMinYears: number;
    averageMinYears: number | null;
    buckets: Array<{ label: string; jobCount: number; shareAmongKnown: number }>;
  };
};

export type QualificationDemandSummary = {
  coverage: CoverageSplit;
  /** Among jobs with at least one PARSED qualification. */
  amongKnown: {
    totalParsedMentions: number;
    byNormalized: Array<{
      normalized: string;
      jobCount: number;
      shareAmongKnown: number;
    }>;
  };
};

export type DemandTrendMetric = {
  direction: DemandTrendDirection;
  current: number;
  previous: number;
  growthRate: number | null;
  currentSample: number;
  previousSample: number;
  method: typeof DEMAND_METHODOLOGY_VERSION;
};

export type DemandSummary = {
  demandVersion: typeof DEMAND_METHODOLOGY_VERSION;
  qualityAssessmentVersion: string;
  intelligenceProcessorVersion: string;
  period: DemandPeriod;
  previousPeriod: DemandPeriod;
  filters: {
    sourceId: string | null;
    skillId: string | null;
    occupationId: string | null;
    sectorId: string | null;
    geography: DemandGeographyFilter | null;
  };
  policy: {
    qualityWeights: Record<QualityEligibility, number>;
    requirementWeights: Record<SkillRequirementLevel, number>;
    trendThresholds: { rising: number; declining: number };
    minTrendSample: number;
  };
  qualityCoverage: DemandQualityCoverage;
  skills: SkillDemandRow[];
  occupations: OccupationDemandRow[];
  sectors: SectorDemandRow[];
  geography: GeographyDemandRow[];
  experience: ExperienceDemandSummary;
  qualifications: QualificationDemandSummary;
  trends: {
    risingSkills: SkillDemandRow[];
    decliningSkills: SkillDemandRow[];
    stableSkills: SkillDemandRow[];
  };
  notes: string[];
};
