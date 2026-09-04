import { createHash } from "node:crypto";
import {
  QUALITY_CHANGE_COMPONENT,
  type JobQualityAssessmentResult,
  type QualityChangeComponent,
  type QualityChangeDetection,
  type QualityHistorySnapshot,
} from "./contract";

/**
 * Deterministic JSON with sorted object keys. Arrays keep caller order
 * (callers must pre-sort when order is semantic).
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    out[key] = sortKeys(record[key]);
  }
  return out;
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("hex");
}

type FingerprintComponents = {
  validation: unknown;
  completeness: unknown;
  sourceTrust: unknown;
  freshness: unknown;
  duplication: unknown;
  intelligenceConfidence: unknown;
  eligibility: unknown;
  evidence: unknown;
};

/**
 * Stable quality components for fingerprinting.
 * Excludes assessedAt, createdAt, updatedAt, checks prose, previousAssessment,
 * raw payloads, and secrets. Self-contained from the assessment result.
 */
export function buildQualityFingerprintPayload(
  assessment: Omit<JobQualityAssessmentResult, "fingerprint" | "previousAssessment">,
): FingerprintComponents {
  return {
    validation: {
      status: assessment.validation.status,
      availability: assessment.validation.availability,
      method: assessment.validation.method,
    },
    completeness: {
      score: assessment.completeness.score,
      presentFields: [...assessment.completeness.presentFields].sort((a, b) =>
        a.localeCompare(b),
      ),
      missingFields: [...assessment.completeness.missingFields].sort((a, b) =>
        a.localeCompare(b),
      ),
    },
    sourceTrust: {
      sourceId: assessment.sourceTrust.sourceId,
      sourceCode: assessment.sourceTrust.sourceCode,
      trustLevel: assessment.sourceTrust.trustLevel,
      method: assessment.sourceTrust.method,
      active: assessment.sourceTrust.active,
    },
    freshness: {
      status: assessment.freshness.status,
      availability: assessment.freshness.availability,
      method: assessment.freshness.method,
      postedAt: assessment.freshness.postedAt,
      expiresAt: assessment.freshness.expiresAt,
      observedAt: assessment.freshness.observedAt,
      referenceTime: assessment.freshness.referenceTime,
    },
    duplication: {
      status: assessment.duplication.status,
      availability: assessment.duplication.availability,
      method: assessment.duplication.method,
    },
    intelligenceConfidence: {
      overall: assessment.intelligenceConfidence.overall,
      processorVersion: assessment.intelligenceConfidence.processorVersion,
      available: assessment.intelligenceConfidence.available,
      contributing: [...assessment.intelligenceConfidence.contributing]
        .map((row) => ({
          signal: row.signal,
          confidenceTier: row.confidenceTier,
        }))
        .sort((a, b) => a.signal.localeCompare(b.signal)),
    },
    eligibility: {
      eligibility: assessment.eligibility,
      reasonCodes: assessment.reasons.map((row) => row.code).sort((a, b) => a.localeCompare(b)),
    },
    evidence: {
      evidenceId: assessment.evidence?.evidenceId ?? null,
      observationId: assessment.evidence?.observationId ?? null,
      observedAt: assessment.freshness.observedAt,
      validationStatus: assessment.validation.status,
      dedupStatus: assessment.duplication.status,
    },
  };
}

export function computeQualityFingerprint(
  assessment: Omit<JobQualityAssessmentResult, "fingerprint" | "previousAssessment">,
): string {
  return sha256Canonical(buildQualityFingerprintPayload(assessment));
}

export function componentFingerprints(
  assessment: Omit<JobQualityAssessmentResult, "fingerprint" | "previousAssessment">,
): Record<QualityChangeComponent, string> {
  const payload = buildQualityFingerprintPayload(assessment);
  return {
    [QUALITY_CHANGE_COMPONENT.VALIDATION]: sha256Canonical(payload.validation),
    [QUALITY_CHANGE_COMPONENT.COMPLETENESS]: sha256Canonical(payload.completeness),
    [QUALITY_CHANGE_COMPONENT.SOURCE_TRUST]: sha256Canonical(payload.sourceTrust),
    [QUALITY_CHANGE_COMPONENT.FRESHNESS]: sha256Canonical(payload.freshness),
    [QUALITY_CHANGE_COMPONENT.DUPLICATION]: sha256Canonical(payload.duplication),
    [QUALITY_CHANGE_COMPONENT.INTELLIGENCE_CONFIDENCE]: sha256Canonical(
      payload.intelligenceConfidence,
    ),
    [QUALITY_CHANGE_COMPONENT.ELIGIBILITY]: sha256Canonical(payload.eligibility),
    [QUALITY_CHANGE_COMPONENT.EVIDENCE]: sha256Canonical(payload.evidence),
  };
}

/**
 * Compare two assessments for quality change detection (Phase 7.8).
 */
export function detectQualityChange(input: {
  previous: JobQualityAssessmentResult | null | undefined;
  current: Omit<JobQualityAssessmentResult, "fingerprint" | "previousAssessment"> & {
    fingerprint?: string;
  };
}): QualityChangeDetection {
  const currentFingerprint =
    input.current.fingerprint ?? computeQualityFingerprint(input.current);

  if (!input.previous) {
    return {
      changed: true,
      currentFingerprint,
      changedComponents: Object.values(QUALITY_CHANGE_COMPONENT),
    };
  }

  const previousFingerprint =
    input.previous.fingerprint || computeQualityFingerprint(input.previous);

  if (previousFingerprint === currentFingerprint) {
    return {
      changed: false,
      previousFingerprint,
      currentFingerprint,
      changedComponents: [],
    };
  }

  const previousComponents = componentFingerprints(input.previous);
  const currentComponents = componentFingerprints(input.current);
  const changedComponents = (
    Object.keys(QUALITY_CHANGE_COMPONENT) as Array<keyof typeof QUALITY_CHANGE_COMPONENT>
  )
    .map((key) => QUALITY_CHANGE_COMPONENT[key])
    .filter((component) => previousComponents[component] !== currentComponents[component])
    .sort((a, b) => a.localeCompare(b));

  return {
    changed: true,
    previousFingerprint,
    currentFingerprint,
    changedComponents,
  };
}

export function toHistorySnapshot(
  assessment: JobQualityAssessmentResult,
): QualityHistorySnapshot {
  return {
    fingerprint: assessment.fingerprint,
    assessedAt: assessment.assessedAt,
    eligibility: assessment.eligibility,
    completenessScore: assessment.completeness.score,
    freshnessStatus: assessment.freshness.status,
    duplicationStatus: assessment.duplication.status,
    sourceTrustLevel: assessment.sourceTrust.trustLevel,
    intelligenceOverall: assessment.intelligenceConfidence.overall,
    reasons: [...assessment.reasons].sort((a, b) => a.code.localeCompare(b.code)),
  };
}

export function stripNestedHistory(
  assessment: JobQualityAssessmentResult,
): JobQualityAssessmentResult {
  const { previousAssessment: _ignored, ...rest } = assessment;
  return rest;
}
