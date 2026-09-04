import {
  QUALITY_ELIGIBILITY,
  QUALITY_REASON_CODE,
  SOURCE_TRUST_LEVEL,
  type CompletenessAssessment,
  type DuplicationAssessment,
  type EligibilityDecision,
  type FreshnessAssessment,
  type IntelligenceConfidenceAssessment,
  type QualityReason,
  type SourceTrustAssessment,
  type ValidationSignalAssessment,
} from "./contract";

const LOW_COMPLETENESS_THRESHOLD = 0.55;

/**
 * Analytical eligibility for Phase 8 consumption.
 *
 * EXCLUDE takes precedence, then INCLUDE_WITH_CAUTION, else INCLUDE.
 *
 * UNKNOWN handling (conservative):
 * - UNKNOWN freshness → caution (not exclude)
 * - UNKNOWN duplication → caution (not exclude)
 * - UNKNOWN intelligence → caution (not exclude)
 * - UNKNOWN validation → caution only; not exclude solely for that
 * - STALE / DUPLICATE / missing CRITICAL observed fields → exclude
 */
export function decideEligibility(input: {
  completeness: CompletenessAssessment;
  sourceTrust: SourceTrustAssessment;
  freshness: FreshnessAssessment;
  duplication: DuplicationAssessment;
  validation: ValidationSignalAssessment;
  intelligenceConfidence: IntelligenceConfidenceAssessment;
}): EligibilityDecision {
  const exclude: QualityReason[] = [];
  const caution: QualityReason[] = [];

  const missingCritical = input.completeness.fields.filter(
    (row) => row.weight === "CRITICAL" && !row.present,
  );
  for (const field of missingCritical) {
    if (field.field === "title") {
      exclude.push({
        code: QUALITY_REASON_CODE.MISSING_TITLE,
        message: "Critical observed field title is missing",
      });
    } else if (field.field === "source") {
      exclude.push({
        code: QUALITY_REASON_CODE.MISSING_SOURCE,
        message: "Critical observed field source is missing",
      });
    } else if (field.field === "observedAt") {
      exclude.push({
        code: QUALITY_REASON_CODE.MISSING_OBSERVED_AT,
        message: "Critical observation timestamp is unavailable",
      });
    } else {
      exclude.push({
        code: QUALITY_REASON_CODE.INVALID_RECORD,
        message: `Critical field ${field.field} is missing`,
      });
    }
  }

  if (input.duplication.status === "DUPLICATE") {
    exclude.push({
      code: QUALITY_REASON_CODE.DUPLICATE,
      message: "Duplicate observation is excluded from current analytical aggregation",
    });
  }

  if (input.freshness.status === "STALE") {
    exclude.push({
      code: QUALITY_REASON_CODE.STALE_DATA,
      message: "Record is stale for current time-sensitive analysis",
    });
  }

  if (input.validation.status === "REJECTED") {
    exclude.push({
      code: QUALITY_REASON_CODE.INVALID_RECORD,
      message: "Validation status is REJECTED",
    });
  }

  if (exclude.length > 0) {
    return {
      eligibility: QUALITY_ELIGIBILITY.EXCLUDE,
      reasons: dedupeReasons(exclude),
    };
  }

  if (input.freshness.status === "AGING") {
    caution.push({
      code: QUALITY_REASON_CODE.AGING_DATA,
      message: "Record is aging for current time-sensitive analysis",
    });
  }
  if (input.freshness.status === "UNKNOWN") {
    caution.push({
      code: QUALITY_REASON_CODE.UNKNOWN_FRESHNESS,
      message: "Freshness is UNKNOWN; not treated as trustworthy for current-time use",
    });
  }

  if (input.duplication.status === "POSSIBLE_DUPLICATE") {
    caution.push({
      code: QUALITY_REASON_CODE.POSSIBLE_DUPLICATE,
      message: "Possible duplicate — usable with caution",
    });
  }
  if (input.duplication.status === "UNKNOWN") {
    caution.push({
      code: QUALITY_REASON_CODE.UNKNOWN_DEDUPLICATION,
      message: "Deduplication status is UNKNOWN",
    });
  }

  if (input.sourceTrust.trustLevel === SOURCE_TRUST_LEVEL.UNVERIFIED) {
    caution.push({
      code: QUALITY_REASON_CODE.LOW_SOURCE_TRUST,
      message: "Source trust is UNVERIFIED",
    });
  }

  if (!input.completeness.presentFields.includes("description")) {
    caution.push({
      code: QUALITY_REASON_CODE.MISSING_DESCRIPTION,
      message: "Description is missing",
    });
  }
  if (!input.completeness.presentFields.includes("location")) {
    caution.push({
      code: QUALITY_REASON_CODE.MISSING_LOCATION,
      message: "Location is missing on Job",
    });
  }
  if (input.completeness.score < LOW_COMPLETENESS_THRESHOLD) {
    caution.push({
      code: QUALITY_REASON_CODE.LOW_COMPLETENESS,
      message: `Completeness score ${input.completeness.score} is below ${LOW_COMPLETENESS_THRESHOLD}`,
    });
  }

  if (input.intelligenceConfidence.overall === "LOW") {
    caution.push({
      code: QUALITY_REASON_CODE.LOW_INTELLIGENCE_CONFIDENCE,
      message: "Overall intelligence confidence is LOW",
    });
  } else if (input.intelligenceConfidence.overall === "MEDIUM") {
    caution.push({
      code: QUALITY_REASON_CODE.MEDIUM_INTELLIGENCE_CONFIDENCE,
      message: "Overall intelligence confidence is MEDIUM",
    });
  } else if (input.intelligenceConfidence.overall === "UNKNOWN") {
    caution.push({
      code: QUALITY_REASON_CODE.UNKNOWN_INTELLIGENCE,
      message: "No meaningful Phase 6 intelligence confidence is available",
    });
  }

  if (input.validation.status === "REVIEW") {
    caution.push({
      code: QUALITY_REASON_CODE.REVIEW_VALIDATION,
      message: "Phase 5 validation status is REVIEW",
    });
  }
  if (input.validation.status === "UNKNOWN") {
    caution.push({
      code: QUALITY_REASON_CODE.UNKNOWN_VALIDATION,
      message: "Phase 5 validation status is UNKNOWN (not treated as EXCLUDE alone)",
    });
  }

  if (caution.length > 0) {
    return {
      eligibility: QUALITY_ELIGIBILITY.INCLUDE_WITH_CAUTION,
      reasons: dedupeReasons(caution),
    };
  }

  return {
    eligibility: QUALITY_ELIGIBILITY.INCLUDE,
    reasons: [],
  };
}

function dedupeReasons(reasons: QualityReason[]): QualityReason[] {
  const seen = new Set<string>();
  const out: QualityReason[] = [];
  for (const reason of reasons) {
    if (seen.has(reason.code)) {
      continue;
    }
    seen.add(reason.code);
    out.push(reason);
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
}
