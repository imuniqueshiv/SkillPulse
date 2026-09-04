import { JOB_INTELLIGENCE_PROCESSOR_VERSION } from "../intelligence/contract";
import type { JobIntelligenceResult } from "../intelligence/contract";

export const JOB_QUALITY_ASSESSMENT_VERSION = "quality-v1";

export const QUALITY_CHECK_STATUS = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
} as const;

export type QualityCheckStatus =
  (typeof QUALITY_CHECK_STATUS)[keyof typeof QUALITY_CHECK_STATUS];

export const QUALITY_SEVERITY = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const;

export type QualitySeverity =
  (typeof QUALITY_SEVERITY)[keyof typeof QUALITY_SEVERITY];

export const QUALITY_ELIGIBILITY = {
  INCLUDE: "INCLUDE",
  INCLUDE_WITH_CAUTION: "INCLUDE_WITH_CAUTION",
  EXCLUDE: "EXCLUDE",
} as const;

export type QualityEligibility =
  (typeof QUALITY_ELIGIBILITY)[keyof typeof QUALITY_ELIGIBILITY];

export const SOURCE_TRUST_LEVEL = {
  VERIFIED: "VERIFIED",
  TRUSTED: "TRUSTED",
  STANDARD: "STANDARD",
  UNVERIFIED: "UNVERIFIED",
} as const;

export type SourceTrustLevel =
  (typeof SOURCE_TRUST_LEVEL)[keyof typeof SOURCE_TRUST_LEVEL];

export const SOURCE_TRUST_METHOD = {
  SOURCE_REGISTRY: "SOURCE_REGISTRY",
  NO_SOURCE: "NO_SOURCE",
} as const;

export type SourceTrustMethod =
  (typeof SOURCE_TRUST_METHOD)[keyof typeof SOURCE_TRUST_METHOD];

export const QUALITY_SIGNAL_AVAILABILITY = {
  AVAILABLE: "AVAILABLE",
  RECOMPUTED: "RECOMPUTED",
  UNKNOWN: "UNKNOWN",
} as const;

export type QualitySignalAvailability =
  (typeof QUALITY_SIGNAL_AVAILABILITY)[keyof typeof QUALITY_SIGNAL_AVAILABILITY];

export const OVERALL_INTELLIGENCE_CONFIDENCE = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  UNKNOWN: "UNKNOWN",
} as const;

export type OverallIntelligenceConfidence =
  (typeof OVERALL_INTELLIGENCE_CONFIDENCE)[keyof typeof OVERALL_INTELLIGENCE_CONFIDENCE];

export const QUALITY_REASON_CODE = {
  MISSING_TITLE: "MISSING_TITLE",
  MISSING_SOURCE: "MISSING_SOURCE",
  MISSING_OBSERVED_AT: "MISSING_OBSERVED_AT",
  MISSING_DESCRIPTION: "MISSING_DESCRIPTION",
  MISSING_LOCATION: "MISSING_LOCATION",
  LOW_COMPLETENESS: "LOW_COMPLETENESS",
  STALE_DATA: "STALE_DATA",
  AGING_DATA: "AGING_DATA",
  UNKNOWN_FRESHNESS: "UNKNOWN_FRESHNESS",
  DUPLICATE: "DUPLICATE",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
  UNKNOWN_DEDUPLICATION: "UNKNOWN_DEDUPLICATION",
  LOW_SOURCE_TRUST: "LOW_SOURCE_TRUST",
  LOW_INTELLIGENCE_CONFIDENCE: "LOW_INTELLIGENCE_CONFIDENCE",
  MEDIUM_INTELLIGENCE_CONFIDENCE: "MEDIUM_INTELLIGENCE_CONFIDENCE",
  UNKNOWN_INTELLIGENCE: "UNKNOWN_INTELLIGENCE",
  INVALID_RECORD: "INVALID_RECORD",
  REVIEW_VALIDATION: "REVIEW_VALIDATION",
  UNKNOWN_VALIDATION: "UNKNOWN_VALIDATION",
} as const;

export type QualityReasonCode =
  (typeof QUALITY_REASON_CODE)[keyof typeof QUALITY_REASON_CODE];

export type QualityReason = {
  code: QualityReasonCode;
  message: string;
};

export type QualityRuleCheck = {
  rule: string;
  status: QualityCheckStatus;
  severity: QualitySeverity;
  message?: string;
};

export type CompletenessFieldWeight = "CRITICAL" | "HIGH" | "MEDIUM";

export type CompletenessFieldDetail = {
  field: string;
  weight: CompletenessFieldWeight;
  present: boolean;
  kind: "OBSERVED" | "DERIVED" | "PROVENANCE";
  note?: string;
};

export type CompletenessAssessment = {
  score: number;
  presentFields: string[];
  missingFields: string[];
  fields: CompletenessFieldDetail[];
  notes: string[];
};

export type SourceTrustAssessment = {
  sourceId: string | null;
  sourceCode: string | null;
  trustLevel: SourceTrustLevel;
  method: SourceTrustMethod;
  reason: string;
  active: boolean | null;
};

