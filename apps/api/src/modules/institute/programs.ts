import type { SkillGapRow } from "../gaps/contract";
import type {
  ProgramAlignmentRow,
  TrainingProgramView,
} from "../training/contract";
import { aggregateCapacity, emptyCapacity } from "./capacity";
import type {
  InstituteCapacityObservation,
  ProgramGapSkillRef,
  ProgramIntelligenceRow,
} from "./contract";
import {
  INSTITUTE_CONFIDENCE,
  INSTITUTE_METHODOLOGY_VERSION,
  type InstituteConfidence,
} from "./policy";
import {
  computeProgramRelevance,
  degradeConfidence,
  isHighGapSeverity,
} from "./relevance";

const ACTIVE_STATUSES = new Set(["ACTIVE"]);

export function isActiveProgram(program: TrainingProgramView): boolean {
  return ACTIVE_STATUSES.has(program.status);
}

export function programSkillIds(program: TrainingProgramView): Set<string> {
  const ids = new Set<string>();
  for (const s of program.skills) {
    if (s.skillId) ids.add(s.skillId);
  }
  return ids;
}

/**
 * Skill → Programs using explicit CurriculumSkill mappings only.
 */
export function getProgramsForSkill(
  programs: readonly TrainingProgramView[],
  skillId: string,
): TrainingProgramView[] {
  return programs
    .filter(isActiveProgram)
    .filter((p) => p.skills.some((s) => s.skillId === skillId))
    .sort((a, b) => a.courseName.localeCompare(b.courseName));
}

/**
 * Skill → Providers (deduped) via programs.
 * Alias: getInstitutesForSkill (Organization TRAINING_INSTITUTE).
 */
export function getProvidersForSkill(
  programs: readonly TrainingProgramView[],
  skillId: string,
): Array<{
  providerId: string;
  providerName: string | null;
  programs: TrainingProgramView[];
}> {
  const byProvider = new Map<
    string,
    {
      providerId: string;
      providerName: string | null;
      programs: TrainingProgramView[];
    }
  >();
  for (const program of getProgramsForSkill(programs, skillId)) {
    const existing = byProvider.get(program.organizationId);
    if (existing) {
      existing.programs.push(program);
    } else {
      byProvider.set(program.organizationId, {
        providerId: program.organizationId,
        providerName: program.organizationName,
        programs: [program],
      });
    }
  }
  return [...byProvider.values()].sort((a, b) =>
    (a.providerName ?? a.providerId).localeCompare(b.providerName ?? b.providerId),
  );
}

/** Repository naming alias — institutes are Organization TRAINING_INSTITUTE. */
export const getInstitutesForSkill = getProvidersForSkill;

function gapSkillRef(gap: SkillGapRow, covered: boolean): ProgramGapSkillRef {
  return {
    skillId: gap.skillId,
    canonicalName: gap.canonicalName,
    name: gap.name,
    demandQuantity: gap.metrics.demandQuantity,
    shortageQuantity: gap.metrics.shortageQuantity,
    gapSeverity: gap.severity,
    gapTrend: gap.trend.direction,
    gapConfidence: gap.confidence,
    covered,
  };
}

