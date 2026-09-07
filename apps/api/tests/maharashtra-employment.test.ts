import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeSkillGaps } from "../src/modules/gaps";
import { SUPPLY_TYPE } from "../src/modules/gaps/policy";
import { makeSupplyObs } from "../src/modules/gaps/evaluate";
import { summarizeTrainingIntelligenceFromDb } from "../src/modules/training";
import { summarizeInstituteIntelligenceFromDb } from "../src/modules/institute";
import {
  summarizeEmploymentIntelligence,
  EMPLOYMENT_METHODOLOGY_VERSION,
  OUTCOME_TYPE,
  OUTCOME_STATUS,
} from "../src/modules/employment";
import { makeObservation } from "../src/modules/employment/evaluate";
import { EMPLOYMENT_EVIDENCE_TYPE } from "../src/modules/employment/policy";
import { mahaswayamRojgarAdapter } from "../src/modules/ingestion/sources/mahaswayam-rojgar";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";
import { assessJobQuality } from "../src/modules/quality/pipeline";

const OBSERVED_AT = "2026-08-20T10:00:00.000Z";
const INGESTED_AT = "2026-08-20T10:05:00.000Z";
const REFERENCE = new Date("2026-09-01T00:00:00.000Z");
const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];
const createdLocationIds: string[] = [];

const employmentDir = resolve(__dirname, "../src/modules/employment");
const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/mahaswayam-rojgar.sample.json",
);

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobQualityAssessment.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdLocationIds.length > 0) {
      await prisma.location.deleteMany({
        where: { id: { in: createdLocationIds } },
      });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

test("employment modules stay state-agnostic and Maharashtra fixture is synthetic", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition?: string;
    note?: string;
  };
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);

  for (const file of readdirSync(employmentDir).filter((n) => n.endsWith(".ts"))) {
    const source = readFileSync(resolve(employmentDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("Maharashtra synthetic Phase 8→11 + Phase 12 employment intelligence", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    records: Record<string, unknown>[];
  };
  const developer = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1003");
  assert.ok(developer);

  const mapped = mahaswayamRojgarAdapter.parse({
    ...developer,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-mh-emp-${stamp}`,
      name: `[TEST] MH employment ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const location = await prisma.location.create({
    data: {
      country: "IN",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    },
  });
  createdLocationIds.push(location.id);

  const react = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.react" },
    select: { id: true, canonicalName: true },
  });

  const job = await prisma.job.create({
    data: {
      title: mapped.payload.title,
      description: mapped.payload.description ?? null,
      companyName: mapped.payload.employerName ?? null,
      sourceId: source.id,
      externalId: `mh-emp-${stamp}`,
      postedAt: mapped.payload.postedAt
        ? new Date(mapped.payload.postedAt)
        : new Date(OBSERVED_AT),
      locationId: location.id,
      isDemo: true,
      skills: { create: [{ skillId: react.id }] },
    },
  });
  createdJobIds.push(job.id);

  await processJobIntelligence({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: [{ skillId: react.id, name: "React" }],
    },
    explicitSkills: ["React.js"],
    persist: true,
  });
  await assessJobQuality({
    jobId: job.id,
    referenceTime: REFERENCE,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: INGESTED_AT,
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });

  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-09-15T00:00:00.000Z");

  const supplyObservations = [
    makeSupplyObs({
      observationId: `mh-ecap-1-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0.2,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
      district: "Pune",
    }),
  ];

  const gapSummary = await summarizeSkillGaps({
    from,
    to,
    demand: {
      sourceId: source.id,
      geography: { state: "Maharashtra", country: "IN" },
    },
    supplyObservations,
    supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
  });

  const training = await summarizeTrainingIntelligenceFromDb({
    gapSummary,
    supplyObservations,
    includeDemo: true,
  });
  const institute = await summarizeInstituteIntelligenceFromDb({
    gapSummary,
    supplyObservations,
    includeDemo: true,
    runPhase10: true,
  });

  // Synthetic learner outcomes — NOT production data / NOT from Prisma learner tables
  const demoCourse = await prisma.course.findFirst({
    where: { isDemo: true, status: "ACTIVE" },
    select: { id: true, organizationId: true },
  });

  const syntheticOutcomes = [
    makeObservation({
      observationId: `mh-out-1-${stamp}`,
      learnerId: `synth-learner-${stamp}`,
      courseId: demoCourse?.id ?? null,
      instituteId: demoCourse?.organizationId ?? null,
      employerId: null,
      employerName: "[SYNTHETIC] Demo Employer MH",
      outcomeType: OUTCOME_TYPE.EMPLOYED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      evidenceType: EMPLOYMENT_EVIDENCE_TYPE.OTHER,
      trainedSkillIds: [react.id],
      employmentSkillIds: [react.id],
      trainingCompletionDate: "2026-07-01T00:00:00.000Z",
      employmentStartDate: "2026-08-01T00:00:00.000Z",
      geography: {
        locationId: location.id,
        country: "IN",
        state: "Maharashtra",
        district: "Pune",
        city: "Pune",
        known: true,
        level: "CITY",
      },
      notes: "SYNTHETIC EVALUATION OUTCOME — NOT REAL LABOUR-MARKET EVIDENCE",
    }),
    makeObservation({
      observationId: `mh-out-2-${stamp}`,
      learnerId: `synth-learner-trained-${stamp}`,
      courseId: demoCourse?.id ?? null,
      outcomeType: OUTCOME_TYPE.TRAINED,
      outcomeStatus: OUTCOME_STATUS.REPORTED,
      trainedSkillIds: [react.id],
      notes: "SYNTHETIC — trained only",
    }),
  ];

  const employment = summarizeEmploymentIntelligence({
    observations: syntheticOutcomes,
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
      dateField: "postedAt",
    },
    gapSummary,
    trainingSummary: training,
    instituteSummary: institute,
    programs: [],
  });

  assert.equal(employment.employmentVersion, EMPLOYMENT_METHODOLOGY_VERSION);
  assert.equal(employment.gapVersion, "gap-v1");
  assert.equal(employment.trainingVersion, "training-v1");
  assert.equal(employment.instituteVersion, "institute-v1");
  assert.equal(employment.totals.employed, 1);
  assert.equal(employment.totals.trained, 1);
  assert.ok(employment.limitations.some((l) => /SYNTHETIC|no durable learner/i.test(l)));
  assert.ok(employment.limitations.some((l) => /TRAINED ≠ CERTIFIED/i.test(l)));
  assert.ok(
    employment.limitations.some((l) => /not placement prediction/i.test(l)),
  );
});