export type FreshnessAssessment = {
  status: "FRESH" | "AGING" | "STALE" | "UNKNOWN";
  availability: QualitySignalAvailability;
  method: "PHASE5_EVALUATE" | "EVIDENCE_METADATA" | "UNAVAILABLE";
  reason: string;
  postedAt: string | null;
  expiresAt: string | null;
  observedAt: string | null;
  referenceTime: string | null;
};

export type DuplicationAssessment = {
  status: "UNIQUE" | "POSSIBLE_DUPLICATE" | "DUPLICATE" | "UNKNOWN";
  availability: QualitySignalAvailability;
  method: "EVIDENCE_METADATA" | "UNAVAILABLE";
  reason: string;
};

export type ValidationSignalAssessment = {
  status: "VALID" | "REVIEW" | "REJECTED" | "UNKNOWN";
  availability: QualitySignalAvailability;
  method: "EVIDENCE_METADATA" | "UNAVAILABLE";
  reason: string;
};

export type IntelligenceConfidenceAssessment = {
  overall: OverallIntelligenceConfidence;
  processorVersion: string | null;
  available: boolean;
  contributing: Array<{
    signal: string;
    confidenceTier: "HIGH" | "MEDIUM" | "LOW";
  }>;
  skipped: Array<{
    signal: string;
    reason: string;
  }>;
  method: string;
};

export type EligibilityDecision = {
  eligibility: QualityEligibility;
  reasons: QualityReason[];
};

export type JobQualityAssessmentResult = {
  jobId: string;
  assessmentVersion: string;
  assessedAt: string;
  referenceTime: string;
  intelligenceProcessorVersion: string;
  checks: QualityRuleCheck[];
  completeness: CompletenessAssessment;
  sourceTrust: SourceTrustAssessment;
  freshness: FreshnessAssessment;
  duplication: DuplicationAssessment;
  validation: ValidationSignalAssessment;
  intelligenceConfidence: IntelligenceConfidenceAssessment;
  eligibility: QualityEligibility;
  reasons: QualityReason[];
  /** Stable evidence identifiers included in the fingerprint (not raw payloads). */
  evidence: {
    evidenceId: string | null;
    observationId: string | null;
  };
  /** Deterministic fingerprint of stable quality components (Phase 7.8). */
  fingerprint: string;
  /**
   * One-level prior successful assessment snapshot when inputs changed
   * for the same assessmentVersion (Phase 7.7). Not a second counted row.
   */
  previousAssessment?: QualityHistorySnapshot;
};

/** Slim historical snapshot nested in result when quality inputs change. */
export type QualityHistorySnapshot = {
  fingerprint: string;
  assessedAt: string;
  eligibility: QualityEligibility;
  completenessScore: number;
  freshnessStatus: FreshnessAssessment["status"];
  duplicationStatus: DuplicationAssessment["status"];
  sourceTrustLevel: SourceTrustLevel;
  intelligenceOverall: OverallIntelligenceConfidence;
  reasons: QualityReason[];
};

export const QUALITY_CHANGE_COMPONENT = {
  VALIDATION: "validation",
  COMPLETENESS: "completeness",
  SOURCE_TRUST: "sourceTrust",
  FRESHNESS: "freshness",
  DUPLICATION: "duplication",
  INTELLIGENCE_CONFIDENCE: "intelligenceConfidence",
  ELIGIBILITY: "eligibility",
  EVIDENCE: "evidence",
} as const;

export type QualityChangeComponent =
  (typeof QUALITY_CHANGE_COMPONENT)[keyof typeof QUALITY_CHANGE_COMPONENT];

export type QualityChangeDetection = {
  changed: boolean;
  previousFingerprint?: string;
  currentFingerprint: string;
  changedComponents: QualityChangeComponent[];
};

export type QualityJobInput = {
  id: string;
  title: string;
  description: string | null;
  companyName: string | null;
  sourceId: string | null;
  externalId: string | null;
  locationId: string | null;
  postedAt: Date | null;
  expiresAt: Date | null;
  sourceUrl: string | null;
  skillCount: number;
};

export type QualitySourceInput = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  reliability: number | null;
  type: string;
  geographicScope: string;
};

export type QualityProvenanceInput = {
  observedAt: Date | null;
  validationStatus?: "VALID" | "REVIEW" | null;
  dedupStatus?: "UNIQUE" | "POSSIBLE_DUPLICATE" | "DUPLICATE" | null;
  freshnessStatus?: "FRESH" | "AGING" | "STALE" | "UNKNOWN" | null;
  ingestedAt?: string | null;
  /** Stable Evidence.id when available — fingerprint evidence only. */
  evidenceId?: string | null;
  /** Stable RawIngestionRecord.id / observation id when available. */
  observationId?: string | null;
};

export const DEFAULT_INTELLIGENCE_PROCESSOR_VERSION =
  JOB_INTELLIGENCE_PROCESSOR_VERSION;

export type { JobIntelligenceResult };
