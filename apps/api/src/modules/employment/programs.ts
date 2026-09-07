import type { TrainingProgramView } from "../training/contract";
import type { ProgramEmploymentInsightRow } from "./contract";
import {
  classifyOutcomeConfidence,
  countByType,
  type ResolvedOutcomeGroup,
} from "./outcomes";
import {
  certificationToEmploymentRate,
  trainingToEmploymentRate,
} from "./metrics";
import {
  EMPLOYMENT_ALIGNMENT_THRESHOLD,
  EMPLOYMENT_CONFIDENCE,
  EMPLOYMENT_METHODOLOGY_VERSION,
  OUTCOME_TYPE,
  PROGRAM_EMPLOYMENT_ALIGNMENT,
  type EmploymentConfidence,
  type ProgramEmploymentAlignment,
} from "./policy";
import { computeSkillUtilization, summarizeSkillUtilization } from "./skill-utilization";
import { computeTimeToEmployment } from "./time-to-employment";

/**
 * Observed alignment between program curriculum skills and employment-used skills.
 * NOT causal. NOT a guarantee of employment.
 */
export function classifyProgramEmploymentAlignment(input: {
  curriculumSkillIds: readonly string[];
  employmentSkillIds: readonly string[];
}): ProgramEmploymentAlignment {
  if (input.curriculumSkillIds.length === 0) {
    return PROGRAM_EMPLOYMENT_ALIGNMENT.INSUFFICIENT_DATA;
  }
  if (input.employmentSkillIds.length === 0) {
    return PROGRAM_EMPLOYMENT_ALIGNMENT.INSUFFICIENT_DATA;
  }
  const u = computeSkillUtilization({
    trainedSkillIds: input.curriculumSkillIds,
    employmentSkillIds: input.employmentSkillIds,
  });
  if (u.ratio === null) return PROGRAM_EMPLOYMENT_ALIGNMENT.INSUFFICIENT_DATA;
  if (u.ratio >= EMPLOYMENT_ALIGNMENT_THRESHOLD.STRONG) {
    return PROGRAM_EMPLOYMENT_ALIGNMENT.STRONG;
  }
  if (u.ratio >= EMPLOYMENT_ALIGNMENT_THRESHOLD.MODERATE) {
    return PROGRAM_EMPLOYMENT_ALIGNMENT.MODERATE;
  }
  return PROGRAM_EMPLOYMENT_ALIGNMENT.WEAK;
}

export function buildProgramEmploymentInsights(input: {
  groups: readonly ResolvedOutcomeGroup[];
  programs: readonly TrainingProgramView[];
  phase10AlignmentByProgram: ReadonlyMap<string, string>;
  rankLimit: number;
}): ProgramEmploymentInsightRow[] {
  const byCourse = new Map<string, ResolvedOutcomeGroup[]>();
  for (const g of input.groups) {
    const courseId = g.primary.courseId;
    if (!courseId) continue;
    const list = byCourse.get(courseId) ?? [];
    list.push(g);
    byCourse.set(courseId, list);
  }

  const programByCourse = new Map(
    input.programs.map((p) => [p.courseId, p]),
  );

  const rows: ProgramEmploymentInsightRow[] = [];
  const courseIds = new Set([
    ...byCourse.keys(),
    ...input.programs.map((p) => p.courseId),
  ]);

  for (const courseId of [...courseIds].sort()) {
    const members = byCourse.get(courseId) ?? [];
    const program = programByCourse.get(courseId);
    const curriculumSkillIds =
      program?.skills.map((s) => s.skillId) ??
      unique(members.flatMap((m) => m.primary.trainedSkillIds));

    const trained = countByType(members, OUTCOME_TYPE.TRAINED);
    const certified = countByType(members, OUTCOME_TYPE.CERTIFIED);
    const placed = countByType(members, OUTCOME_TYPE.PLACED);
    const employed = countByType(members, OUTCOME_TYPE.EMPLOYED);

    // Inclusive trained count for rate: members that are at least TRAINED
    const trainedInclusive = members.length;
    const employmentRate = trainingToEmploymentRate(
      employed,
      trainedInclusive > 0 ? trainedInclusive : null,
    ).value;

    const employmentSkills = unique(
      members.flatMap((m) => m.primary.employmentSkillIds),
    );
    const alignment = classifyProgramEmploymentAlignment({
      curriculumSkillIds,
      employmentSkillIds: employmentSkills,
    });

    const phase10 =
      (program
        ? input.phase10AlignmentByProgram.get(program.programId)
        : null) ?? null;

    const tte = computeTimeToEmployment(members);
    const skillUtilization = summarizeSkillUtilization(members);
    const employerCount = new Set(
      members
        .map((m) => m.primary.employerId ?? m.primary.employerName)
        .filter(Boolean),
    ).size;

    const confidence =
      members.length === 0
        ? EMPLOYMENT_CONFIDENCE.UNKNOWN
        : worstConfidence(
            members.map((m) => classifyOutcomeConfidence(m.primary)),
          );

    rows.push({
      programId: program?.programId ?? courseId,
      courseId,
      courseName: program?.courseName ?? courseId,
      instituteId: program?.organizationId ?? members[0]?.primary.instituteId ?? null,
      trained: trained + certified + placed + employed > 0
        ? trainedInclusive
        : trained,
      certified,
      placed,
      employed,
      employmentRate,
      medianTimeToEmploymentDays: tte.medianDays,
      skillUtilization,
      employerCount,
      alignment,
      phase10Alignment: phase10,
      confidence,
      evidence: {
        observationIds: members.map((m) => m.primary.observationId).sort(),
        curriculumSkillIds,
      },
      notes: [
        "Program employment alignment is observational — not causal or a placement guarantee.",
        "Phase 10 curriculum alignment is surfaced separately when provided.",
        ...(certificationToEmploymentRate(employed, certified).value === null
          ? []
          : []),
      ],
      policyVersion: EMPLOYMENT_METHODOLOGY_VERSION,
    });
  }

  return rows
    .sort((a, b) => {
      const ae = a.employmentRate ?? -1;
      const be = b.employmentRate ?? -1;
      if (be !== ae) return be - ae;
      return a.courseName.localeCompare(b.courseName);
    })
    .slice(0, input.rankLimit);
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function worstConfidence(
  parts: EmploymentConfidence[],
): EmploymentConfidence {
  const order: EmploymentConfidence[] = [
    EMPLOYMENT_CONFIDENCE.UNKNOWN,
    EMPLOYMENT_CONFIDENCE.LOW,
    EMPLOYMENT_CONFIDENCE.MEDIUM,
    EMPLOYMENT_CONFIDENCE.HIGH,
  ];
  let worstIdx = order.length - 1;
  for (const p of parts) {
    const idx = order.indexOf(p);
    if (idx >= 0 && idx < worstIdx) worstIdx = idx;
  }
  return parts.length === 0
    ? EMPLOYMENT_CONFIDENCE.UNKNOWN
    : order[worstIdx]!;
}
