import type { DemandPeriod } from "../demand/contract";
import type { GapGeographyRef } from "../gaps/contract";
import type { SkillGapSummary } from "../gaps/contract";
import type { TrainingIntelligenceSummary } from "../training/contract";
import type { InstituteIntelligenceSummary } from "../institute/contract";
import type { TrainingProgramView } from "../training/contract";
import type {
  EmploymentConfidence,
  EmploymentEvidenceType,
  EmploymentTrendDirection,
  OutcomeStatus,
  OutcomeType,
  ProgramEmploymentAlignment,
  SkillUtilizationLevel,
} from "./policy";
import { EMPLOYMENT_METHODOLOGY_VERSION } from "./policy";

export { EMPLOYMENT_METHODOLOGY_VERSION };

/**
 * Explicit employment/training outcome observation.
 * Caller-provided — SkillPulse has no durable learner/placement Prisma model in MVP.
 * Do not fabricate production learner populations.
 */
export type EmploymentOutcomeObservation = {
  observationId: string;
  /** Stable learner identity when available — used for dedupe. */
  learnerId: string | null;
  courseId: string | null;
  /** Organization id of training institute when known. */
  instituteId: string | null;
  /** Organization id of employer when known (OrganizationType.EMPLOYER). */
  employerId: string | null;
  employerName: string | null;
  /** Canonical skill IDs associated with training. */
  trainedSkillIds: string[];
  /** Canonical skill IDs evidenced in employment — never inferred from title alone. */
  employmentSkillIds: string[];
  outcomeType: OutcomeType;
  outcomeStatus: OutcomeStatus;
  trainingCompletionDate: string | null;
  outcomeDate: string | null;
  employmentStartDate: string | null;
  employmentEndDate: string | null;
  geography: GapGeographyRef;
  occupationId: string | null;
  sourceId: string | null;
  evidenceType: EmploymentEvidenceType | null;
  evidenceId: string | null;
  observedAt: string;
  notes?: string;
};

export type CohortDefinition = {
  /** Explicit description of how rates are computed. */
  description: string;
  periodFrom: string;
  periodTo: string;
  /** When false, rates that need linked cohorts return null. */
  linkageAvailable: boolean;
};

export type RateResult = {
  value: number | null;
  numerator: number;
  denominator: number | null;
  note: string;
};

export type TimeToEmploymentStats = {
  knownCount: number;
  medianDays: number | null;
  averageDays: number | null;
  minDays: number | null;
  maxDays: number | null;
  rejectedInvalid: number;
  notes: string[];
};

export type SkillUtilizationResult = {
  level: SkillUtilizationLevel;
  ratio: number | null;
  matchedSkillIds: string[];
  trainedSkillIds: string[];
  employmentSkillIds: string[];
  note: string;
};

export type SkillUtilizationSummary = {
  knownOutcomes: number;
  full: number;
  partial: number;
  low: number;
  none: number;
  unknown: number;
  /** Mean ratio over known outcomes — null if none known. */
  rate: number | null;
};

export type EvidenceCoverage = {
  totalObservations: number;
  uniqueLearners: number;
  observationsWithEvidence: number;
  confirmedOutcomes: number;
  reportedOutcomes: number;
  unverifiedOutcomes: number;
  unknownOutcomes: number;
  outcomesWithEmploymentDates: number;
  outcomesWithSkillEvidence: number;
  conflictGroups: number;
};

export type EmployerInsightRow = {
  employerId: string | null;
  employerName: string | null;
  employedCount: number;
  placedCount: number;
  programIds: string[];
  occupationIds: string[];
  employmentSkillIds: string[];
  medianTimeToEmploymentDays: number | null;
  skillUtilization: SkillUtilizationSummary;
  confidence: EmploymentConfidence;
  evidence: {
    observationIds: string[];
    sourceIds: string[];
  };
  notes: string[];
  policyVersion: typeof EMPLOYMENT_METHODOLOGY_VERSION;
};

export type ProgramEmploymentInsightRow = {
  programId: string;
  courseId: string;
  courseName: string;
  instituteId: string | null;
  trained: number;
  certified: number;
  placed: number;
  employed: number;
  employmentRate: number | null;
  medianTimeToEmploymentDays: number | null;
  skillUtilization: SkillUtilizationSummary;
  employerCount: number;
  alignment: ProgramEmploymentAlignment;
  phase10Alignment: string | null;
  confidence: EmploymentConfidence;
  evidence: {
    observationIds: string[];
    curriculumSkillIds: string[];
  };
  notes: string[];
  policyVersion: typeof EMPLOYMENT_METHODOLOGY_VERSION;
};

export type EmploymentTrendMetric = {
  metric: "employed" | "placed" | "trained";
  direction: EmploymentTrendDirection;
  current: number;
  previous: number;
  growthRate: number | null;
  currentSample: number;
  previousSample: number;
  note: string;
};

export type EmploymentIntelligenceSummary = {
  employmentVersion: typeof EMPLOYMENT_METHODOLOGY_VERSION;
  demandVersion: string | null;
  gapVersion: string | null;
  trainingVersion: string | null;
  instituteVersion: string | null;
  period: DemandPeriod;
  cohort: CohortDefinition;
  totals: {
    trained: number;
    certified: number;
    placed: number;
    employed: number;
    uniqueLearners: number;
  };
  rates: {
    trainingToPlacement: RateResult;
    trainingToEmployment: RateResult;
    certificationToEmployment: RateResult;
  };
  timeToEmployment: TimeToEmploymentStats;
  skillUtilization: SkillUtilizationSummary;
  employers: EmployerInsightRow[];
  programs: ProgramEmploymentInsightRow[];
  trends: EmploymentTrendMetric[];
  evidenceCoverage: EvidenceCoverage;
  limitations: string[];
  notes: string[];
};

export type EmploymentIntelligenceInput = {
  observations: readonly EmploymentOutcomeObservation[];
  /** Previous equivalent-period observations for trends. */
  previousObservations?: readonly EmploymentOutcomeObservation[];
  period: DemandPeriod;
  cohort?: Partial<CohortDefinition>;
  /** Optional ACTIVE programs for curriculum alignment (Phase 10 unit). */
  programs?: readonly TrainingProgramView[];
  /** Optional Phase 8–11 summaries — consumed, not recomputed. */
  demandSummary?: { demandVersion: string } | null;
  gapSummary?: SkillGapSummary | null;
  trainingSummary?: TrainingIntelligenceSummary | null;
  instituteSummary?: InstituteIntelligenceSummary | null;
  rankLimit?: number;
  referenceTime?: string;
};
