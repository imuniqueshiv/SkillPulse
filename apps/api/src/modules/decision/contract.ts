import type { DemandPeriod, DemandSummary } from "../demand/contract";
import type { GapGeographyRef, SkillGapSummary } from "../gaps/contract";
import type { TrainingIntelligenceSummary } from "../training/contract";
import type { InstituteIntelligenceSummary } from "../institute/contract";
import type { EmploymentIntelligenceSummary } from "../employment/contract";
import type { QualitySummary } from "../quality/summary";
import type {
  DecisionAction,
  DecisionCategory,
  DecisionConfidence,
  DecisionPriority,
} from "./policy";
import { DECISION_METHODOLOGY_VERSION } from "./policy";

export { DECISION_METHODOLOGY_VERSION };

export type DecisionEvidenceItem = {
  source:
    | "QUALITY"
    | "DEMAND"
    | "SKILL_GAP"
    | "TRAINING"
    | "INSTITUTE"
    | "EMPLOYMENT";
  referenceId: string;
  metric: string;
  value: string | number | boolean | null;
  interpretation: string;
};

export type DecisionTarget = {
  skillId: string | null;
  skillCanonicalName: string | null;
  programId: string | null;
  courseId: string | null;
  instituteId: string | null;
  employerId: string | null;
  occupationId: string | null;
  sectorId: string | null;
};

export type DecisionScoreBreakdown = {
  score: number;
  components: {
    gap: number;
    demand: number;
    capacity: number;
    employment: number;
    trend: number;
  };
  note: string;
};

export type DecisionSignal = {
  signalId: string;
  category: DecisionCategory;
  priority: DecisionPriority;
  decisionScore: DecisionScoreBreakdown | null;
  confidence: DecisionConfidence;
  target: DecisionTarget;
  geography: GapGeographyRef | null;
  actionType: DecisionAction;
  rationale: string;
  contributingMetrics: Record<string, string | number | boolean | null>;
  evidence: DecisionEvidenceItem[];
  phaseVersions: Partial<{
    quality: string;
    demand: string;
    gap: string;
    training: string;
    institute: string;
    employment: string;
    decision: typeof DECISION_METHODOLOGY_VERSION;
  }>;
  period: DemandPeriod;
  limitations: string[];
  policyVersion: typeof DECISION_METHODOLOGY_VERSION;
};

export type GovernmentDecisionSummary = {
  policyVersion: typeof DECISION_METHODOLOGY_VERSION;
  period: DemandPeriod;
  signals: DecisionSignal[];
  priorityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    insufficientData: number;
  };
  categoryCounts: Record<DecisionCategory, number>;
  evidenceCoverage: {
    totalSignals: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    insufficientData: number;
  };
  phaseVersions: {
    quality: string | null;
    demand: string | null;
    gap: string | null;
    training: string | null;
    institute: string | null;
    employment: string | null;
    decision: typeof DECISION_METHODOLOGY_VERSION;
  };
  limitations: string[];
  notes: string[];
};

/**
 * Typed upstream summaries — Phase 13 never recomputes them.
 * Periods must be compatible (checked in synthesis).
 */
export type DecisionIntelligenceInput = {
  period: DemandPeriod;
  gapSummary?: SkillGapSummary | null;
  demandSummary?: DemandSummary | null;
  trainingSummary?: TrainingIntelligenceSummary | null;
  instituteSummary?: InstituteIntelligenceSummary | null;
  employmentSummary?: EmploymentIntelligenceSummary | null;
  qualitySummary?: QualitySummary | null;
  rankLimit?: number;
};
