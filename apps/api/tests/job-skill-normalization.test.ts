import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  INGESTION_CONTRACT_VERSION,
  INGESTION_RECORD_KIND,
} from "../src/modules/ingestion/contract";
import { JOB_DEDUP_STATUS } from "../src/modules/ingestion/job-deduplication";
import { JOB_FRESHNESS_STATUS } from "../src/modules/ingestion/job-freshness";
import {
  JOB_SKILL_RESOLUTION_STATUS,
  normalizeJobObservationSkills,
} from "../src/modules/ingestion/job-skill-normalization";
import { validateJobIngestion } from "../src/modules/ingestion/job-validation";
import { normalizeTerm } from "../src/modules/taxonomy/normalize";
import { AppError } from "../src/utils/errors";

const OBSERVED_AT = "2026-09-01T10:00:00.000Z";
const INGESTED_AT = "2026-09-01T10:05:00.000Z";
const stamp = Date.now();
const createdSkillIds: string[] = [];

after(async () => {
  if (env.DATABASE_URL && createdSkillIds.length > 0) {
    await getPrisma().skill.deleteMany({
      where: { id: { in: createdSkillIds } },
    });
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

function validated(payload: Record<string, unknown> = {}) {
  return validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      title: "Machine Operator",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
      ...payload,
    }),
  );
}

async function assertTermNotMaterialized(term: string) {
  const normalized = normalizeTerm(term);
  if (!normalized) {
    return;
  }
  const prisma = getPrisma();
  assert.equal(await prisma.skill.count({ where: { canonicalName: normalized } }), 0);
  assert.equal(
    await prisma.skillAlias.count({ where: { normalizedTerm: normalized } }),
    0,
  );
}

