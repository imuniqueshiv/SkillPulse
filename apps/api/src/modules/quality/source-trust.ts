import {
  QUALITY_CHECK_STATUS,
  QUALITY_SEVERITY,
  SOURCE_TRUST_LEVEL,
  SOURCE_TRUST_METHOD,
  type QualityRuleCheck,
  type QualitySourceInput,
  type SourceTrustAssessment,
} from "./contract";

/**
 * Source trust from the DataSource registry only.
 *
 * Semantics (deterministic, no invented reliability claims):
 * - VERIFIED / TRUSTED: reserved for explicit future verification metadata.
 *   Current schema has no verification flag; these levels are never assigned.
 * - STANDARD: active registered DataSource exists (known identity, not verified).
 * - UNVERIFIED: missing source, inactive source, or unresolved registry row.
 *
 * DataSource.reliability is ignored when null (seed default). Non-null values
 * are not interpreted as VERIFIED without separate verification metadata.
 */
export function assessSourceTrust(input: {
  sourceId: string | null;
  source: QualitySourceInput | null;
}): { assessment: SourceTrustAssessment; checks: QualityRuleCheck[] } {
  if (!input.sourceId) {
    const assessment: SourceTrustAssessment = {
      sourceId: null,
      sourceCode: null,
      trustLevel: SOURCE_TRUST_LEVEL.UNVERIFIED,
      method: SOURCE_TRUST_METHOD.NO_SOURCE,
      reason: "Job has no sourceId",
      active: null,
    };
    return {
      assessment,
      checks: [
        {
          rule: "SOURCE_TRUST",
          status: QUALITY_CHECK_STATUS.FAIL,
          severity: QUALITY_SEVERITY.ERROR,
          message: assessment.reason,
        },
      ],
    };
  }

  if (!input.source) {
    const assessment: SourceTrustAssessment = {
      sourceId: input.sourceId,
      sourceCode: null,
      trustLevel: SOURCE_TRUST_LEVEL.UNVERIFIED,
      method: SOURCE_TRUST_METHOD.SOURCE_REGISTRY,
      reason: "sourceId does not resolve to a DataSource registry row",
      active: null,
    };
    return {
      assessment,
      checks: [
        {
          rule: "SOURCE_TRUST",
          status: QUALITY_CHECK_STATUS.WARN,
          severity: QUALITY_SEVERITY.WARNING,
          message: assessment.reason,
        },
      ],
    };
  }

  if (!input.source.active) {
    const assessment: SourceTrustAssessment = {
      sourceId: input.source.id,
      sourceCode: input.source.code,
      trustLevel: SOURCE_TRUST_LEVEL.UNVERIFIED,
      method: SOURCE_TRUST_METHOD.SOURCE_REGISTRY,
      reason: "DataSource is inactive; no independent verification metadata is available",
      active: false,
    };
    return {
      assessment,
      checks: [
        {
          rule: "SOURCE_TRUST",
          status: QUALITY_CHECK_STATUS.WARN,
          severity: QUALITY_SEVERITY.WARNING,
          message: assessment.reason,
        },
      ],
    };
  }

  const assessment: SourceTrustAssessment = {
    sourceId: input.source.id,
    sourceCode: input.source.code,
    trustLevel: SOURCE_TRUST_LEVEL.STANDARD,
    method: SOURCE_TRUST_METHOD.SOURCE_REGISTRY,
    reason:
      "Active DataSource registry identity is present. No explicit verification metadata is available, so trust is STANDARD not VERIFIED.",
    active: true,
  };
  return {
    assessment,
    checks: [
      {
        rule: "SOURCE_TRUST",
        status: QUALITY_CHECK_STATUS.PASS,
        severity: QUALITY_SEVERITY.INFO,
        message: assessment.reason,
      },
    ],
  };
}
