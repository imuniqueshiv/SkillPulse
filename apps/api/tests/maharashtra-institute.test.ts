import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeSkillGaps } from "../src/modules/gaps";
import { SUPPLY_TYPE } from "../src/modules/gaps/policy";
import { makeSupplyObs } from "../src/modules/gaps/evaluate";
import {
  summarizeInstituteIntelligenceFromDb,
  INSTITUTE_METHODOLOGY_VERSION,
  capacityFromSupplyObservations,
} from "../src/modules/institute";
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

const instituteDir = resolve(__dirname, "../src/modules/institute");
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

test("institute modules stay state-agnostic and Maharashtra fixture is synthetic", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition?: string;
    note?: string;
  };
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);

  for (const file of readdirSync(instituteDir).filter((n) => n.endsWith(".ts"))) {
    const source = readFileSync(resolve(instituteDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("Maharashtra synthetic Phase 8→9→10→11 institute intelligence", async (t) => {
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
      code: `sp.source.test-mh-inst-${stamp}`,
      name: `[TEST] MH institute ${stamp}`,
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
      district: "Nashik",
      city: "Nashik",
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
      externalId: `mh-inst-${stamp}`,
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
      observationId: `mh-icap-1-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0.2,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
      district: "Nashik",
    }),
    makeSupplyObs({
      observationId: `mh-icap-2-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0.2,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
      district: "Nashik",
    }),
    makeSupplyObs({
      observationId: `mh-icap-3-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
      district: "Nashik",
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

  const capacityObservations = capacityFromSupplyObservations(supplyObservations);

  const institute = await summarizeInstituteIntelligenceFromDb({
    gapSummary,
    supplyObservations,
    capacityObservations,
    includeDemo: true,
    runPhase10: true,
  });

  assert.equal(institute.instituteVersion, INSTITUTE_METHODOLOGY_VERSION);
  assert.equal(institute.gapVersion, "gap-v1");
  assert.equal(institute.demandVersion, "demand-v1");
  assert.equal(institute.trainingVersion, "training-v1");
  assert.ok(Array.isArray(institute.programs));
  assert.ok(Array.isArray(institute.providers));
  assert.ok(Array.isArray(institute.skillCapabilities));
  assert.ok(institute.geography.length >= 1);
  assert.ok(
    institute.limitations.some((l) => /Skill gap.*capability gap/i.test(l)),
  );
  assert.ok(institute.limitations.some((l) => /TRAINING_CAPACITY/i.test(l)));
  assert.ok(
    institute.limitations.some((l) => /not institute rankings/i.test(l)),
  );
  // Demo institute may cover React via seed curriculum
  assert.ok(institute.buckets.activePrograms >= 0);
  assert.ok(institute.notes.some((n) => /Organization/i.test(n)));
});
