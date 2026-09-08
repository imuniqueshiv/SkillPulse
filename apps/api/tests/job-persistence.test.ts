import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import {
  persistCanonicalJob,
  planCanonicalJobPersistence,
} from "../src/modules/ingestion/job-persistence";
import { recordJobPostingEvidence } from "../src/modules/ingestion/job-provenance";
import {
  JOB_SKILL_RESOLUTION_STATUS,
  normalizeJobObservationSkills,
  type JobSkillNormalizationResult,
} from "../src/modules/ingestion/job-skill-normalization";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const POSTED_AT = "2025-01-01T00:00:00.000Z";
const stamp = Date.now();
const createdSourceIds: string[] = [];
const createdJobIds: string[] = [];
const createdSkillIds: string[] = [];
const createdEvidenceIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdEvidenceIds.length > 0) {
      await prisma.evidence.deleteMany({
        where: { id: { in: createdEvidenceIds } },
      });
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

function envelope(payload: Record<string, unknown>) {
  return {
    kind: INGESTION_RECORD_KIND.JOB,
    contractVersion: INGESTION_CONTRACT_VERSION,
    adapterName: "skillpulse-test-fixture",
    adapterVersion: "0.0.1",
    payload,
  };
}

function validated(payload: Record<string, unknown>) {
  return validateJobIngestion(envelope(payload));
}

function basePayload(extra: Record<string, unknown> = {}) {
  return {
    sourceCode: "sp.source.demo-seed",
    externalId: `ext-${stamp}`,
    title: "Machine Operator",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
    ...extra,
  };
}

function emptySkills(
  observationId: string,
  extra: Partial<JobSkillNormalizationResult> = {},
): JobSkillNormalizationResult {
  return {
    observationId,
    terms: [],
    resolvedSkills: [],
    unresolvedTerms: [],
    dedupStatus: null,
    freshnessStatus: null,
    ...extra,
  };
}

test("planner maps canonical fields and refuses REJECTED or missing externalId", () => {
  const valid = validated(
    basePayload({
      description: "Operate CNC equipment",
      employerName: "Acme Tools",
      sourceUrl: "https://example.com/jobs/1",
      postedAt: POSTED_AT,
      location: { raw: "Pune, Maharashtra" },
    }),
  );
  const plan = planCanonicalJobPersistence({
    observationId: "obs-plan",
    validation: valid,
    skills: emptySkills("obs-plan", {
      resolvedSkills: [
        {
          skillId: "skill-a",
          canonicalName: "python",
          skillName: "Python",
          skillCode: "sp.skill.python",
          skillStatus: "ACTIVE",
          inputTerms: ["Python", "python"],
          matchTypes: ["canonical"],
        },
        {
          skillId: "skill-a",
          canonicalName: "python",
          skillName: "Python",
          skillCode: "sp.skill.python",
          skillStatus: "ACTIVE",
          inputTerms: ["PYTHON"],
          matchTypes: ["canonical"],
        },
      ],
      unresolvedTerms: ["java scriptt"],
    }),
  });

  assert.equal(plan.title, "Machine Operator");
  assert.equal(plan.description, "Operate CNC equipment");
  assert.equal(plan.companyName, "Acme Tools");
  assert.equal(plan.externalId, `ext-${stamp}`);
  assert.equal(plan.sourceUrl, "https://example.com/jobs/1");
  assert.equal(plan.postedAt?.toISOString(), POSTED_AT);
  assert.deepEqual(plan.skillIds, ["skill-a"]);
  assert.equal(plan.validationStatus, "VALID");

  const review = planCanonicalJobPersistence({
    observationId: "obs-review-plan",
    validation: validated(basePayload({ title: "N/A", externalId: "rev-1" })),
  });
  assert.equal(review.validationStatus, "REVIEW");

  assert.throws(
    () =>
      planCanonicalJobPersistence({
        observationId: "obs-no-ext",
        validation: validated(basePayload({ externalId: undefined })),
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Canonical job identity requires externalId",
  );

  const rejected = validated({
    sourceCode: "sp.source.demo-seed",
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  assert.throws(
    () =>
      planCanonicalJobPersistence({
        observationId: "obs-rejected",
        validation: rejected,
        skills: emptySkills("obs-rejected"),
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Job observation is not eligible for canonical persistence",
  );
});

test("persists Job and JobSkill idempotently without taxonomy or evidence writes", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-persist-${stamp}`,
      name: `[TEST] Persist ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const other = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-persist-b-${stamp}`,
      name: `[TEST] Persist B ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: false,
    },
  });
  createdSourceIds.push(other.id);

  const blob = { nested: "must not appear on Job", skillsText: "React.js / React JS" };
  const validation = validated(
    basePayload({
      sourceId: source.id,
      sourceCode: source.code,
      externalId: `job-${stamp}-a`,
      description: "Canonical operator description",
      employerName: "Acme Tools",
      sourceUrl: "https://example.com/jobs/a",
      postedAt: POSTED_AT,
      location: { raw: "Pune" },
      sourceMetadata: blob,
    }),
  );
  Object.freeze(validation);
  Object.freeze(validation.record);
  Object.freeze(validation.record!.payload);

  const observationId = `obs-persist-a-${stamp}`;
  const skills = await normalizeJobObservationSkills({
    observationId,
    validation,
    skills: ["Python", "python", "React.js", "java scriptt"],
  });
  Object.freeze(skills);

  const evidenceRefBefore = await prisma.evidence.count({
    where: { reference: `raw-ingestion:${observationId}` },
  });
  assert.equal(evidenceRefBefore, 0);

  const first = await persistCanonicalJob({
    observationId,
    validation,
    skills,
  });
  createdJobIds.push(first.job.id);

  assert.equal(first.created, true);
  assert.equal(first.observationId, observationId);
  assert.equal(first.job.title, "Machine Operator");
  assert.equal(first.job.description, "Canonical operator description");
  assert.equal(first.job.companyName, "Acme Tools");
  assert.equal(first.job.sourceId, source.id);
  assert.equal(first.job.externalId, `job-${stamp}-a`);
  assert.equal(first.job.sourceUrl, "https://example.com/jobs/a");
  assert.equal(first.job.postedAt?.toISOString(), POSTED_AT);
  assert.equal(first.job.locationId, null);
  assert.equal(first.job.occupationId, null);
  assert.equal(first.job.sectorId, null);
  assert.equal(first.job.isDemo, true);
  assert.equal(first.job.skills.length, 2);
  assert.ok(first.job.skills.every((row) => row.importance === null));
  assert.ok(first.job.skills.every((row) => row.proficiency === null));
  assert.ok(first.job.skills.some((row) => row.skill.code === "sp.skill.python"));
  assert.ok(first.job.skills.some((row) => row.skill.code === "sp.skill.react"));
  assert.equal(JSON.stringify(first.job).includes("must not appear on Job"), false);

  const evidence = await recordJobPostingEvidence({
    observationId,
    validation,
  });
  createdEvidenceIds.push(evidence.evidence.id);

  const repeat = await persistCanonicalJob({
    observationId,
    validation: validated(
      basePayload({
        sourceCode: source.code,
        externalId: `job-${stamp}-a`,
        title: "Should not overwrite",
      }),
    ),
    skills,
  });
  assert.equal(repeat.created, false);
  assert.equal(repeat.job.id, first.job.id);
  assert.equal(repeat.job.title, "Machine Operator");
  assert.equal(repeat.job.skills.length, 2);

  const review = await persistCanonicalJob({
    observationId: `obs-review-${stamp}`,
    validation: validated(
      basePayload({
        sourceCode: source.code,
        externalId: `job-${stamp}-review`,
        title: "N/A",
      }),
    ),
  });
  createdJobIds.push(review.job.id);
  assert.equal(review.created, true);
  assert.equal(review.job.title, "N/A");

  const stale = await persistCanonicalJob({
    observationId: `obs-stale-${stamp}`,
    validation: validated(
      basePayload({
        sourceCode: source.code,
        externalId: `job-${stamp}-stale`,
        postedAt: "2020-01-01T00:00:00.000Z",
      }),
    ),
  });
  createdJobIds.push(stale.job.id);
  assert.equal(stale.created, true);

  const otherSource = await persistCanonicalJob({
    observationId: "obs-other",
    validation: validated(
      basePayload({
        sourceCode: other.code,
        externalId: `job-${stamp}-a`,
        title: "Same external id, other source",
      }),
    ),
  });
  createdJobIds.push(otherSource.job.id);
  assert.notEqual(otherSource.job.id, first.job.id);
  assert.equal(otherSource.job.sourceId, other.id);
  assert.equal(otherSource.job.isDemo, false);

  assert.equal(
    await prisma.evidence.count({
      where: { reference: `raw-ingestion:${observationId}` },
    }),
    1,
  );
  assert.equal(
    await prisma.skill.count({ where: { canonicalName: "java scriptt" } }),
    0,
  );
  assert.equal(validation.record!.payload.title, "Machine Operator");
});

test("unknown source, mismatch, REJECTED, and invalid skills do not persist Jobs", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-persist-err-${stamp}`,
      name: `[TEST] Persist err ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  await assert.rejects(
    () =>
      persistCanonicalJob({
        observationId: "obs-unknown",
        validation: validated(
          basePayload({
            sourceCode: "sp.source.does-not-exist",
            externalId: `job-${stamp}-unknown`,
          }),
        ),
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );

  await assert.rejects(
    () =>
      persistCanonicalJob({
        observationId: "obs-mismatch",
        validation: validated(
          basePayload({
            sourceId: source.id,
            sourceCode: "sp.source.demo-seed",
            externalId: `job-${stamp}-mismatch`,
          }),
        ),
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );

  const rejected = validated({
    sourceCode: source.code,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });
  await assert.rejects(
    () =>
      persistCanonicalJob({
        observationId: "obs-rej",
        validation: rejected,
      }),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );

  await assert.rejects(
    () =>
      persistCanonicalJob({
        observationId: "obs-fake-skill",
        validation: validated(
          basePayload({
            sourceCode: source.code,
            externalId: `job-${stamp}-fake`,
          }),
        ),
        skills: emptySkills("obs-fake-skill", {
          resolvedSkills: [
            {
              skillId: "00000000-0000-4000-8000-000000000099",
              canonicalName: "missing",
              skillName: "Missing",
              skillCode: "sp.skill.missing",
              skillStatus: "ACTIVE",
              inputTerms: ["missing"],
              matchTypes: ["canonical"],
            },
          ],
        }),
      }),
    (error: unknown) =>
      error instanceof AppError && error.message === "Resolved skill does not exist",
  );

  assert.equal(
    await prisma.job.count({
      where: {
        externalId: {
          in: [
            `job-${stamp}-unknown`,
            `job-${stamp}-mismatch`,
            `job-${stamp}-fake`,
          ],
        },
      },
    }),
    0,
  );
});

test("deprecated resolved skills persist as JobSkill without taxonomy mutation", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-persist-dep-${stamp}`,
      name: `[TEST] Persist dep ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "INDIA",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const deprecated = await prisma.skill.create({
    data: {
      code: `sp.skill.test-persist-dep-${stamp}`,
      name: `[TEST] Deprecated persist ${stamp}`,
      canonicalName: `deprecated persist ${stamp}`,
      status: "DEPRECATED",
    },
  });
  createdSkillIds.push(deprecated.id);

  const validation = validated(
    basePayload({
      sourceCode: source.code,
      externalId: `job-${stamp}-dep`,
    }),
  );
  const skills = await normalizeJobObservationSkills({
    observationId: "obs-dep",
    validation,
    skills: [`deprecated persist ${stamp}`],
  });
  assert.equal(skills.terms[0]?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(skills.terms[0]?.skillStatus, "DEPRECATED");

  const statusBefore = deprecated.status;
  const result = await persistCanonicalJob({
    observationId: "obs-dep",
    validation,
    skills,
  });
  createdJobIds.push(result.job.id);

  assert.equal(result.job.skills.length, 1);
  assert.equal(result.job.skills[0]?.skillId, deprecated.id);
  assert.equal(result.job.skills[0]?.skill.status, "DEPRECATED");
  const still = await prisma.skill.findUniqueOrThrow({ where: { id: deprecated.id } });
  assert.equal(still.status, statusBefore);
});
