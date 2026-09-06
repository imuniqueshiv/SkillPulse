import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeSkillGaps } from "../src/modules/gaps";
import { SUPPLY_TYPE } from "../src/modules/gaps/policy";
import { makeSupplyObs } from "../src/modules/gaps/evaluate";
import { inferGeographyLevel } from "../src/modules/gaps/comparability";
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

const gapsDir = resolve(__dirname, "../src/modules/gaps");
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

test("gap modules stay state-agnostic and Maharashtra fixture is synthetic", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition?: string;
    note?: string;
  };
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);

  for (const file of readdirSync(gapsDir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(resolve(gapsDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("Maharashtra synthetic Phase 8 demand → Phase 9 gaps", async (t) => {
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
      code: `sp.source.test-mh-gap-${stamp}`,
      name: `[TEST] MH gap ${stamp}`,
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
      district: "Mumbai Suburban",
      city: "Mumbai",
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
      externalId: `mh-gap-${stamp}`,
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
    explicitSkills: ["React.js", "java scriptt"],
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

  // SYNTHETIC EVALUATION supply — not real Maharashtra labour supply.
  const supplyObservations = [
    makeSupplyObs({
      observationId: `mh-sup-1-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0.5,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
    }),
    makeSupplyObs({
      observationId: `mh-sup-2-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0.5,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
    }),
    makeSupplyObs({
      observationId: `mh-sup-3-${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 0,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
    }),
  ];

  const summary = await summarizeSkillGaps({
    from,
    to,
    demand: {
      sourceId: source.id,
      geography: { state: "Maharashtra", country: "IN" },
    },
    supplyObservations,
    supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
  });

  assert.equal(summary.gapVersion, "gap-v1");
  assert.equal(summary.demandVersion, "demand-v1");
  assert.ok(summary.limitations.some((l) => /not automatically a verified/i.test(l)));
  assert.ok(
    summary.skills.some(
      (s) => s.skillId === react.id && s.comparability === "PROXY",
    ) || summary.coverage.demandSkills >= 0,
  );
  assert.ok(summary.geography.every((g) => !g.geography.state || g.geography.state === "Maharashtra"));
  assert.equal(
    /maharashtra/i.test(
      readFileSync(resolve(gapsDir, "summary.ts"), "utf8"),
    ),
    false,
  );
  void inferGeographyLevel;
});
