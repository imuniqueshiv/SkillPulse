import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { mahaswayamRojgarAdapter } from "../src/modules/ingestion/sources/mahaswayam-rojgar";
import {
  processJobIntelligence,
  processJobIntelligenceById,
} from "../src/modules/intelligence/pipeline";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];

const intelligenceDir = resolve(__dirname, "../src/modules/intelligence");
const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/mahaswayam-rojgar.sample.json",
);

type SampleFile = {
  acquisition?: string;
  note?: string;
  records: Record<string, unknown>[];
};

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

function withClock(record: Record<string, unknown>, vacancyId?: string) {
  return {
    ...record,
    vacancy_id: vacancyId ?? record.vacancy_id,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  };
}

function explicitSkillsFrom(payload: { sourceMetadata?: { skills?: unknown } }): string[] | undefined {
  const skills = payload.sourceMetadata?.skills;
  if (!Array.isArray(skills)) {
    return undefined;
  }
  return skills.filter((item): item is string => typeof item === "string");
}

test("Maharashtra synthetic fixture loads and intelligence modules stay state-agnostic", () => {
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as SampleFile;
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);
  assert.match(sample.note ?? "", /not a live/i);
  assert.ok(Array.isArray(sample.records));
  assert.ok(sample.records.length >= 3);

  for (const file of readdirSync(intelligenceDir).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(resolve(intelligenceDir, file), "utf8");
    assert.equal(
      /maharashtra|mahaswayam|gujarat|karnataka/i.test(source),
      false,
      file,
    );
  }
});

test("Maharashtra fixture jobs process through Phase 6 without source-specific rules", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as SampleFile;
  const operator = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1001");
  const nurse = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1002");
  const developer = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1003");
  assert.ok(operator);
  assert.ok(nurse);
  assert.ok(developer);

  const operatorMapped = mahaswayamRojgarAdapter.parse(withClock(operator));
  const nurseMapped = mahaswayamRojgarAdapter.parse(withClock(nurse));
  const developerMapped = mahaswayamRojgarAdapter.parse(withClock(developer));

  const operatorIntel = await processJobIntelligence({
    job: {
      id: "mh-fixture-1001",
      title: operatorMapped.payload.title,
      description: operatorMapped.payload.description ?? null,
    },
    explicitSkills: explicitSkillsFrom(operatorMapped.payload),
    persist: false,
  });
  const operatorAgain = await processJobIntelligence({
    job: {
      id: "mh-fixture-1001",
      title: operatorMapped.payload.title,
      description: operatorMapped.payload.description ?? null,
    },
    explicitSkills: explicitSkillsFrom(operatorMapped.payload),
    persist: false,
  });
  assert.deepEqual(operatorIntel.intelligence.skills, operatorAgain.intelligence.skills);
  assert.ok(operatorIntel.intelligence.skills.some((row) => row.canonicalName === "python"));
  assert.ok(operatorIntel.intelligence.skills.some((row) => row.canonicalName === "sql"));
  assert.equal(operatorIntel.intelligence.occupation.status, "UNCLASSIFIED");
  assert.ok(
    operatorIntel.intelligence.skills.every((row) =>
      ["REQUIRED", "PREFERRED", "OPTIONAL", "MENTIONED"].includes(row.requirementLevel),
    ),
  );

  const nurseIntel = await processJobIntelligence({
    job: {
      id: "mh-fixture-1002",
      title: nurseMapped.payload.title,
      description: nurseMapped.payload.description ?? null,
    },
    explicitSkills: explicitSkillsFrom(nurseMapped.payload),
    persist: false,
  });
  assert.equal(explicitSkillsFrom(nurseMapped.payload), undefined);
  assert.equal(nurseIntel.intelligence.skills.some((row) => row.sourceField === "explicitSkills"), false);

  const developerIntel = await processJobIntelligence({
    job: {
      id: "mh-fixture-1003",
      title: developerMapped.payload.title,
      description: developerMapped.payload.description ?? null,
    },
    explicitSkills: explicitSkillsFrom(developerMapped.payload),
    persist: false,
  });
  assert.ok(developerIntel.intelligence.skills.some((row) => row.canonicalName === "react"));
  const unresolved = developerIntel.intelligence.skills.find((row) => row.rawTerm === "java scriptt");
  assert.ok(unresolved);
  assert.equal(unresolved.status, "UNRESOLVED");
  assert.ok(unresolved.rawTerm);
  assert.equal(unresolved.confidenceTier, "LOW");
  assert.equal(developerIntel.intelligence.occupation.status, "CLASSIFIED");
  assert.equal(developerIntel.intelligence.occupation.code, "2512");
});

test("text-derived skill without explicit source skills stays traceable", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const synthetic = {
    vacancy_id: `MH-EVAL-TEXT-${stamp}`,
    post_name: "Ward attendant",
    job_description: "Patient care is required on the ward.",
    city: "Pune",
    state: "Maharashtra",
    posted_on: "2026-08-15T00:00:00.000Z",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  };
  const mapped = mahaswayamRojgarAdapter.parse(synthetic);
  assert.equal(mapped.payload.sourceMetadata, undefined);
  assert.equal(explicitSkillsFrom(mapped.payload), undefined);

  const { intelligence } = await processJobIntelligence({
    job: {
      id: `mh-text-${stamp}`,
      title: mapped.payload.title,
      description: mapped.payload.description ?? null,
    },
    persist: false,
  });
  const care = intelligence.skills.find((row) => row.canonicalName === "patient care");
  assert.ok(care);
  assert.equal(care.status, "RESOLVED");
  assert.equal(care.sourceField, "description");
  assert.ok(
    care.extractionMethod === "CANONICAL_NAME_MATCH" ||
      care.extractionMethods.includes("CANONICAL_NAME_MATCH"),
  );
  assert.equal(care.normalizationMethod, "canonical");
  assert.equal(care.requirementLevel, "REQUIRED");
  assert.ok(care.evidence);
  assert.ok(care.requirementEvidence);
});

test("canonical Job from Maharashtra fixture mapping can be processed by id", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as SampleFile;
  const developer = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1003");
  assert.ok(developer);
  const mapped = mahaswayamRojgarAdapter.parse(withClock(developer, `MH-INTEL-${stamp}-1003`));

  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-mh-intel-${stamp}`,
      name: `[TEST] MH intel ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const react = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.react" },
    select: { id: true },
  });
  const job = await prisma.job.create({
    data: {
      title: mapped.payload.title,
      description: mapped.payload.description ?? null,
      companyName: mapped.payload.employerName ?? "Synthetic MH fixture",
      sourceId: source.id,
      externalId: mapped.payload.externalId ?? `mh-intel-${stamp}`,
      isDemo: true,
      skills: { create: [{ skillId: react.id }] },
    },
  });
  createdJobIds.push(job.id);

  const first = await processJobIntelligenceById(job.id, { persist: true });
  const second = await processJobIntelligenceById(job.id, { persist: true });
  assert.deepEqual(first.intelligence.skills, second.intelligence.skills);
  assert.equal(first.persistence?.created, true);
  assert.equal(second.persistence?.created, false);
  assert.ok(first.intelligence.skills.some((row) => row.canonicalName === "react"));
  assert.equal(first.intelligence.occupation.code, "2512");
  assert.equal(JSON.stringify(first.intelligence).includes('"payload"'), false);
  assert.equal(source.code.startsWith("sp.source.mahaswayam"), false);
});
