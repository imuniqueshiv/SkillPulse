import { PrismaClient } from "@prisma/client";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

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

  const sector = await prisma.sector.upsert({
    where: { name: "Information Technology" },
    update: {
      description: "[DEMO] Sample sector for local development only.",
    },
    create: {
      id: DEMO.sector,
      name: "Information Technology",
      description: "[DEMO] Sample sector for local development only.",
    },
  });

  const occupation = await prisma.occupation.upsert({
    where: { id: DEMO.occupation },
    update: {
      name: "Software Developer",
      description: "[DEMO] Sample occupation. Not an official taxonomy entry.",
      sectorId: sector.id,
    },
    create: {
      id: DEMO.occupation,
      name: "Software Developer",
      description: "[DEMO] Sample occupation. Not an official taxonomy entry.",
      sectorId: sector.id,
    },
  });

  const [typeScript, react, sql] = await Promise.all([
    prisma.skill.upsert({
      where: { canonicalName: "typescript" },
      update: { name: "TypeScript", category: "software" },
      create: {
        id: DEMO.skillTypeScript,
        name: "TypeScript",
        canonicalName: "typescript",
        category: "software",
        description: "[DEMO] Sample skill.",
      },
    }),
    prisma.skill.upsert({
      where: { canonicalName: "react" },
      update: { name: "React", category: "software" },
      create: {
        id: DEMO.skillReact,
        name: "React",
        canonicalName: "react",
        category: "software",
        description: "[DEMO] Sample skill.",
      },
    }),
    prisma.skill.upsert({
      where: { canonicalName: "sql" },
      update: { name: "SQL", category: "software" },
      create: {
        id: DEMO.skillSql,
        name: "SQL",
        canonicalName: "sql",
        category: "software",
        description: "[DEMO] Sample skill.",
      },
    }),
  ]);

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
      occupationId: occupation.id,
      sectorId: sector.id,
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
      occupationId: occupation.id,
      sectorId: sector.id,
      isDemo: true,
    },
  });

  await Promise.all([
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: typeScript.id } },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        jobId: job.id,
        skillId: typeScript.id,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: react.id } },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        jobId: job.id,
        skillId: react.id,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.jobSkill.upsert({
      where: { jobId_skillId: { jobId: job.id, skillId: sql.id } },
      update: { importance: "PREFERRED", proficiency: "BASIC" },
      create: {
        jobId: job.id,
        skillId: sql.id,
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
      occupationId: occupation.id,
      sectorId: sector.id,
      durationHours: 120,
      status: "ACTIVE",
      isDemo: true,
    },
    create: {
      id: DEMO.course,
      name: "[DEMO] Full Stack Development",
      description: "Synthetic course for local development only.",
      organizationId: organization.id,
      occupationId: occupation.id,
      sectorId: sector.id,
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
          skillId: typeScript.id,
        },
      },
      update: { importance: "REQUIRED", proficiency: "INTERMEDIATE" },
      create: {
        curriculumId: curriculum.id,
        skillId: typeScript.id,
        importance: "REQUIRED",
        proficiency: "INTERMEDIATE",
      },
    }),
    prisma.curriculumSkill.upsert({
      where: {
        curriculumId_skillId: {
          curriculumId: curriculum.id,
          skillId: react.id,
        },
      },
      update: { importance: "REQUIRED", proficiency: "BASIC" },
      create: {
        curriculumId: curriculum.id,
        skillId: react.id,
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
