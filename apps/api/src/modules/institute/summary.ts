import { AppError } from "../../utils/errors";
import type { SupplyObservation } from "../gaps/contract";
import { loadTrainingPrograms } from "../training/programs";
import {
  summarizeTrainingIntelligence,
  extractTrainingCapacity,
} from "../training/summary";
import type { TrainingProgramView } from "../training/contract";
import {
  capacityFromSupplyObservations,
} from "./capacity";
import {
  buildGeographicCapability,
  buildSkillCapabilities,
} from "./capability";
import type {
  InstituteCapacityObservation,
  InstituteIntelligenceInput,
  InstituteIntelligenceSummary,
} from "./contract";
import {
  DEFAULT_INSTITUTE_RANK_LIMIT,
  INSTITUTE_METHODOLOGY_VERSION,
  MAX_INSTITUTE_RANK_LIMIT,
  CAPABILITY_STATUS,
} from "./policy";
import { buildAllProgramIntelligence, isActiveProgram } from "./programs";
import { buildAllProviderIntelligence } from "./providers";
import { isHighGapSeverity } from "./relevance";

/**
 * Phase 11 institute & program intelligence (institute-v1).
 * Consumes Phase 9 SkillGapSummary + Phase 10 alignments + programs.
 * Does not recompute demand, gaps, or curriculum alignment.
 */
export function summarizeInstituteIntelligence(
  input: InstituteIntelligenceInput,
): InstituteIntelligenceSummary {
  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_INSTITUTE_RANK_LIMIT),
    MAX_INSTITUTE_RANK_LIMIT,
  );

  if (!input.gapSummary?.skills) {
    throw new AppError(400, "gapSummary is required");
  }
  if (!Array.isArray(input.programs)) {
    throw new AppError(400, "programs must be an array");
  }

  const activePrograms = input.programs.filter(isActiveProgram);
  const hasEvidence =
    input.hasProviderProgramEvidence ?? activePrograms.length > 0;
  const capacityObservations = input.capacityObservations ?? [];

  const alignments =
    input.alignments ??
    input.trainingSummary?.programs ??
    [];
  const trainingVersion =
    input.trainingSummary?.trainingVersion ??
    (alignments.length > 0 ? "training-v1" : null);

  const programRows = buildAllProgramIntelligence({
    programs: input.programs,
    gaps: input.gapSummary.skills,
    alignments,
    capacityObservations,
    trainingVersion,
    gapVersion: input.gapSummary.gapVersion,
    activeOnly: true,
  });

  const providerRows = buildAllProviderIntelligence({
    programs: input.programs,
    programRows,
    gaps: input.gapSummary.skills,
    capacityObservations,
    trainingVersion,
    gapVersion: input.gapSummary.gapVersion,
  });

  const skillCapabilities = buildSkillCapabilities({
    gaps: input.gapSummary.skills,
    programs: input.programs,
    capacityObservations,
    hasProviderProgramEvidence: hasEvidence,
    gapVersion: input.gapSummary.gapVersion,
  });

  const geoRef =
    input.geographyFilter ??
    input.gapSummary.skills.find((s) => s.geography.known)?.geography ??
    input.gapSummary.skills[0]?.geography ?? {
      locationId: null,
      country: null,
      state: null,
      district: null,
      city: null,
      known: false,
      level: "UNKNOWN" as const,
    };

  const geography = [
    buildGeographicCapability({
      geography: geoRef,
      skillCapabilities,
      programRows,
    }),
  ];

  const highCaps = skillCapabilities.filter((s) =>
    isHighGapSeverity(s.gapSeverity),
  );
  const skillsCoveredSet = new Set<string>();
  for (const p of activePrograms) {
    for (const s of p.skills) skillsCoveredSet.add(s.skillId);
  }

  const buckets = {
    activeProviders: providerRows.length,
    activePrograms: activePrograms.length,
    relevantPrograms: programRows.filter((p) => p.relevance.score >= 0.35)
      .length,
    skillsCovered: skillsCoveredSet.size,
    highGapWithCapability: highCaps.filter(
      (s) =>
        s.capabilityStatus === CAPABILITY_STATUS.ADEQUATE ||
        s.capabilityStatus === CAPABILITY_STATUS.LIMITED,
    ).length,
    highGapWithoutConfirmedCapability: highCaps.filter(
      (s) =>
        s.capabilityStatus === CAPABILITY_STATUS.MISSING ||
        s.capabilityStatus === CAPABILITY_STATUS.INSUFFICIENT_DATA,
    ).length,
    capabilityAdequate: skillCapabilities.filter(
      (s) => s.capabilityStatus === CAPABILITY_STATUS.ADEQUATE,
    ).length,
    capabilityLimited: skillCapabilities.filter(
      (s) => s.capabilityStatus === CAPABILITY_STATUS.LIMITED,
    ).length,
    capabilityMissing: skillCapabilities.filter(
      (s) => s.capabilityStatus === CAPABILITY_STATUS.MISSING,
    ).length,
    capabilityInsufficientData: skillCapabilities.filter(
      (s) => s.capabilityStatus === CAPABILITY_STATUS.INSUFFICIENT_DATA,
    ).length,
    capacityKnown: skillCapabilities.filter(
      (s) => s.capacity.status !== "UNKNOWN",
    ).length,
    capacityUnknown: skillCapabilities.filter(
      (s) => s.capacity.status === "UNKNOWN",
    ).length,
  };

  return {
    instituteVersion: INSTITUTE_METHODOLOGY_VERSION,
    trainingVersion,
    gapVersion: input.gapSummary.gapVersion,
    demandVersion: input.gapSummary.demandVersion,
    period: input.gapSummary.period,
    programs: programRows.slice(0, rankLimit),
    providers: providerRows.slice(0, rankLimit),
    skillCapabilities: skillCapabilities.slice(0, rankLimit),
    geography,
    buckets,
    topRelevantPrograms: programRows.slice(0, Math.min(10, rankLimit)),
    topCapableProviders: providerRows.slice(0, Math.min(10, rankLimit)),
    limitations: [
      "Phase 11 is analytical only — not institute rankings, marketplace, recommendations, or funding decisions.",
      "TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED.",
      "Skill gap ≠ capability gap. Missing provider data ≠ no provider exists.",
      "Phase 10 curriculum alignment is consumed, not recomputed.",
      "Course has no Location — geographic capability uses gap-context geography.",
      "Synthetic or demo programs are not real institute statistics.",
    ],
    notes: [
      "institute-v1 consumes gap-v1 and training-v1 without recomputation.",
      "Provider = Organization (TRAINING_INSTITUTE); Program = Course/Curriculum.",
      ...input.gapSummary.notes.slice(0, 2),
    ],
  };
}

