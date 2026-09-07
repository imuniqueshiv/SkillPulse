import { getPrisma } from "../../config/database";
import {
  CURRICULUM_COVERAGE_STATUS,
  type CurriculumCoverageStatus,
} from "./policy";
import type { ProgramSkillMapping, TrainingProgramView } from "./contract";

/**
 * Load ACTIVE courses' latest curricula with canonical CurriculumSkill mappings.
 * Program analytical unit = Curriculum (versioned syllabus).
 */
export async function loadTrainingPrograms(input?: {
  courseIds?: string[];
  includeDemo?: boolean;
  limit?: number;
}): Promise<TrainingProgramView[]> {
  const prisma = getPrisma();
  const limit = Math.min(Math.max(1, input?.limit ?? 100), 200);

  const courses = await prisma.course.findMany({
    where: {
      status: "ACTIVE",
      ...(input?.includeDemo === false ? { isDemo: false } : {}),
      ...(input?.courseIds?.length ? { id: { in: input.courseIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      organizationId: true,
      occupationId: true,
      sectorId: true,
      status: true,
      isDemo: true,
      organization: { select: { name: true } },
      curricula: {
        orderBy: [{ version: "desc" }, { id: "asc" }],
        take: 1,
        select: {
          id: true,
          version: true,
          title: true,
          skills: {
            select: {
              skillId: true,
              importance: true,
              skill: {
                select: { id: true, name: true, canonicalName: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: limit,
  });

  return courses
    .filter((course) => course.curricula.length > 0)
    .map((course) => {
      const curriculum = course.curricula[0]!;
      const skills = dedupeProgramSkills(
        curriculum.skills.map((row) => ({
          skillId: row.skill.id,
          canonicalName: row.skill.canonicalName,
          name: row.skill.name,
          coverage: CURRICULUM_COVERAGE_STATUS.FULL as CurriculumCoverageStatus,
          importance: row.importance,
        })),
      );
      return {
        programId: curriculum.id,
        curriculumId: curriculum.id,
        courseId: course.id,
        courseName: course.name,
        curriculumTitle: curriculum.title,
        curriculumVersion: curriculum.version,
        organizationId: course.organizationId,
        organizationName: course.organization?.name ?? null,
        occupationId: course.occupationId,
        sectorId: course.sectorId,
        status: course.status,
        isDemo: course.isDemo,
        skills,
      };
    });
}

/** Pure helper for tests/evaluation — no I/O. */
export function buildProgramView(
  program: TrainingProgramView,
): TrainingProgramView {
  return {
    ...program,
    skills: dedupeProgramSkills(program.skills),
  };
}

export function dedupeProgramSkills(
  skills: readonly ProgramSkillMapping[],
): ProgramSkillMapping[] {
  const byId = new Map<string, ProgramSkillMapping>();
  for (const skill of skills) {
    const id = skill.skillId.trim();
    if (!id) {
      continue;
    }
    if (!byId.has(id)) {
      byId.set(id, { ...skill, skillId: id });
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.canonicalName.localeCompare(b.canonicalName),
  );
}

export function programsCoveringSkill(
  programs: readonly TrainingProgramView[],
  skillId: string,
): TrainingProgramView[] {
  return programs.filter((p) => p.skills.some((s) => s.skillId === skillId));
}
