import {
  OrganizationType,
  Prisma,
  PrismaClient,
  SkillImportance,
  SkillProficiency,
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEMO_ROOT = resolve(__dirname, "../../../data/demo");
const DEMO_SOURCE_ID = "22222222-2222-4222-8222-000000000001";
const DEMO_SOURCE_CODE = "sp.source.demo-mvp";

type InstituteRow = {
  id: string;
  name: string;
  type: OrganizationType;
};

type ProgramRow = {
  id: string;
  name: string;
  organizationId: string;
  durationHours: number;
  occupationCode?: string;
};

type CurriculumRow = {
  id: string;
  courseId: string;
  version: string;
  title: string;
  skills: Array<{
    code: string;
    importance: SkillImportance;
    proficiency: SkillProficiency;
  }>;
};

type SupplyRow = {
  id: string;
  skillCode: string;
  supplyType: string;
  quantity: number;
  confidence: string;
};

type OutcomeRow = {
  id: string;
  learnerId: string;
  courseId: string;
  instituteId: string;
  skillCodes: string[];
  employmentSkillCodes?: string[];
  outcomeType: string;
  outcomeStatus: string;
  trainingCompletionDate?: string | null;
  outcomeDate?: string | null;
  employmentStartDate?: string | null;
  employerName?: string | null;
  observedAt: string;
};

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(DEMO_ROOT, name), "utf8")) as T;
}