/**
 * Convenience: load DB programs, optionally run Phase 10, then Phase 11.
 */
export async function summarizeInstituteIntelligenceFromDb(input: {
  gapSummary: InstituteIntelligenceInput["gapSummary"];
  supplyObservations?: readonly SupplyObservation[];
  capacityObservations?: readonly InstituteCapacityObservation[];
  courseIds?: string[];
  includeDemo?: boolean;
  rankLimit?: number;
  runPhase10?: boolean;
}): Promise<InstituteIntelligenceSummary> {
  const programs: TrainingProgramView[] = await loadTrainingPrograms({
    courseIds: input.courseIds,
    includeDemo: input.includeDemo ?? true,
  });

  let trainingSummary = null;
  if (input.runPhase10 !== false) {
    const trainingCapacityBySkill = input.supplyObservations
      ? extractTrainingCapacity(input.supplyObservations)
      : undefined;
    trainingSummary = summarizeTrainingIntelligence({
      gapSummary: input.gapSummary,
      programs,
      trainingCapacityBySkill,
      rankLimit: input.rankLimit,
    });
  }

  const capacityObservations =
    input.capacityObservations ??
    (input.supplyObservations
      ? capacityFromSupplyObservations(input.supplyObservations)
      : []);

  return summarizeInstituteIntelligence({
    gapSummary: input.gapSummary,
    programs,
    trainingSummary,
    capacityObservations,
    rankLimit: input.rankLimit,
  });
}