test("canonical, alias, case, whitespace, and unresolved terms", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const validation = validated();
  const result = await normalizeJobObservationSkills({
    observationId: "obs-skills-1",
    validation,
    skills: [
      "Python",
      "  python  ",
      "PYTHON",
      "React.js",
      "ReactJS",
      "JS",
      "Java",
      "java scriptt",
      "SomeObscureToolXYZ",
    ],
  });

  const byTerm = Object.fromEntries(
    result.terms.map((term) => [term.inputTerm, term]),
  );

  assert.equal(byTerm.Python?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(byTerm.Python?.matchType, "canonical");
  assert.equal(byTerm.Python?.canonicalName, "python");
  assert.equal(byTerm.Python?.skillCode, "sp.skill.python");
  assert.equal(byTerm.Python?.inputTerm, "Python");

  assert.equal(byTerm["  python  "]?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(byTerm.PYTHON?.skillId, byTerm.Python?.skillId);

  assert.equal(byTerm["React.js"]?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(byTerm["React.js"]?.matchType, "alias");
  assert.equal(byTerm["React.js"]?.inputTerm, "React.js");
  assert.equal(byTerm["React.js"]?.canonicalName, "react");
  assert.equal(byTerm.ReactJS?.skillId, byTerm["React.js"]?.skillId);

  assert.equal(byTerm.JS?.matchType, "alias");
  assert.equal(byTerm.JS?.skillCode, "sp.skill.javascript");
  assert.equal(byTerm.Java?.skillCode, "sp.skill.java");
  assert.notEqual(byTerm.Java?.skillId, byTerm.JS?.skillId);

  assert.equal(byTerm["java scriptt"]?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.equal(byTerm.SomeObscureToolXYZ?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.equal(byTerm.SomeObscureToolXYZ?.skillId, undefined);

  const python = result.resolvedSkills.find((row) => row.skillCode === "sp.skill.python");
  assert.ok(python);
  assert.deepEqual(python.inputTerms, ["Python", "  python  ", "PYTHON"]);

  const react = result.resolvedSkills.find((row) => row.skillCode === "sp.skill.react");
  assert.ok(react);
  assert.deepEqual(react.inputTerms, ["React.js", "ReactJS"]);

  assert.equal(result.observationId, "obs-skills-1");
  await assertTermNotMaterialized("java scriptt");
  await assertTermNotMaterialized("SomeObscureToolXYZ");
});

test("repeated terms collapse to one canonical Skill; inputs are not mutated", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const skills = [{ term: "Python" }, { term: "python" }, { term: "Python " }];
  Object.freeze(skills);
  Object.freeze(skills[0]);
  const validation = validated();
  Object.freeze(validation);

  const first = await normalizeJobObservationSkills({
    observationId: "obs-repeat",
    validation,
    skills,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });
  const second = await normalizeJobObservationSkills({
    observationId: "obs-repeat",
    validation,
    skills,
    dedupStatus: JOB_DEDUP_STATUS.DUPLICATE,
    freshnessStatus: JOB_FRESHNESS_STATUS.STALE,
  });

  assert.equal(first.resolvedSkills.length, 1);
  assert.equal(first.resolvedSkills[0]?.skillCode, "sp.skill.python");
  assert.deepEqual(first.resolvedSkills[0]?.inputTerms, [
    "Python",
    "python",
    "Python ",
  ]);
  assert.equal(skills[0]?.term, "Python");
  assert.equal(first.dedupStatus, JOB_DEDUP_STATUS.DUPLICATE);
  assert.equal(first.freshnessStatus, JOB_FRESHNESS_STATUS.STALE);
  assert.deepEqual(first, second);
});

test("empty, blank, metadata fallback, and no skillsText extraction", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const empty = await normalizeJobObservationSkills({
    observationId: "obs-empty",
    validation: validated(),
    skills: [],
  });
  assert.deepEqual(empty.terms, []);
  assert.deepEqual(empty.resolvedSkills, []);

  const blanks = await normalizeJobObservationSkills({
    observationId: "obs-blank",
    validation: validated(),
    skills: ["", "   "],
  });
  assert.equal(blanks.terms.length, 2);
  assert.equal(blanks.terms[0]?.inputTerm, "");
  assert.equal(blanks.terms[1]?.inputTerm, "   ");
  assert.equal(blanks.terms[0]?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.deepEqual(blanks.unresolvedTerms, ["", "   "]);

  const fromMetadata = await normalizeJobObservationSkills({
    observationId: "obs-meta",
    validation: validated({
      sourceMetadata: { skills: ["React.js", "Python3"] },
    }),
  });
  assert.equal(fromMetadata.terms[0]?.inputTerm, "React.js");
  assert.equal(fromMetadata.terms[1]?.matchType, "alias");
  assert.equal(fromMetadata.resolvedSkills.length, 2);

  const explicitWins = await normalizeJobObservationSkills({
    observationId: "obs-explicit",
    validation: validated({
      sourceMetadata: { skills: ["Python"] },
    }),
    skills: ["SQL"],
  });
  assert.equal(explicitWins.terms.length, 1);
  assert.equal(explicitWins.terms[0]?.canonicalName, "sql");

  const blob = await normalizeJobObservationSkills({
    observationId: "obs-blob",
    validation: validated({
      sourceMetadata: { skillsText: "React.js / React JS" },
    }),
  });
  assert.deepEqual(blob.terms, []);
});

test("REVIEW is normalized; REJECTED is not; unique/fresh do not change matching", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const review = await normalizeJobObservationSkills({
    observationId: "obs-review",
    validation: validated({ title: "N/A" }),
    skills: ["SQL"],
    dedupStatus: JOB_DEDUP_STATUS.UNIQUE,
    freshnessStatus: JOB_FRESHNESS_STATUS.FRESH,
  });
  assert.equal(review.terms[0]?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(review.terms[0]?.canonicalName, "sql");
  assert.equal(review.dedupStatus, JOB_DEDUP_STATUS.UNIQUE);
  assert.equal(review.freshnessStatus, JOB_FRESHNESS_STATUS.FRESH);

  const rejected = validateJobIngestion(
    envelope({
      sourceCode: "sp.source.demo-seed",
      observedAt: OBSERVED_AT,
      ingestedAt: INGESTED_AT,
    }),
  );
  assert.equal(rejected.status, "REJECTED");
  await assert.rejects(
    () =>
      normalizeJobObservationSkills({
        observationId: "obs-rejected",
        validation: rejected,
        skills: ["Python"],
      }),
    (error: unknown) =>
      error instanceof AppError &&
      error.message === "Job observation is not eligible for skill normalization",
  );
});

test("DRAFT and ARCHIVED taxonomy entries do not resolve; DEPRECATED does", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const prisma = getPrisma();
  const archived = await prisma.skill.create({
    data: {
      code: `sp.skill.test-arch-${stamp}`,
      name: `[TEST] Archived ${stamp}`,
      canonicalName: `archived tool ${stamp}`,
      status: "ARCHIVED",
    },
  });
  const draft = await prisma.skill.create({
    data: {
      code: `sp.skill.test-draft-${stamp}`,
      name: `[TEST] Draft ${stamp}`,
      canonicalName: `draft tool ${stamp}`,
      status: "DRAFT",
    },
  });
  const deprecated = await prisma.skill.create({
    data: {
      code: `sp.skill.test-dep-${stamp}`,
      name: `[TEST] Deprecated ${stamp}`,
      canonicalName: `deprecated tool ${stamp}`,
      status: "DEPRECATED",
    },
  });
  createdSkillIds.push(archived.id, draft.id, deprecated.id);

  await prisma.skillAlias.create({
    data: {
      skillId: archived.id,
      rawTerm: `ArchivedAlias ${stamp}`,
      normalizedTerm: normalizeTerm(`ArchivedAlias ${stamp}`),
      confidence: 0.9,
    },
  });

  const result = await normalizeJobObservationSkills({
    observationId: "obs-status",
    validation: validated(),
    skills: [
      `archived tool ${stamp}`,
      `ArchivedAlias ${stamp}`,
      `draft tool ${stamp}`,
      `deprecated tool ${stamp}`,
    ],
  });

  assert.equal(result.terms[0]?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.equal(result.terms[1]?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.equal(result.terms[2]?.status, JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED);
  assert.equal(result.terms[3]?.status, JOB_SKILL_RESOLUTION_STATUS.RESOLVED);
  assert.equal(result.terms[3]?.skillId, deprecated.id);
  assert.equal(result.terms[3]?.skillStatus, "DEPRECATED");

  const stillArchived = await prisma.skill.findUniqueOrThrow({
    where: { id: archived.id },
  });
  const stillDraft = await prisma.skill.findUniqueOrThrow({
    where: { id: draft.id },
  });
  assert.equal(stillArchived.status, "ARCHIVED");
  assert.equal(stillDraft.status, "DRAFT");
});
