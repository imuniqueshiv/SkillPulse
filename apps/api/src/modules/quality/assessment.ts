import { assessCompleteness } from "./completeness";
import {
  DEFAULT_INTELLIGENCE_PROCESSOR_VERSION,
  JOB_QUALITY_ASSESSMENT_VERSION,
  type JobIntelligenceResult,
  type JobQualityAssessmentResult,
  type QualityJobInput,
  type QualityProvenanceInput,
  type QualitySourceInput,
} from "./contract";
import { assessDuplication, assessValidationSignal } from "./duplication";
import { decideEligibility } from "./eligibility";
import { assessFreshness } from "./freshness";
import { assessIntelligenceConfidence } from "./intelligence-confidence";
import { assessSourceTrust } from "./source-trust";

export type BuildQualityAssessmentInput = {
  job: QualityJobInput;
  source: QualitySourceInput | null;
  provenance: QualityProvenanceInput | null;
  intelligence: JobIntelligenceResult | null;
  referenceTime: Date;
  assessmentVersion?: string;
  intelligenceProcessorVersion?: string;
  assessedAt?: Date;
};

/**
 * Pure Phase 7 assessment builder. No I/O. Deterministic for same inputs.
 */
export function buildJobQualityAssessment(
  input: BuildQualityAssessmentInput,
): JobQualityAssessmentResult {
  if (!input.job.id?.trim()) {
    throw new Error("job.id is required");
  }
  if (Number.isNaN(input.referenceTime.getTime())) {
    throw new Error("referenceTime must be a valid instant");
  }

  const assessmentVersion = input.assessmentVersion ?? JOB_QUALITY_ASSESSMENT_VERSION;
  const intelligenceProcessorVersion =
    input.intelligenceProcessorVersion ?? DEFAULT_INTELLIGENCE_PROCESSOR_VERSION;
  const assessedAt = input.assessedAt ?? input.referenceTime;

  const completeness = assessCompleteness({
    job: input.job,
    provenance: input.provenance,
    intelligence: input.intelligence,
  });
  const sourceTrust = assessSourceTrust({
    sourceId: input.job.sourceId,
    source: input.source,
  });
  const freshness = assessFreshness({
    job: input.job,
    provenance: input.provenance,
    referenceTime: input.referenceTime,
  });
  const duplication = assessDuplication({ provenance: input.provenance });
  const validation = assessValidationSignal({ provenance: input.provenance });
  const intelligenceConfidence = assessIntelligenceConfidence({
    intelligence: input.intelligence,
    processorVersion: intelligenceProcessorVersion,
  });

  const eligibility = decideEligibility({
    completeness: completeness.assessment,
    sourceTrust: sourceTrust.assessment,
    freshness: freshness.assessment,
    duplication: duplication.assessment,
    validation: validation.assessment,
    intelligenceConfidence: intelligenceConfidence.assessment,
  });

  const checks = [
    ...completeness.checks,
    ...sourceTrust.checks,
    ...freshness.checks,
    ...duplication.checks,
    ...validation.checks,
    ...intelligenceConfidence.checks,
  ].sort((a, b) => a.rule.localeCompare(b.rule));

  return {
    jobId: input.job.id,
    assessmentVersion,
    assessedAt: assessedAt.toISOString(),
    referenceTime: input.referenceTime.toISOString(),
    intelligenceProcessorVersion,
    checks,
    completeness: completeness.assessment,
    sourceTrust: sourceTrust.assessment,
    freshness: freshness.assessment,
    duplication: duplication.assessment,
    validation: validation.assessment,
    intelligenceConfidence: intelligenceConfidence.assessment,
    eligibility: eligibility.eligibility,
    reasons: eligibility.reasons,
  };
}
