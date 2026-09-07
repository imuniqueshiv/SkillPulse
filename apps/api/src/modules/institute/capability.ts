import type { GapGeographyRef, SkillGapRow } from "../gaps/contract";
import type { TrainingProgramView } from "../training/contract";
import { aggregateCapacity } from "./capacity";
import type {
  GeographicCapabilityRow,
  InstituteCapacityObservation,
  ProgramIntelligenceRow,
  SkillCapabilityRow,
} from "./contract";
import {
  CAPABILITY_COVERAGE_THRESHOLD,
  CAPABILITY_STATUS,
  INSTITUTE_CONFIDENCE,
  INSTITUTE_METHODOLOGY_VERSION,
  MIN_PROGRAMS_FOR_MISSING_CLAIM,
  type CapabilityStatus,
  type InstituteConfidence,
} from "./policy";
import { getProgramsForSkill, getProvidersForSkill } from "./programs";
import { degradeConfidence, isHighGapSeverity } from "./relevance";

/**
 * Capability gap ≠ skill gap.
 * NO PROVIDER DATA → INSUFFICIENT_DATA (never auto-MISSING).
 */
export function classifyCapabilityStatus(input: {
  programsCovering: number;
  capacityStatus: string;
  programCountInAnalysis: number;
  hasProviderProgramEvidence: boolean;
}): CapabilityStatus {
  if (
    !input.hasProviderProgramEvidence ||
    input.programCountInAnalysis < MIN_PROGRAMS_FOR_MISSING_CLAIM
  ) {
    return CAPABILITY_STATUS.INSUFFICIENT_DATA;
  }
  if (input.programsCovering <= 0) {
    return CAPABILITY_STATUS.MISSING;
  }
  if (
    input.capacityStatus === "INSUFFICIENT" ||
    input.capacityStatus === "UNAVAILABLE"
  ) {
    return CAPABILITY_STATUS.LIMITED;
  }
  return CAPABILITY_STATUS.ADEQUATE;
}

/**
 * Demand/shortage-weighted capability coverage.
 * coveredWeighted / relevantWeighted — never NaN/Infinity.
 */
export function computeCapabilityCoverage(
  skills: readonly SkillCapabilityRow[],
): number | null {
  let covered = 0;
  let total = 0;
  for (const s of skills) {
    const w = Math.max(s.shortageQuantity, s.demandQuantity, 0);
    if (w <= 0) continue;
    total += w;
    if (
      s.capabilityStatus === CAPABILITY_STATUS.ADEQUATE ||
      s.capabilityStatus === CAPABILITY_STATUS.LIMITED
    ) {
      covered +=
        s.capabilityStatus === CAPABILITY_STATUS.ADEQUATE ? w : w * 0.5;
    }
  }
  if (total <= 0) return null;
  const ratio = covered / total;
  if (!Number.isFinite(ratio)) return null;
  return Number(ratio.toFixed(6));
}

export function classifyCoverageBand(
  coverage: number | null,
): CapabilityStatus {
  if (coverage === null) return CAPABILITY_STATUS.INSUFFICIENT_DATA;
  if (coverage >= CAPABILITY_COVERAGE_THRESHOLD.ADEQUATE) {
    return CAPABILITY_STATUS.ADEQUATE;
  }
  if (coverage >= CAPABILITY_COVERAGE_THRESHOLD.LIMITED) {
    return CAPABILITY_STATUS.LIMITED;
  }
  return CAPABILITY_STATUS.MISSING;
}

