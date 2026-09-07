import type { DemandPeriod } from "../demand/contract";
import type { SkillGapRow, SkillGapSummary } from "../gaps/contract";
import type {
  CurriculumCoverageStatus,
  ProgramAlignment,
  TrainingCapacityStatus,
  TrainingConfidence,
  TrainingIntervention,
  TrainingNeedLevel,
} from "./policy";
import { TRAINING_METHODOLOGY_VERSION } from "./policy";

export { TRAINING_METHODOLOGY_VERSION };

/** Analytical program unit — maps to Curriculum (+ Course metadata). */
export type TrainingProgramView = {
  programId: string;
  curriculumId: string;
  courseId: string;
  courseName: string;
  curriculumTitle: string;
  curriculumVersion: string;
  organizationId: string;
  organizationName: string | null;
  occupationId: string | null;
  sectorId: string | null;
  status: string;
  isDemo: boolean;
  skills: ProgramSkillMapping[];
};

export type ProgramSkillMapping = {
  skillId: string;
  canonicalName: string;
  name: string;
  /** Presence mapping from CurriculumSkill — FULL when row exists. */
  coverage: CurriculumCoverageStatus;
  importance: string | null;
};

export type MarketSkillSignal = {
  skillId: string;
  canonicalName: string;
  name: string;
  demandQuantity: number;
  gap: SkillGapRow | null;
};

export type TrainingCapacitySignal = {
  skillId: string;
  quantity: number | null;
  status: TrainingCapacityStatus;
  observationCount: number;
};

export type TrainingNeedPriority = {
  score: number;
  components: {
    gapSeverity: number;
    gapMagnitude: number;
    demandMagnitude: number;
    trend: number;
    confidence: number;
    capacity: number;
  };
  note: string;
};

export type TrainingNeedRow = {
  skillId: string;
  canonicalName: string;
  name: string;
  demandQuantity: number;
  supplyQuantity: number;
  netGap: number;
  shortageQuantity: number;
  gapSeverity: string;
  gapTrend: string;
  gapConfidence: string;
  comparability: string;
  trainingNeed: TrainingNeedLevel;
  capacity: TrainingCapacitySignal;
  priority: TrainingNeedPriority;
  confidence: TrainingConfidence;
  intervention: TrainingIntervention;
  programsCovering: number;
  geography: SkillGapRow["geography"] | null;
  period: DemandPeriod;
  evidence: {
    gapVersion: string;
    demandVersion: string;
    supplyObservationIds: string[];
  };
  notes: string[];
  policyVersion: typeof TRAINING_METHODOLOGY_VERSION;
};

export type CurriculumGapRow = {
  programId: string;
  courseName: string;
  curriculumTitle: string;
  skillId: string;
  canonicalName: string;
  name: string;
  demandQuantity: number;
  gapSeverity: string | null;
  gapTrend: string | null;
  coverageStatus: CurriculumCoverageStatus;
  priority: number;
  confidence: TrainingConfidence;
  intervention: TrainingIntervention;
  period: DemandPeriod;
  evidence: {
    curriculumId: string;
    courseId: string;
    gapVersion: string | null;
  };
  notes: string[];
  policyVersion: typeof TRAINING_METHODOLOGY_VERSION;
};

export type ProgramAlignmentRow = {
  programId: string;
  courseName: string;
  curriculumTitle: string;
  alignment: ProgramAlignment;
  /** null when total relevant demand is 0. */
  demandWeightedCoverage: number | null;
  coveredWeightedDemand: number;
  totalRelevantWeightedDemand: number;
  coveredSkillCount: number;
  relevantSkillCount: number;
  highGapSkillsTotal: number;
  highGapSkillsCovered: number;
  highGapSkillsMissing: number;
  curriculumGaps: CurriculumGapRow[];
  confidence: TrainingConfidence;
  notes: string[];
  policyVersion: typeof TRAINING_METHODOLOGY_VERSION;
};

export type TrainingIntelligenceSummary = {
  trainingVersion: typeof TRAINING_METHODOLOGY_VERSION;
  gapVersion: string;
  demandVersion: string;
  period: DemandPeriod;
  trainingNeeds: TrainingNeedRow[];
  programs: ProgramAlignmentRow[];
  curriculumGaps: CurriculumGapRow[];
  buckets: {
    highNeed: number;
    moderateNeed: number;
    lowNeed: number;
    insufficientNeed: number;
    capacityGaps: number;
    strongAlignment: number;
    moderateAlignment: number;
    weakAlignment: number;
    insufficientAlignment: number;
    curriculumGapCount: number;
  };
  topTrainingNeeds: TrainingNeedRow[];
  topCurriculumGaps: CurriculumGapRow[];
  limitations: string[];
  notes: string[];
};

export type TrainingIntelligenceInput = {
  gapSummary: SkillGapSummary;
  programs: TrainingProgramView[];
  /** Optional TRAINING_CAPACITY quantities by skillId. */
  trainingCapacityBySkill?: Record<string, number>;
  rankLimit?: number;
};
