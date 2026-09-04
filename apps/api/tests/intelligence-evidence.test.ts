import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";

after(async () => {
  await disconnectPrisma();
});

test("confidence tiers, evidence fields, and no raw payload leakage", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const { intelligence } = await processJobIntelligence({
    job: {
      id: "evidence-job",
      title: "Software Developer",
      description: "Python is required. React.js is listed. Needs java scriptt. PostgreSQL.",
      skills: [{ name: "Python" }],
    },
    explicitSkills: ["React.js", "java scriptt"],
    experienceText: "2-4 years",
    qualificationText: "B.Tech in Computer Science",
    persist: false,
  });

  const pythonSkill = intelligence.skills.find((row) => row.canonicalName === "python");
  assert.ok(pythonSkill);
  assert.equal(pythonSkill.confidenceTier, "HIGH");
  assert.ok(pythonSkill.extractionMethods.includes("EXPLICIT_SKILL_FIELD"));
  assert.equal(pythonSkill.normalizationMethod, "canonical");
  assert.equal(pythonSkill.requirementLevel, "REQUIRED");
  assert.equal(pythonSkill.requirementConfidenceTier, "HIGH");
  assert.ok(pythonSkill.requirementEvidence);
  assert.ok(pythonSkill.rawTerm);
  assert.ok(pythonSkill.contributingTerms.includes("Python"));

  const react = intelligence.skills.find((row) => row.canonicalName === "react");
  assert.ok(react);
  assert.equal(react.confidenceTier, "HIGH");
  assert.equal(react.extractionMethod, "EXPLICIT_SKILL_FIELD");
  assert.equal(react.normalizationMethod, "alias");
  assert.ok(react.contributingTerms.includes("React.js"));
  assert.equal(react.sourceField, "explicitSkills");

  const unresolved = intelligence.skills.find((row) => row.rawTerm === "java scriptt");
  assert.ok(unresolved);
  assert.equal(unresolved.status, "UNRESOLVED");
  assert.equal(unresolved.confidenceTier, "LOW");
  assert.equal(unresolved.requirementLevel, "MENTIONED");

  const postgres = intelligence.skills.find((row) => row.rawTerm === "PostgreSQL");
  assert.ok(postgres);
  assert.equal(postgres.status, "UNRESOLVED");
  assert.equal(postgres.extractionMethod, "TEXT_MATCH");
  assert.equal(postgres.confidenceTier, "LOW");
  assert.ok(postgres.evidence);
  assert.equal(typeof postgres.evidenceStart, "number");

  assert.equal(intelligence.occupation.status, "CLASSIFIED");
  assert.equal(intelligence.occupation.method, "TITLE_EXACT");
  assert.equal(intelligence.occupation.confidenceTier, "HIGH");
  assert.ok(intelligence.occupation.evidence);

  assert.equal(intelligence.sector.status, "CLASSIFIED");
  assert.equal(intelligence.sector.method, "OCCUPATION_SECTOR");
  assert.ok(intelligence.sector.evidence);
  assert.ok(intelligence.sector.confidenceTier);

  assert.equal(intelligence.experience.status, "PARSED");
  assert.equal(intelligence.experience.extractionMethod, "CALLER_TEXT");
  assert.equal(intelligence.experience.confidenceTier, "HIGH");
  assert.equal(intelligence.experience.rawText, "2-4 years");

  assert.ok(intelligence.qualifications.some((row) => row.normalized === "B.Tech"));
  assert.ok(
    intelligence.qualifications.every(
      (row) => row.extractionMethod === "CALLER_TEXT" && row.rawText === "B.Tech in Computer Science",
    ),
  );
  assert.ok(intelligence.qualifications.every((row) => row.confidenceTier === "HIGH"));

  const encoded = JSON.stringify(intelligence);
  assert.equal(encoded.includes('"payload"'), false);
  assert.equal(encoded.includes("Bearer "), false);
  assert.equal(encoded.includes("authorization"), false);
  assert.equal("payload" in intelligence, false);
  assert.equal("rawPayload" in intelligence, false);
});

test("missing optional fields stay UNKNOWN with LOW confidence", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const { intelligence } = await processJobIntelligence({
    job: { id: "eval-missing", title: "Clerk", description: "Office work" },
    persist: false,
  });
  assert.equal(intelligence.experience.status, "UNKNOWN");
  assert.equal(intelligence.experience.extractionMethod, "UNAVAILABLE");
  assert.equal(intelligence.experience.confidenceTier, "LOW");
  assert.equal(intelligence.qualifications[0]?.status, "UNKNOWN");
  assert.equal(intelligence.qualifications[0]?.extractionMethod, "UNAVAILABLE");
  assert.equal(intelligence.occupation.status, "UNCLASSIFIED");
  assert.ok(intelligence.occupation.evidence);
  assert.equal(intelligence.sector.status, "UNCLASSIFIED");
  assert.ok(intelligence.sector.evidence);
});
