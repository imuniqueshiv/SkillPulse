import type { SkillGapRow } from "../gaps/contract";
import type { TrainingProgramView } from "../training/contract";
import { aggregateCapacity, emptyCapacity } from "./capacity";
import {
  computeCapabilityCoverage,
  buildSkillCapability,
} from "./capability";
import type {
  InstituteCapacityObservation,
  ProgramIntelligenceRow,
  ProviderIntelligenceRow,
  SkillCapabilityRow,
} from "./contract";
import {
  INSTITUTE_CONFIDENCE,
  INSTITUTE_METHODOLOGY_VERSION,
  type InstituteConfidence,
} from "./policy";
import { isActiveProgram, programSkillIds } from "./programs";
import {
  computeProviderCapabilityScore,
  degradeConfidence,
  isHighGapSeverity,
} from "./relevance";

export function buildProviderIntelligence(input: {
  providerId: string;
  providerName: string | null;
  programs: readonly TrainingProgramView[];
  programRows: readonly ProgramIntelligenceRow[];
  gaps: readonly SkillGapRow[];
  capacityObservations: readonly InstituteCapacityObservation[];
  trainingVersion: string | null;
  gapVersion: string;
}): ProviderIntelligenceRow {
  const providerPrograms = input.programs.filter(
    (p) => p.organizationId === input.providerId && isActiveProgram(p),
  );
  const rows = input.programRows.filter(
    (p) => p.providerId === input.providerId && p.isActive,
  );

  const skillSet = new Set<string>();
  for (const p of providerPrograms) {
    for (const id of programSkillIds(p)) skillSet.add(id);
  }
  const skillsCovered = [...skillSet].sort();

  const highGaps = input.gaps.filter((g) => isHighGapSeverity(g.severity));
  const highGapSkillsCovered = highGaps
    .filter((g) => skillSet.has(g.skillId))
    .map((g) => g.skillId);
  const highGapSkillsMissing = highGaps
    .filter((g) => !skillSet.has(g.skillId))
    .map((g) => g.skillId);

  const relevantProgramCount = rows.filter(
    (r) => r.relevance.score >= 0.35 || r.coveredGapSkills.some((g) => isHighGapSeverity(g.gapSeverity)),
  ).length;

  const maxShortage = Math.max(
    0,
    ...highGaps
      .filter((g) => skillSet.has(g.skillId))
      .map((g) => g.metrics.shortageQuantity),
  );

  const capacity =
    providerPrograms.length > 0
      ? aggregateCapacity(
          input.capacityObservations,
          { providerId: input.providerId },
          maxShortage || undefined,
        )
      : emptyCapacity();

  // Provider-scoped skill capabilities for coverage ratio
  const scopedCaps: SkillCapabilityRow[] = highGaps.map((gap) =>
    buildSkillCapability({
      gap,
      programs: providerPrograms,
      capacityObservations: input.capacityObservations.filter(
        (o) => o.providerId === input.providerId || o.providerId === null,
      ),
      programCountInAnalysis: providerPrograms.length,
      providerCountInAnalysis: 1,
      hasProviderProgramEvidence: providerPrograms.length > 0,
      gapVersion: input.gapVersion,
    }),
  );
  const capabilityCoverage = computeCapabilityCoverage(scopedCaps);

  const alignmentValues = rows
    .map((r) => r.alignment?.alignment)
    .filter((a): a is NonNullable<typeof a> => a != null);
  const bestAlignment =
    alignmentValues.sort(
      (a, b) => (ALIGNMENT_RANK[b] ?? 0) - (ALIGNMENT_RANK[a] ?? 0),
    )[0] ?? null;

  const confidence: InstituteConfidence = degradeConfidence([
    ...rows.map((r) => r.confidence),
    capacity.observationCount > 0
      ? INSTITUTE_CONFIDENCE.MEDIUM
      : INSTITUTE_CONFIDENCE.LOW,
  ]);

  const capabilityScore = computeProviderCapabilityScore({
    highGapCovered: highGapSkillsCovered.length,
    highGapTotal: highGaps.length,
    skillsCovered: skillsCovered.length,
    marketSkillCount: input.gaps.length,
    bestAlignment,
    capacity,
    confidence,
  });

  return {
    providerId: input.providerId,
    providerName: input.providerName,
    providerType: "TRAINING_INSTITUTE",
    activeProgramCount: providerPrograms.length,
    relevantProgramCount,
    skillsCovered,
    highGapSkillsCovered,
    highGapSkillsMissing,
    programs: rows
      .map((r) => ({
        programId: r.programId,
        programName: r.programName,
        alignment: r.alignment?.alignment ?? null,
        relevanceScore: r.relevance.score,
      }))
      .sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        return a.programName.localeCompare(b.programName);
      }),
    capacity,
    capabilityCoverage,
    capabilityScore,
    confidence,
    evidence: {
      organizationId: input.providerId,
      programIds: providerPrograms.map((p) => p.programId).sort(),
      gapVersion: input.gapVersion,
      trainingVersion: input.trainingVersion,
    },
    notes: [
      "Provider Capability Score is decision-support — not a best-institute ranking.",
      "Program-level detail is retained; contradictory program evidence is not hidden.",
    ],
    policyVersion: INSTITUTE_METHODOLOGY_VERSION,
  };
}

const ALIGNMENT_RANK: Record<string, number> = {
  STRONG: 4,
  MODERATE: 3,
  WEAK: 2,
  INSUFFICIENT_DATA: 1,
};

export function buildAllProviderIntelligence(input: {
  programs: readonly TrainingProgramView[];
  programRows: readonly ProgramIntelligenceRow[];
  gaps: readonly SkillGapRow[];
  capacityObservations: readonly InstituteCapacityObservation[];
  trainingVersion: string | null;
  gapVersion: string;
}): ProviderIntelligenceRow[] {
  const byProvider = new Map<
    string,
    { providerId: string; providerName: string | null }
  >();
  for (const p of input.programs) {
    if (!isActiveProgram(p)) continue;
    if (!byProvider.has(p.organizationId)) {
      byProvider.set(p.organizationId, {
        providerId: p.organizationId,
        providerName: p.organizationName,
      });
    }
  }

  return [...byProvider.values()]
    .map((prov) =>
      buildProviderIntelligence({
        ...prov,
        programs: input.programs,
        programRows: input.programRows,
        gaps: input.gaps,
        capacityObservations: input.capacityObservations,
        trainingVersion: input.trainingVersion,
        gapVersion: input.gapVersion,
      }),
    )
    .sort((a, b) => {
      if (b.capabilityScore.score !== a.capabilityScore.score) {
        return b.capabilityScore.score - a.capabilityScore.score;
      }
      return (a.providerName ?? a.providerId).localeCompare(
        b.providerName ?? b.providerId,
      );
    });
}
