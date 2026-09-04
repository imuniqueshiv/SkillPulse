import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SKILL_EXTRACTION_METHOD,
  SKILL_INTELLIGENCE_STATUS,
  type JobIntelligenceSkill,
} from "../src/modules/intelligence/contract";
import { prepareJobText } from "../src/modules/intelligence/job-text";
import { applyRequirementSignals } from "../src/modules/intelligence/requirement-signals";

function skill(
  rawTerm: string,
  extra: Partial<JobIntelligenceSkill> = {},
): JobIntelligenceSkill {
  return {
    rawTerm,
    contributingTerms: extra.contributingTerms ?? [rawTerm],
    canonicalName: extra.canonicalName,
    skillId: extra.skillId,
    status: extra.status ?? SKILL_INTELLIGENCE_STATUS.UNRESOLVED,
    extractionMethod: extra.extractionMethod ?? SKILL_EXTRACTION_METHOD.TEXT_MATCH,
    extractionMethods: extra.extractionMethods ?? [SKILL_EXTRACTION_METHOD.TEXT_MATCH],
    confidenceTier: extra.confidenceTier ?? "LOW",
    requirementLevel: extra.requirementLevel ?? "MENTIONED",
    requirementMethod: extra.requirementMethod ?? "DEFAULT_MENTIONED",
    requirementConfidenceTier: extra.requirementConfidenceTier ?? "LOW",
    ...extra,
  };
}

function classify(title: string, description: string, skills: JobIntelligenceSkill[]) {
  return applyRequirementSignals(skills, prepareJobText({ id: "job", title, description }));
}

test("REQUIRED, PREFERRED, OPTIONAL, and conservative MENTIONED", () => {
  const python = skill("Python", {
    status: SKILL_INTELLIGENCE_STATUS.RESOLVED,
    canonicalName: "python",
  });
  const react = skill("React", {
    status: SKILL_INTELLIGENCE_STATUS.RESOLVED,
    canonicalName: "react",
    contributingTerms: ["React", "React.js"],
  });
  const docker = skill("Docker");
  const aws = skill("AWS");
  const sql = skill("SQL", {
    status: SKILL_INTELLIGENCE_STATUS.RESOLVED,
    canonicalName: "sql",
  });

  const mixed = classify(
    "Developer",
    "Python experience required. React is essential. Docker would be preferred. AWS is a plus. SQL.",
    [python, react, docker, aws, sql],
  );

  assert.equal(mixed.find((row) => row.canonicalName === "python")?.requirementLevel, "REQUIRED");
  assert.equal(mixed.find((row) => row.canonicalName === "react")?.requirementLevel, "REQUIRED");
  assert.equal(mixed.find((row) => row.rawTerm === "Docker")?.requirementLevel, "PREFERRED");
  assert.equal(mixed.find((row) => row.rawTerm === "AWS")?.requirementLevel, "OPTIONAL");
  assert.equal(mixed.find((row) => row.canonicalName === "sql")?.requirementLevel, "MENTIONED");
  assert.equal(mixed.find((row) => row.canonicalName === "python")?.requirementMethod, "LOCAL_SIGNAL");
  assert.equal(mixed.find((row) => row.canonicalName === "sql")?.requirementMethod, "DEFAULT_MENTIONED");
  assert.equal(mixed.find((row) => row.canonicalName === "python")?.requirementConfidenceTier, "HIGH");
  assert.equal(mixed.find((row) => row.rawTerm === "Docker")?.requirementConfidenceTier, "MEDIUM");
  assert.equal(mixed.find((row) => row.canonicalName === "sql")?.requirementConfidenceTier, "LOW");
  assert.match(
    mixed.find((row) => row.canonicalName === "python")?.requirementEvidence ?? "",
    /required/i,
  );
});

