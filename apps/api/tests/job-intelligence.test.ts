import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
  SKILL_INTELLIGENCE_STATUS,
} from "../src/modules/intelligence/contract";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";
import { persistJobIntelligence } from "../src/modules/intelligence/persistence";
import { AppError } from "../src/utils/errors";

const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSkillIds: string[] = [];
const createdSourceIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdSkillIds.length > 0) {
      await prisma.skill.deleteMany({ where: { id: { in: createdSkillIds } } });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

async function createJob(title: string, description: string | null, skillCodes: string[] = []) {
  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-intel-${stamp}-${createdSourceIds.length}`,
      name: `[TEST] Intel ${stamp} ${createdSourceIds.length}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const skillIds: string[] = [];
  for (const code of skillCodes) {
    const skill = await prisma.skill.findUnique({ where: { code }, select: { id: true } });
    if (skill) {
      skillIds.push(skill.id);
    }
  }

  const job = await prisma.job.create({
    data: {
      title,
      description,
      companyName: "Test Co",
      sourceId: source.id,
      externalId: `intel-${stamp}-${createdJobIds.length}`,
      isDemo: true,
      skills: {
        create: skillIds.map((skillId) => ({ skillId })),
      },
    },
    include: {
      skills: { include: { skill: true } },
    },
  });
  createdJobIds.push(job.id);
  return job;
}

test("end-to-end job intelligence uses taxonomy, is idempotent, and does not mutate Job", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();

  const complete = await createJob(
    "Software Developer",
    "Experience with React.js, Node.js, PostgreSQL and REST APIs.",
    ["sp.skill.python"],
  );
  const originalTitle = complete.title;
  const originalDescription = complete.description;

  const first = await processJobIntelligence({
    job: {
      id: complete.id,
      title: complete.title,
      description: complete.description,
      skills: complete.skills.map((row) => ({
        skillId: row.skill.id,
        name: row.skill.name,
      })),
    },
    explicitSkills: ["React.js", "ReactJS"],
    experienceText: "2-4 years",
    qualificationText: "B.Tech / B.E. in Computer Science",
    persist: true,
  });
  const second = await processJobIntelligence({
    job: {
      id: complete.id,
      title: complete.title,
      description: complete.description,
      skills: complete.skills.map((row) => ({
        skillId: row.skill.id,
        name: row.skill.name,
      })),
    },
    explicitSkills: ["React.js", "ReactJS"],
    experienceText: "2-4 years",
    qualificationText: "B.Tech / B.E. in Computer Science",
    persist: true,
  });

  assert.deepEqual(first.intelligence.skills, second.intelligence.skills);
  assert.deepEqual(first.intelligence.occupation, second.intelligence.occupation);
  assert.equal(first.intelligence.processorVersion, JOB_INTELLIGENCE_PROCESSOR_VERSION);
  assert.equal(first.persistence?.created, true);
  assert.equal(second.persistence?.created, false);
  assert.equal(
    await prisma.jobIntelligence.count({
      where: { jobId: complete.id, processorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION },
    }),
    1,
  );

  assert.ok(first.intelligence.skills.some((row) => row.canonicalName === "python"));
  const react = first.intelligence.skills.find((row) => row.canonicalName === "react");
  assert.ok(react);
  assert.ok(react.contributingTerms.includes("React.js"));
  assert.ok(react.contributingTerms.includes("ReactJS"));
  assert.ok(
    first.intelligence.skills.some(
      (row) => row.rawTerm === "PostgreSQL" && row.status === SKILL_INTELLIGENCE_STATUS.UNRESOLVED,
    ),
  );
  assert.equal(first.intelligence.occupation.status, "CLASSIFIED");
  assert.equal(first.intelligence.occupation.code, "2512");
  assert.equal(first.intelligence.sector.status, "CLASSIFIED");
  assert.equal(first.intelligence.sector.code, "sp.sector.it-ites");
  assert.equal(first.intelligence.experience.status, "PARSED");
  assert.ok(first.intelligence.qualifications.some((row) => row.normalized === "B.Tech"));

  const reloaded = await prisma.job.findUniqueOrThrow({ where: { id: complete.id } });
  assert.equal(reloaded.title, originalTitle);
  assert.equal(reloaded.description, originalDescription);
  assert.equal(reloaded.occupationId, null);
  assert.equal(JSON.stringify(first.intelligence).includes("payload"), false);

  const noExplicit = await createJob(
    "Staff Nurse",
    "Patient care and infection prevention and control on the ward.",
  );
  const nurseIntel = await processJobIntelligence({
    job: { id: noExplicit.id, title: noExplicit.title, description: noExplicit.description },
  });
  assert.ok(nurseIntel.intelligence.skills.some((row) => row.canonicalName === "patient care"));
  assert.ok(
    nurseIntel.intelligence.skills.some((row) => row.canonicalName === "infection prevention and control"),
  );

  const ambiguous = await processJobIntelligence({
    job: {
      id: complete.id,
      title: "Health worker",
      description: "Patient care. Needs quantum blockchain ninja skills and JavaScript.",
    },
    experienceText: "5-2 years",
    qualificationText: "xyz credential",
  });
  assert.equal(ambiguous.intelligence.occupation.status, "UNCLASSIFIED");
  assert.equal(ambiguous.intelligence.sector.status, "UNCLASSIFIED");
  assert.ok(
    ambiguous.intelligence.skills.some((row) => row.canonicalName === "javascript"),
  );
  assert.equal(
    ambiguous.intelligence.skills.some((row) => /quantum/i.test(row.rawTerm)),
    false,
  );
  assert.equal(ambiguous.intelligence.experience.status, "UNPARSED");
  assert.equal(ambiguous.intelligence.qualifications[0]?.status, "UNPARSED");

  const draft = await prisma.skill.create({
    data: {
      code: `sp.skill.draft-intel-${stamp}`,
      name: `DraftIntel${stamp}`,
      canonicalName: `draftintel${stamp}`,
      status: "DRAFT",
    },
  });
  createdSkillIds.push(draft.id);
  const archived = await prisma.skill.create({
    data: {
      code: `sp.skill.arch-intel-${stamp}`,
      name: `ArchIntel${stamp}`,
      canonicalName: `archintel${stamp}`,
      status: "ARCHIVED",
    },
  });
  createdSkillIds.push(archived.id);
  const deprecated = await prisma.skill.create({
    data: {
      code: `sp.skill.dep-intel-${stamp}`,
      name: `DepIntel${stamp}`,
      canonicalName: `depintel${stamp}`,
      status: "DEPRECATED",
    },
  });
  createdSkillIds.push(deprecated.id);

  const statusCheck = await processJobIntelligence({
    job: {
      id: complete.id,
      title: `DraftIntel${stamp} and ArchIntel${stamp} and DepIntel${stamp} and Python`,
      description: null,
    },
  });
  assert.ok(statusCheck.intelligence.skills.some((row) => row.canonicalName === "python"));
  assert.ok(statusCheck.intelligence.skills.some((row) => row.skillId === deprecated.id));
  assert.equal(
    statusCheck.intelligence.skills.some((row) => row.skillId === draft.id),
    false,
  );
  assert.equal(
    statusCheck.intelligence.skills.some((row) => row.skillId === archived.id),
    false,
  );

  assert.equal(
    await prisma.skill.count({ where: { id: { in: createdSkillIds } } }),
    createdSkillIds.length,
  );
  assert.equal(
    await prisma.skillAlias.count({ where: { skillId: { in: createdSkillIds } } }),
    0,
  );

  await assert.rejects(
    () => persistJobIntelligence({ ...first.intelligence, jobId: "missing-job" }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});