export async function seedDemoMvp(prisma: PrismaClient): Promise<void> {
  const institutesFile = readJson<{ institutes: InstituteRow[] }>("institutes.json");
  const programsFile = readJson<{ programs: ProgramRow[] }>("training-programs.json");
  const curriculumFile = readJson<{ curricula: CurriculumRow[] }>("curriculum.json");
  const supplyFile = readJson<{
    periodFrom: string;
    periodTo: string;
    geography: Record<string, unknown>;
    observations: SupplyRow[];
  }>("workforce-supply.json");
  const outcomesFile = readJson<{ observations: OutcomeRow[] }>("outcomes.json");

  const source = await prisma.dataSource.upsert({
    where: { code: DEMO_SOURCE_CODE },
    update: {
      name: "[DEMO] SkillPulse MVP workflow fixtures",
      type: "OTHER",
      description:
        "Synthetic seed fixtures for gap/training/outcome demonstration. Not official government statistics. Does not replace NCS job observations.",
      reliability: 0,
      accessMethod: "MANUAL_IMPORT",
      domain: "OTHER",
      geographicScope: "STATE",
      active: false,
      isDemo: true,
    },
    create: {
      id: DEMO_SOURCE_ID,
      code: DEMO_SOURCE_CODE,
      name: "[DEMO] SkillPulse MVP workflow fixtures",
      type: "OTHER",
      description:
        "Synthetic seed fixtures for gap/training/outcome demonstration. Not official government statistics. Does not replace NCS job observations.",
      reliability: 0,
      accessMethod: "MANUAL_IMPORT",
      domain: "OTHER",
      geographicScope: "STATE",
      active: false,
      isDemo: true,
    },
  });

  for (const row of institutesFile.institutes) {
    await prisma.organization.upsert({
      where: { id: row.id },
      update: { name: row.name, type: row.type, isDemo: true },
      create: { id: row.id, name: row.name, type: row.type, isDemo: true },
    });
  }

  const occupation = await prisma.occupation.findFirst({
    where: { code: "3512" },
    select: { id: true, sectorId: true },
  });

  for (const row of programsFile.programs) {
    await prisma.course.upsert({
      where: { id: row.id },
      update: {
        name: row.name,
        description: "DEMO / SIMULATED course for MVP workflow only.",
        organizationId: row.organizationId,
        occupationId: occupation?.id ?? null,
        sectorId: occupation?.sectorId ?? null,
        durationHours: row.durationHours,
        status: "ACTIVE",
        isDemo: true,
      },
      create: {
        id: row.id,
        name: row.name,
        description: "DEMO / SIMULATED course for MVP workflow only.",
        organizationId: row.organizationId,
        occupationId: occupation?.id ?? null,
        sectorId: occupation?.sectorId ?? null,
        durationHours: row.durationHours,
        status: "ACTIVE",
        isDemo: true,
      },
    });
  }

  const skillByCode = new Map(
    (
      await prisma.skill.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, canonicalName: true },
      })
    ).map((s) => [s.code, s]),
  );

  for (const row of curriculumFile.curricula) {
    const curriculum = await prisma.curriculum.upsert({
      where: { courseId_version: { courseId: row.courseId, version: row.version } },
      update: { title: row.title, description: "DEMO / SIMULATED curriculum." },
      create: {
        id: row.id,
        courseId: row.courseId,
        version: row.version,
        title: row.title,
        description: "DEMO / SIMULATED curriculum.",
      },
    });

    for (const skill of row.skills) {
      const resolved = skillByCode.get(skill.code);
      if (!resolved) continue;
      await prisma.curriculumSkill.upsert({
        where: {
          curriculumId_skillId: {
            curriculumId: curriculum.id,
            skillId: resolved.id,
          },
        },
        update: { importance: skill.importance, proficiency: skill.proficiency },
        create: {
          curriculumId: curriculum.id,
          skillId: resolved.id,
          importance: skill.importance,
          proficiency: skill.proficiency,
        },
      });
    }
  }

  const observedAt = new Date("2026-08-15T00:00:00.000Z");

  for (const row of supplyFile.observations) {
    const skill = skillByCode.get(row.skillCode);
    if (!skill) continue;
    const metadata: Prisma.InputJsonObject = {
      demoKind: "SUPPLY_OBSERVATION",
      classification: "DEMO / SIMULATED",
      payload: {
        observationId: row.id,
        sourceId: source.id,
        skillId: skill.id,
        canonicalName: skill.canonicalName,
        resolved: true,
        occupationId: occupation?.id ?? null,
        sectorId: occupation?.sectorId ?? null,
        geography: {
          locationId: null,
          country: "India",
          state: "Maharashtra",
          district: null,
          city: null,
          known: true,
          level: "STATE",
        },
        periodFrom: supplyFile.periodFrom,
        periodTo: supplyFile.periodTo,
        supplyType: row.supplyType,
        quantity: row.quantity,
        confidence: row.confidence,
        evidenceId: row.id,
        notes: "DEMO / SIMULATED supply observation. Not official workforce statistics.",
      },
    };
    await prisma.evidence.upsert({
      where: { id: row.id },
      update: {
        sourceId: source.id,
        type: "OTHER",
        reference: `demo-supply:${row.skillCode}:${row.supplyType}`,
        observedAt,
        confidence: 0,
        metadata,
      },
      create: {
        id: row.id,
        sourceId: source.id,
        type: "OTHER",
        reference: `demo-supply:${row.skillCode}:${row.supplyType}`,
        observedAt,
        confidence: 0,
        metadata,
      },
    });
  }

  for (const row of outcomesFile.observations) {
    const trained = (row.skillCodes ?? [])
      .map((code) => skillByCode.get(code)?.id)
      .filter((id): id is string => Boolean(id));
    const employed = (row.employmentSkillCodes ?? [])
      .map((code) => skillByCode.get(code)?.id)
      .filter((id): id is string => Boolean(id));
    const metadata: Prisma.InputJsonObject = {
      demoKind: "EMPLOYMENT_OUTCOME",
      classification: "DEMO / SIMULATED",
      payload: {
        observationId: row.id,
        learnerId: row.learnerId,
        courseId: row.courseId,
        instituteId: row.instituteId,
        employerId: null,
        employerName: row.employerName ?? null,
        trainedSkillIds: trained,
        employmentSkillIds: employed,
        outcomeType: row.outcomeType,
        outcomeStatus: row.outcomeStatus,
        trainingCompletionDate: row.trainingCompletionDate ?? null,
        outcomeDate: row.outcomeDate ?? null,
        employmentStartDate: row.employmentStartDate ?? null,
        employmentEndDate: null,
        geography: {
          locationId: null,
          country: "India",
          state: "Maharashtra",
          district: null,
          city: null,
          known: true,
          level: "STATE",
        },
        occupationId: occupation?.id ?? null,
        sourceId: source.id,
        evidenceType: "OTHER",
        evidenceId: row.id,
        observedAt: row.observedAt,
        notes: "DEMO / SIMULATED outcome. Not government placement statistics.",
      },
    };
    await prisma.evidence.upsert({
      where: { id: row.id },
      update: {
        sourceId: source.id,
        type: "OTHER",
        reference: `demo-outcome:${row.learnerId}:${row.outcomeType}`,
        observedAt: new Date(row.observedAt),
        confidence: 0,
        metadata,
      },
      create: {
        id: row.id,
        sourceId: source.id,
        type: "OTHER",
        reference: `demo-outcome:${row.learnerId}:${row.outcomeType}`,
        observedAt: new Date(row.observedAt),
        confidence: 0,
        metadata,
      },
    });
  }
}