export function buildProgramIntelligence(input: {
  program: TrainingProgramView;
  gaps: readonly SkillGapRow[];
  alignment: ProgramAlignmentRow | null;
  capacityObservations: readonly InstituteCapacityObservation[];
  trainingVersion: string | null;
  gapVersion: string;
}): ProgramIntelligenceRow {
  const { program } = input;
  const active = isActiveProgram(program);
  const coveredIds = programSkillIds(program);
  const coveredGapSkills: ProgramGapSkillRef[] = [];
  const missingGapSkills: ProgramGapSkillRef[] = [];

  for (const gap of input.gaps) {
    if (coveredIds.has(gap.skillId)) {
      coveredGapSkills.push(gapSkillRef(gap, true));
    } else if (gap.metrics.demandQuantity > 0) {
      missingGapSkills.push(gapSkillRef(gap, false));
    }
  }

  const highGaps = input.gaps.filter((g) => isHighGapSeverity(g.severity));
  const coveredHigh = coveredGapSkills.filter((g) =>
    isHighGapSeverity(g.gapSeverity),
  );
  const maxSeverity =
    coveredHigh.sort(
      (a, b) =>
        (b.gapSeverity === "SEVERE" ? 2 : b.gapSeverity === "HIGH" ? 1 : 0) -
        (a.gapSeverity === "SEVERE" ? 2 : a.gapSeverity === "HIGH" ? 1 : 0),
    )[0]?.gapSeverity ?? null;

  const maxShortage = Math.max(
    0,
    ...coveredGapSkills.map((g) => g.shortageQuantity),
  );
  const capacity = active
    ? aggregateCapacity(
        input.capacityObservations,
        {
          providerId: program.organizationId,
          programId: program.programId,
        },
        maxShortage || undefined,
      )
    : emptyCapacity("Inactive program — excluded from current capacity.");

  const confidence: InstituteConfidence = degradeConfidence([
    input.alignment?.confidence as InstituteConfidence | undefined,
    coveredGapSkills[0]?.gapConfidence as InstituteConfidence | undefined,
    capacity.observationCount > 0 ? INSTITUTE_CONFIDENCE.MEDIUM : INSTITUTE_CONFIDENCE.LOW,
  ]);

  const relevance = computeProgramRelevance({
    coveredHighGapCount: coveredHigh.length,
    totalHighGapCount: highGaps.length,
    maxCoveredSeverity: maxSeverity,
    alignment: input.alignment,
    capacity,
    confidence,
  });

  const geography =
    input.gaps.find((g) => g.geography.known)?.geography ??
    input.gaps[0]?.geography ??
    null;

  return {
    programId: program.programId,
    programName: program.courseName,
    courseId: program.courseId,
    providerId: program.organizationId,
    providerName: program.organizationName,
    status: program.status,
    isActive: active,
    skills: program.skills.map((s) => ({
      skillId: s.skillId,
      canonicalName: s.canonicalName,
      name: s.name,
    })),
    unresolvedSkillCount: 0,
    alignment: input.alignment,
    coveredGapSkills,
    missingGapSkills,
    capacity,
    relevance,
    confidence,
    geography,
    period: input.gaps[0]?.period ?? {
      from: "",
      to: "",
      dateField: "postedAt",
    },
    evidence: {
      curriculumId: program.curriculumId,
      courseId: program.courseId,
      organizationId: program.organizationId,
      trainingVersion: input.trainingVersion,
      gapVersion: input.gapVersion,
    },
    notes: [
      "Program intelligence consumes Phase 10 alignment when provided — does not recompute it.",
      ...(active ? [] : ["Inactive/DRAFT/ARCHIVED programs are not current capability."]),
    ],
    policyVersion: INSTITUTE_METHODOLOGY_VERSION,
  };
}

export function buildAllProgramIntelligence(input: {
  programs: readonly TrainingProgramView[];
  gaps: readonly SkillGapRow[];
  alignments: readonly ProgramAlignmentRow[];
  capacityObservations: readonly InstituteCapacityObservation[];
  trainingVersion: string | null;
  gapVersion: string;
  /** When false, include inactive for inspection; default true = active only. */
  activeOnly?: boolean;
}): ProgramIntelligenceRow[] {
  const alignmentByProgram = new Map(
    input.alignments.map((a) => [a.programId, a]),
  );
  const activeOnly = input.activeOnly !== false;
  return input.programs
    .filter((p) => (activeOnly ? isActiveProgram(p) : true))
    .map((program) =>
      buildProgramIntelligence({
        program,
        gaps: input.gaps,
        alignment: alignmentByProgram.get(program.programId) ?? null,
        capacityObservations: input.capacityObservations,
        trainingVersion: input.trainingVersion,
        gapVersion: input.gapVersion,
      }),
    )
    .sort((a, b) => {
      if (b.relevance.score !== a.relevance.score) {
        return b.relevance.score - a.relevance.score;
      }
      return a.programName.localeCompare(b.programName);
    });
}
