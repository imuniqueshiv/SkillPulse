import type { DemandPeriod } from "../demand/contract";
import type { GapGeographyRef, SkillGapRow, SkillGapSummary } from "../gaps/contract";
import type {
  ProgramAlignmentRow,
  TrainingIntelligenceSummary,
  TrainingProgramView,
} from "../training/contract";
import type {
  CapabilityStatus,
  InstituteCapacityStatus,
  InstituteConfidence,
  ProgramRelevanceLevel,
} from "./policy";
import { INSTITUTE_METHODOLOGY_VERSION } from "./policy";

export { INSTITUTE_METHODOLOGY_VERSION };

/**
 * Explicit training-capacity observation scoped to provider/program when known.
 * Never convert other supply types into this shape.
 */
export type InstituteCapacityObservation = {
  observationId: string;
  quantity: number;
  periodFrom: string;
  periodTo: string;
  geography: GapGeographyRef;
  providerId: string | null;
  programId: string | null;
  skillId: string | null;
  sourceId: string | null;
  evidenceId: string | null;
  confidence: InstituteConfidence | null;
  /**
   * Observations sharing an aggregateGroup are mutually exclusive alternatives —
   * do NOT sum them. Distinct groups (or null) may be additive when scopes match.
   */
  aggregateGroup: string | null;
  notes?: string;
};

export type CapacityAggregateResult = {
  quantity: number | null;
  status: InstituteCapacityStatus;
  observationCount: number;
  observationIds: string[];
  additive: boolean;
  notes: string[];
};

export type ProgramRelevanceScore = {
  score: number;
  level: ProgramRelevanceLevel;
  components: {
    gapSeverity: number;
    skillCoverage: number;
    curriculumAlignment: number;
    capacity: number;
    confidence: number;
  };
  note: string;
};

export type ProviderCapabilityScore = {
  score: number;
  components: {
    highGapCoverage: number;
    skillCoverage: number;
    alignment: number;
    capacity: number;
    confidence: number;
  };
  note: string;
};

export type ProgramGapSkillRef = {
  skillId: string;
  canonicalName: string;
  name: string;
  demandQuantity: number;
  shortageQuantity: number;
  gapSeverity: string;
  gapTrend: string;
  gapConfidence: string;
  covered: boolean;
};

/** Program-level intelligence — distinct from provider. */
export type ProgramIntelligenceRow = {
  programId: string;
  programName: string;
  courseId: string;
  providerId: string;
  providerName: string | null;
  status: string;
  isActive: boolean;
  skills: Array<{
    skillId: string;
    canonicalName: string;
    name: string;
  }>;
  unresolvedSkillCount: number;
  alignment: ProgramAlignmentRow | null;
  coveredGapSkills: ProgramGapSkillRef[];
  missingGapSkills: ProgramGapSkillRef[];
  capacity: CapacityAggregateResult;
  relevance: ProgramRelevanceScore;
  confidence: InstituteConfidence;
  geography: GapGeographyRef | null;
  period: DemandPeriod;
  evidence: {
    curriculumId: string;
    courseId: string;
    organizationId: string;
    trainingVersion: string | null;
    gapVersion: string;
  };
  notes: string[];
  policyVersion: typeof INSTITUTE_METHODOLOGY_VERSION;
};

/** Provider/institute-level intelligence — aggregates programs without collapsing detail. */
export type ProviderIntelligenceRow = {
  providerId: string;
  providerName: string | null;
  providerType: string;
  activeProgramCount: number;
  relevantProgramCount: number;
  skillsCovered: string[];
  highGapSkillsCovered: string[];
  highGapSkillsMissing: string[];
  programs: Array<{
    programId: string;
    programName: string;
    alignment: string | null;
    relevanceScore: number;
  }>;
  capacity: CapacityAggregateResult;
  capabilityCoverage: number | null;
  capabilityScore: ProviderCapabilityScore;
  confidence: InstituteConfidence;
  evidence: {
    organizationId: string;
    programIds: string[];
    gapVersion: string;
    trainingVersion: string | null;
  };
  notes: string[];
  policyVersion: typeof INSTITUTE_METHODOLOGY_VERSION;
};

export type SkillCapabilityRow = {
  skillId: string;
  canonicalName: string;
  name: string;
  gapSeverity: string;
  demandQuantity: number;
  shortageQuantity: number;
  programsCovering: Array<{ programId: string; providerId: string; programName: string }>;
  providersCovering: Array<{ providerId: string; providerName: string | null }>;
  capacity: CapacityAggregateResult;
  capabilityStatus: CapabilityStatus;
  confidence: InstituteConfidence;
  evidence: {
    gapVersion: string;
    programCountInAnalysis: number;
    providerCountInAnalysis: number;
  };
  notes: string[];
  policyVersion: typeof INSTITUTE_METHODOLOGY_VERSION;
};

export type GeographicCapabilityRow = {
  geography: GapGeographyRef;
  highGapSkillCount: number;
  highGapSkillsCovered: number;
  highGapSkillsMissing: number;
  highGapSkillsInsufficientData: number;
  capabilityCoverage: number | null;
  programs: number;
  providers: number;
  capacityKnown: number;
  capacityUnknown: number;
  skills: SkillCapabilityRow[];
  confidence: InstituteConfidence;
  notes: string[];
  policyVersion: typeof INSTITUTE_METHODOLOGY_VERSION;
};

export type InstituteIntelligenceSummary = {
  instituteVersion: typeof INSTITUTE_METHODOLOGY_VERSION;
  trainingVersion: string | null;
  gapVersion: string;
  demandVersion: string;
  period: DemandPeriod;
  programs: ProgramIntelligenceRow[];
  providers: ProviderIntelligenceRow[];
  skillCapabilities: SkillCapabilityRow[];
  geography: GeographicCapabilityRow[];
  buckets: {
    activeProviders: number;
    activePrograms: number;
    relevantPrograms: number;
    skillsCovered: number;
    highGapWithCapability: number;
    highGapWithoutConfirmedCapability: number;
    capabilityAdequate: number;
    capabilityLimited: number;
    capabilityMissing: number;
    capabilityInsufficientData: number;
    capacityKnown: number;
    capacityUnknown: number;
  };
  topRelevantPrograms: ProgramIntelligenceRow[];
  topCapableProviders: ProviderIntelligenceRow[];
  limitations: string[];
  notes: string[];
};

export type InstituteIntelligenceInput = {
  gapSummary: SkillGapSummary;
  /** ACTIVE programs only for current capability. */
  programs: TrainingProgramView[];
  /** Phase 10 alignment rows — consumed, not recomputed. */
  alignments?: readonly ProgramAlignmentRow[];
  /** Optional full Phase 10 summary (alignments + versions). */
  trainingSummary?: TrainingIntelligenceSummary | null;
  capacityObservations?: readonly InstituteCapacityObservation[];
  /** When true, analysis set has intentional empty provider evidence. */
  hasProviderProgramEvidence?: boolean;
  rankLimit?: number;
  geographyFilter?: GapGeographyRef | null;
};
