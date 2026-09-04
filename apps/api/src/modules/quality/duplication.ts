import {
  QUALITY_CHECK_STATUS,
  QUALITY_SEVERITY,
  QUALITY_SIGNAL_AVAILABILITY,
  type DuplicationAssessment,
  type QualityProvenanceInput,
  type QualityRuleCheck,
  type ValidationSignalAssessment,
} from "./contract";

/**
 * Consume Phase 5 deduplication from Evidence.metadata when present.
 * Do not recompute identity. UNKNOWN when the historical decision is unavailable.
 */
export function assessDuplication(input: {
  provenance: QualityProvenanceInput | null;
}): { assessment: DuplicationAssessment; checks: QualityRuleCheck[] } {
  const status = input.provenance?.dedupStatus;
  if (status) {
    const assessment: DuplicationAssessment = {
      status,
      availability: QUALITY_SIGNAL_AVAILABILITY.AVAILABLE,
      method: "EVIDENCE_METADATA",
      reason: "Consumed Evidence.metadata.dedupStatus from Phase 5.8",
    };
    return { assessment, checks: duplicationChecks(assessment) };
  }

  const assessment: DuplicationAssessment = {
    status: "UNKNOWN",
    availability: QUALITY_SIGNAL_AVAILABILITY.UNKNOWN,
    method: "UNAVAILABLE",
    reason:
      "Phase 5 deduplication status is not persisted on Job and Evidence.metadata.dedupStatus is unavailable",
  };
  return { assessment, checks: duplicationChecks(assessment) };
}

function duplicationChecks(assessment: DuplicationAssessment): QualityRuleCheck[] {
  if (assessment.status === "DUPLICATE") {
    return [
      {
        rule: "DEDUPLICATION",
        status: QUALITY_CHECK_STATUS.FAIL,
        severity: QUALITY_SEVERITY.ERROR,
        message: "DUPLICATE — exclude from current analytical aggregation",
      },
    ];
  }
  if (assessment.status === "POSSIBLE_DUPLICATE" || assessment.status === "UNKNOWN") {
    return [
      {
        rule: "DEDUPLICATION",
        status: QUALITY_CHECK_STATUS.WARN,
        severity: QUALITY_SEVERITY.WARNING,
        message: `Duplication status is ${assessment.status}`,
      },
    ];
  }
  return [
    {
      rule: "DEDUPLICATION",
      status: QUALITY_CHECK_STATUS.PASS,
      severity: QUALITY_SEVERITY.INFO,
      message: "Duplication status is UNIQUE",
    },
  ];
}

/**
 * Consume Phase 5 validation status from Evidence.metadata when present.
 * Job existence does not invent VALID — missing metadata remains UNKNOWN.
 */
export function assessValidationSignal(input: {
  provenance: QualityProvenanceInput | null;
}): { assessment: ValidationSignalAssessment; checks: QualityRuleCheck[] } {
  const status = input.provenance?.validationStatus;
  if (status) {
    const assessment: ValidationSignalAssessment = {
      status,
      availability: QUALITY_SIGNAL_AVAILABILITY.AVAILABLE,
      method: "EVIDENCE_METADATA",
      reason: "Consumed Evidence.metadata.validationStatus from Phase 5.8",
    };
    return {
      assessment,
      checks: [
        {
          rule: "VALIDATION_SIGNAL",
          status:
            status === "REVIEW" ? QUALITY_CHECK_STATUS.WARN : QUALITY_CHECK_STATUS.PASS,
          severity: status === "REVIEW" ? QUALITY_SEVERITY.WARNING : QUALITY_SEVERITY.INFO,
          message: `Validation status is ${status}`,
        },
      ],
    };
  }

  const assessment: ValidationSignalAssessment = {
    status: "UNKNOWN",
    availability: QUALITY_SIGNAL_AVAILABILITY.UNKNOWN,
    method: "UNAVAILABLE",
    reason:
      "Phase 5 validation status is not on Job and Evidence.metadata.validationStatus is unavailable",
  };
  return {
    assessment,
    checks: [
      {
        rule: "VALIDATION_SIGNAL",
        status: QUALITY_CHECK_STATUS.WARN,
        severity: QUALITY_SEVERITY.WARNING,
        message: assessment.reason,
      },
    ],
  };
}
