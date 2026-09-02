import { PrismaClient } from "@prisma/client";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { seedTaxonomy } from "./seed-taxonomy";

loadDotenv({ path: resolve(__dirname, "../../../.env") });
loadDotenv();

const prisma = new PrismaClient({ errorFormat: "minimal" });

const DEMO = {
  organization: "11111111-1111-4111-8111-111111111111",
  user: "11111111-1111-4111-8111-111111111112",
  location: "11111111-1111-4111-8111-111111111113",
  sector: "11111111-1111-4111-8111-111111111114",
  occupation: "11111111-1111-4111-8111-111111111115",
  skillTypeScript: "11111111-1111-4111-8111-111111111116",
  skillReact: "11111111-1111-4111-8111-111111111117",
  skillSql: "11111111-1111-4111-8111-111111111118",
  source: "11111111-1111-4111-8111-111111111119",
  job: "11111111-1111-4111-8111-11111111111a",
  course: "11111111-1111-4111-8111-11111111111b",
  curriculum: "11111111-1111-4111-8111-11111111111c",
} as const;

async function main(): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { id: DEMO.organization },
    update: {
      name: "[DEMO] SkillPulse Demo Institute",
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
    create: {
      id: DEMO.organization,
      name: "[DEMO] SkillPulse Demo Institute",
      type: "TRAINING_INSTITUTE",
      isDemo: true,
    },
  });

  await prisma.user.upsert({
    where: { clerkUserId: "demo_clerk_user_skillpulse" },
    update: {
      organizationId: organization.id,
      role: "INSTITUTE_ADMIN",
    },
    create: {
      id: DEMO.user,
      clerkUserId: "demo_clerk_user_skillpulse",
      organizationId: organization.id,
      role: "INSTITUTE_ADMIN",
    },
  });

  const location = await prisma.location.upsert({
    where: { id: DEMO.location },
    update: {
      country: "India",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    },
    create: {
      id: DEMO.location,
      country: "India",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    },
  });

  const { occupationByCode, skillByCode } = await seedTaxonomy(prisma);
  const occupationId = occupationByCode.get("2512");
  const typeScriptId = skillByCode.get("sp.skill.typescript");
  const reactId = skillByCode.get("sp.skill.react");
  const sqlId = skillByCode.get("sp.skill.sql");

  if (!occupationId || !typeScriptId || !reactId || !sqlId) {
    throw new Error("Taxonomy seed did not provision demo IT records");
  }

  const occupation = await prisma.occupation.findUniqueOrThrow({
    where: { id: occupationId },
    select: { sectorId: true },
  });
  const sectorId = occupation.sectorId;
  if (!sectorId) {
    throw new Error("Taxonomy seed did not provision demo IT records");
  }

  const source = await prisma.dataSource.upsert({
    where: { name: "[DEMO] SkillPulse Seed" },
    update: {
      type: "OTHER",
      description: "Synthetic seed data. Not labour-market evidence.",
      reliability: 0,
      active: false,
      isDemo: true,
    },
    create: {
      id: DEMO.source,
      name: "[DEMO] SkillPulse Seed",
      type: "OTHER",
      description: "Synthetic seed data. Not labour-market evidence.",
      reliability: 0,
      active: false,
      isDemo: true,
    },
  });

  const job = await prisma.job.upsert({
    where: { id: DEMO.job },
    update: {
      title: "[DEMO] Software Developer — Demo Employer",
      description: "Synthetic job used to demonstrate JobSkill relationships.",
      companyName: "[DEMO] Demo Employer",
      sourceId: source.id,
      externalId: "demo-job-software-developer",
      locationId: location.id,
      occupationId,
      sectorId,
      isDemo: true,
    },
    create: {
      id: DEMO.job,
      title: "[DEMO] Software Developer — Demo Employer",
      description: "Synthetic job used to demonstrate JobSkill relationships.",
      companyName: "[DEMO] Demo Employer",
      sourceId: source.id,
      externalId: "demo-job-software-developer",
      locationId: location.id,
      occupationId,
      sectorId,
      isDemo: true,
    },
  });

  await Promise.all([
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: typeScriptId } },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        jobId: job.id,
        skillId: typeScriptId,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: reactId } },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        jobId: job.id,
        skillId: reactId,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: sqlId } },
      update: { importance: "PREFERRED", proficiency: "BASIC" },
      create: {
        jobId: job.id,
        skillId: sqlId,
        importance: "PREFERRED",
        proficiency: "BASIC",
      },
    }),
  ]);

  const course = await prisma.course.upsert({
    where: { id: DEMO.course },
    update: {
      name: "[DEMO] Full Stack Development",
      description: "Synthetic course for local development only.",
      organizationId: organization.id,
      occupationId,
      sectorId,
      durationHours: 120,
      status: "ACTIVE",
      isDemo: true,
    },
    create: {
      id: DEMO.course,
      name: "[DEMO] Full Stack Development",
      description: "Synthetic course for local development only.",
      organizationId: organization.id,
      occupationId,
      sectorId,
      durationHours: 120,
      status: "ACTIVE",
      isDemo: true,
    },
  });

  const curriculum = await prisma.curriculum.upsert({
    where: { courseId_version: { courseId: course.id, version: "1" } },
    update: {
      title: "[DEMO] Full Stack Development v1",
      description: "First demo curriculum version. Historical versions are kept.",
    },
    create: {
      id: DEMO.curriculum,
      courseId: course.id,
      version: "1",
      title: "[DEMO] Full Stack Development v1",
      description: "First demo curriculum version. Historical versions are kept.",
    },
  });

  await Promise.all([
    prisma.curriculumSkill.upsert({
      where: {
        curriculumId_skillId: {
          curriculumId: curriculum.id,
          skillId: typeScriptId,
        },
      },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        curriculumId: curriculum.id,
        skillId: typeScriptId,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.curriculumSkill.upsert({
      where: {
        curriculumId_skillId: {
          curriculumId: curriculum.id,
          skillId: reactId,
        },
      },
      update: { importance: "REQUIRED", proficiency: "BASIC" },
      create: {
        curriculumId: curriculum.id,
        skillId: reactId,
        importance: "REQUIRED",
        proficiency: "BASIC",
      },
    }),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : "Seed failed";
    console.error(message.replace(/[a-z]+:\/\/\S+/gi, "[redacted]"));
    await prisma.$disconnect();
    process.exit(1);
  });