export function buildSkillCapability(input: {
  gap: SkillGapRow;
  programs: readonly TrainingProgramView[];
  capacityObservations: readonly InstituteCapacityObservation[];
  programCountInAnalysis: number;
  providerCountInAnalysis: number;
  hasProviderProgramEvidence: boolean;
  gapVersion: string;
}): SkillCapabilityRow {
  const coveringPrograms = getProgramsForSkill(
    input.programs,
    input.gap.skillId,
  );
  const coveringProviders = getProvidersForSkill(
    input.programs,
    input.gap.skillId,
  );
  const capacity = aggregateCapacity(
    input.capacityObservations,
    { skillId: input.gap.skillId },
    input.gap.metrics.shortageQuantity,
  );

  const capabilityStatus = classifyCapabilityStatus({
    programsCovering: coveringPrograms.length,
    capacityStatus: capacity.status,
    programCountInAnalysis: input.programCountInAnalysis,
    hasProviderProgramEvidence: input.hasProviderProgramEvidence,
  });

  const confidence: InstituteConfidence = degradeConfidence([
    input.gap.confidence as InstituteConfidence,
    coveringPrograms.length > 0
      ? INSTITUTE_CONFIDENCE.MEDIUM
      : INSTITUTE_CONFIDENCE.LOW,
    capacity.observationCount > 0
      ? INSTITUTE_CONFIDENCE.MEDIUM
      : INSTITUTE_CONFIDENCE.LOW,
  ]);

  const notes: string[] = [
    "Capability gap is distinct from Phase 9 skill gap.",
  ];
  if (capabilityStatus === CAPABILITY_STATUS.INSUFFICIENT_DATA) {
    notes.push(
      "No confirmed provider/program evidence — INSUFFICIENT_DATA, not MISSING.",
    );
  }

  return {
    skillId: input.gap.skillId,
    canonicalName: input.gap.canonicalName,
    name: input.gap.name,
    gapSeverity: input.gap.severity,
    demandQuantity: input.gap.metrics.demandQuantity,
    shortageQuantity: input.gap.metrics.shortageQuantity,
    programsCovering: coveringPrograms.map((p) => ({
      programId: p.programId,
      providerId: p.organizationId,
      programName: p.courseName,
    })),
    providersCovering: coveringProviders.map((p) => ({
      providerId: p.providerId,
      providerName: p.providerName,
    })),
    capacity,
    capabilityStatus,
    confidence,
    evidence: {
      gapVersion: input.gapVersion,
      programCountInAnalysis: input.programCountInAnalysis,
      providerCountInAnalysis: input.providerCountInAnalysis,
    },
    notes,
    policyVersion: INSTITUTE_METHODOLOGY_VERSION,
  };
}

export function buildSkillCapabilities(input: {
  gaps: readonly SkillGapRow[];
  programs: readonly TrainingProgramView[];
  capacityObservations: readonly InstituteCapacityObservation[];
  hasProviderProgramEvidence: boolean;
  gapVersion: string;
}): SkillCapabilityRow[] {
  const activePrograms = input.programs.filter((p) => p.status === "ACTIVE");
  const providerIds = new Set(activePrograms.map((p) => p.organizationId));
  return input.gaps
    .map((gap) =>
      buildSkillCapability({
        gap,
        programs: activePrograms,
        capacityObservations: input.capacityObservations,
        programCountInAnalysis: activePrograms.length,
        providerCountInAnalysis: providerIds.size,
        hasProviderProgramEvidence: input.hasProviderProgramEvidence,
        gapVersion: input.gapVersion,
      }),
    )
    .sort((a, b) => {
      if (b.shortageQuantity !== a.shortageQuantity) {
        return b.shortageQuantity - a.shortageQuantity;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    });
}

export function buildGeographicCapability(input: {
  geography: GapGeographyRef;
  skillCapabilities: readonly SkillCapabilityRow[];
  programRows: readonly ProgramIntelligenceRow[];
}): GeographicCapabilityRow {
  const high = input.skillCapabilities.filter((s) =>
    isHighGapSeverity(s.gapSeverity),
  );
  let covered = 0;
  let missing = 0;
  let insuff = 0;
  for (const s of high) {
    if (
      s.capabilityStatus === CAPABILITY_STATUS.ADEQUATE ||
      s.capabilityStatus === CAPABILITY_STATUS.LIMITED
    ) {
      covered += 1;
    } else if (s.capabilityStatus === CAPABILITY_STATUS.MISSING) {
      missing += 1;
    } else {
      insuff += 1;
    }
  }

  const providerIds = new Set(input.programRows.map((p) => p.providerId));
  const capacityKnown = high.filter(
    (s) => s.capacity.status !== "UNKNOWN",
  ).length;
  const capacityUnknown = high.length - capacityKnown;
  const coverage = computeCapabilityCoverage(high);
  const confidence = degradeConfidence(high.map((s) => s.confidence));

  return {
    geography: input.geography,
    highGapSkillCount: high.length,
    highGapSkillsCovered: covered,
    highGapSkillsMissing: missing,
    highGapSkillsInsufficientData: insuff,
    capabilityCoverage: coverage,
    programs: input.programRows.length,
    providers: providerIds.size,
    capacityKnown,
    capacityUnknown,
    skills: high,
    confidence,
    notes: [
      "Geographic capability uses analysis-set programs; Course has no Location — geo from gap context.",
    ],
    policyVersion: INSTITUTE_METHODOLOGY_VERSION,
  };
}
