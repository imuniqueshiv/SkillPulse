import assert from "node:assert/strict";
import { test } from "node:test";
import { SKILL_EXTRACTION_METHOD } from "../src/modules/intelligence/contract";
import { prepareJobText } from "../src/modules/intelligence/job-text";
import {
  extractSkillCandidates,
  isBoundarySafeMatch,
  type SkillMatchSurface,
} from "../src/modules/intelligence/skill-extraction";

const surfaces: SkillMatchSurface[] = [
  { surface: "JavaScript", method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH },
  { surface: "Java", method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH },
  { surface: "Python", method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH },
  { surface: "C++", method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { surface: "C#", method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { surface: "C", method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { surface: "React.js", method: SKILL_EXTRACTION_METHOD.ALIAS_MATCH },
  { surface: "Node.js", method: SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH },
];

function extract(title: string, description: string | null, extra?: {
  explicitSkills?: string[];
  jobSkillNames?: string[];
}) {
  return extractSkillCandidates({
    text: prepareJobText({ id: "job", title, description }),
    surfaces,
    explicitSkills: extra?.explicitSkills,
    jobSkillNames: extra?.jobSkillNames,
  });
}

test("explicit skills, title, description, repeats, and evidence", () => {
  const first = extract("Python developer", "Experience with React.js, Node.js, PostgreSQL and REST APIs.", {
    explicitSkills: ["SQL", "SQL"],
  });
  const second = extract("Python developer", "Experience with React.js, Node.js, PostgreSQL and REST APIs.", {
    explicitSkills: ["SQL", "SQL"],
  });
  assert.deepEqual(first, second);

  assert.ok(first.some((row) => row.rawTerm === "SQL" && row.extractionMethod === "EXPLICIT_SKILL_FIELD"));
  assert.ok(first.some((row) => row.rawTerm === "Python" && row.sourceField === "title"));
  assert.ok(first.some((row) => row.rawTerm === "React.js" && row.sourceField === "description"));
  assert.ok(first.some((row) => row.rawTerm === "Node.js"));
  assert.ok(first.some((row) => row.rawTerm === "PostgreSQL"));
  assert.ok(first.some((row) => row.rawTerm === "REST APIs"));
  const react = first.find((row) => row.rawTerm === "React.js");
  assert.ok(react?.evidence);
  assert.equal(typeof react?.evidenceStart, "number");
});

test("unknown skill remains a candidate and job.skills are explicit", () => {
  const result = extract("Quantum Blockchain Ninja", null, {
    jobSkillNames: ["Python"],
  });
  assert.ok(result.some((row) => row.rawTerm === "Python" && row.sourceField === "job.skills"));
  assert.equal(result.some((row) => /quantum/i.test(row.rawTerm)), false);
});

test("boundary safety: Java/JavaScript, C/C++/C#, R, Go/.NET", () => {
  const javaScript = extract("JavaScript engineer", null);
  assert.ok(javaScript.some((row) => row.rawTerm === "JavaScript"));
  assert.equal(javaScript.some((row) => row.rawTerm === "Java"), false);

  const java = extract("Java engineer", null);
  assert.ok(java.some((row) => row.rawTerm === "Java"));
  assert.equal(java.some((row) => row.rawTerm === "JavaScript"), false);

  const cpp = extract("Need C++ and C#", null);
  assert.ok(cpp.some((row) => row.rawTerm === "C++"));
  assert.ok(cpp.some((row) => row.rawTerm === "C#"));

  const cOnly = extract("Use C for firmware", null);
  assert.ok(cOnly.some((row) => row.rawTerm === "C"));

  const go = extract("Hire Go developers", "Not Google Cloud");
  assert.ok(go.some((row) => row.rawTerm === "Go"));
  assert.equal(go.some((row) => row.rawTerm === "Google"), false);

  const r = extract("Use R for statistics", "React.js is separate");
  assert.ok(r.some((row) => row.rawTerm === "R"));
  assert.ok(r.some((row) => row.rawTerm === "React.js"));

  const dotnet = extract(".NET developer", null);
  assert.ok(dotnet.some((row) => row.rawTerm === ".NET"));

  assert.equal(isBoundarySafeMatch("JavaScript", 0, "Java"), false);
  assert.equal(isBoundarySafeMatch("Google", 0, "Go"), false);
  assert.equal(isBoundarySafeMatch("C++", 0, "C"), false);
});