test("mandatory, compulsory, strong knowledge, and desirable wording", () => {
  const python = skill("Python", { canonicalName: "python", status: "RESOLVED" });
  const react = skill("React", { canonicalName: "react", status: "RESOLVED" });
  const aws = skill("AWS");

  const result = classify(
    "Role",
    "Python is mandatory. Strong knowledge of React. Knowledge of AWS is desirable.",
    [python, react, aws],
  );
  assert.equal(result.find((row) => row.canonicalName === "python")?.requirementLevel, "REQUIRED");
  assert.equal(result.find((row) => row.canonicalName === "react")?.requirementLevel, "REQUIRED");
  assert.equal(result.find((row) => row.rawTerm === "AWS")?.requirementLevel, "OPTIONAL");
});

test("ambiguous wording stays MENTIONED", () => {
  const python = skill("Python", { canonicalName: "python", status: "RESOLVED" });
  const cases = [
    "familiarity with Python",
    "exposure to Python",
    "knowledge of Python",
    "Python experience",
    "Python skills",
    "Python",
  ];
  for (const description of cases) {
    const result = classify("Role", description, [python]);
    assert.equal(
      result[0]?.requirementLevel,
      "MENTIONED",
      description,
    );
    assert.equal(result[0]?.requirementMethod, "DEFAULT_MENTIONED", description);
  }
});

test("stronger nearby signal wins over weaker wording for the same skill", () => {
  const python = skill("Python", { canonicalName: "python", status: "RESOLVED" });
  const result = classify(
    "Role",
    "Python experience required; Python knowledge is a plus.",
    [python],
  );
  assert.equal(result[0]?.requirementLevel, "REQUIRED");
  assert.match(result[0]?.requirementEvidence ?? "", /required/i);
});

test("unrelated sentence does not change another skill", () => {
  const python = skill("Python", { canonicalName: "python", status: "RESOLVED" });
  const docker = skill("Docker");
  const result = classify(
    "Role",
    "Python experience. Docker is required for the platform team.",
    [python, docker],
  );
  assert.equal(result.find((row) => row.canonicalName === "python")?.requirementLevel, "MENTIONED");
  assert.equal(result.find((row) => row.rawTerm === "Docker")?.requirementLevel, "REQUIRED");
});

test("multiple skills keep independent requirement levels", () => {
  const python = skill("Python", { canonicalName: "python", status: "RESOLVED" });
  const react = skill("React", { canonicalName: "react", status: "RESOLVED" });
  const docker = skill("Docker");
  const aws = skill("AWS");
  const result = classify(
    "Role",
    "Python is required. React would be preferred. AWS is a plus. Mention Docker.",
    [python, react, docker, aws],
  );
  assert.equal(result.find((row) => row.canonicalName === "python")?.requirementLevel, "REQUIRED");
  assert.equal(result.find((row) => row.canonicalName === "react")?.requirementLevel, "PREFERRED");
  assert.equal(result.find((row) => row.rawTerm === "AWS")?.requirementLevel, "OPTIONAL");
  assert.equal(result.find((row) => row.rawTerm === "Docker")?.requirementLevel, "MENTIONED");
});

test("periods inside React.js or Node.js do not drop local requirement signals", () => {
  const react = skill("React.js", {
    canonicalName: "react",
    status: "RESOLVED",
    contributingTerms: ["React.js"],
  });
  const node = skill("Node.js", {
    canonicalName: "node.js",
    status: "RESOLVED",
    contributingTerms: ["Node.js"],
  });
  const result = classify(
    "Role",
    "Python is required. React.js would be preferred. Node.js is a plus.",
    [react, node, skill("Python", { canonicalName: "python", status: "RESOLVED" })],
  );
  assert.equal(result.find((row) => row.canonicalName === "react")?.requirementLevel, "PREFERRED");
  assert.equal(result.find((row) => row.canonicalName === "node.js")?.requirementLevel, "OPTIONAL");
  assert.equal(result.find((row) => row.canonicalName === "python")?.requirementLevel, "REQUIRED");
});

test("requirement classification is deterministic", () => {
  const skills = [
    skill("Python", { canonicalName: "python", status: "RESOLVED" }),
    skill("Docker"),
  ];
  const first = classify("Role", "Python is required. Docker is a plus.", skills);
  const second = classify("Role", "Python is required. Docker is a plus.", skills);
  assert.deepEqual(first, second);
});
