import assert from "node:assert/strict";
import { test } from "node:test";
import {
  OCCUPATION_CLASSIFICATION_METHOD,
  SKILL_INTELLIGENCE_STATUS,
  type JobIntelligenceSkill,
} from "../src/modules/intelligence/contract";
import {
  classifyOccupation,
  type OccupationClassificationRecord,
} from "../src/modules/intelligence/occupation-classification";
import { classifySector } from "../src/modules/intelligence/sector-classification";

const software: OccupationClassificationRecord = {
  id: "occ-software",
  name: "Software Developers",
  code: "2512",
  status: "ACTIVE",
  skillLinks: [
    { skillId: "skill-python", relation: "RELATED" },
    { skillId: "skill-js", relation: "CORE" },
  ],
};

const web: OccupationClassificationRecord = {
  id: "occ-web",
  name: "Web and Multimedia Developers",
  code: "2513",
  status: "ACTIVE",
  skillLinks: [
    { skillId: "skill-js", relation: "CORE" },
    { skillId: "skill-react", relation: "CORE" },
  ],
};

const nurse: OccupationClassificationRecord = {
  id: "occ-nurse",
  name: "Nursing Professionals",
  code: "2221",
  status: "ACTIVE",
  skillLinks: [
    { skillId: "skill-care", relation: "CORE" },
    { skillId: "skill-ipc", relation: "CORE" },
  ],
};

const community: OccupationClassificationRecord = {
  id: "occ-community",
  name: "Community Health Workers",
  code: "3253",
  status: "ACTIVE",
  skillLinks: [
    { skillId: "skill-care", relation: "CORE" },
    { skillId: "skill-ipc", relation: "CORE" },
  ],
};

function resolved(skillId: string, name: string): JobIntelligenceSkill {
  return {
    rawTerm: name,
    contributingTerms: [name],
    skillId,
    canonicalName: name,
    status: SKILL_INTELLIGENCE_STATUS.RESOLVED,
    extractionMethod: "CANONICAL_NAME_MATCH",
    extractionMethods: ["CANONICAL_NAME_MATCH"],
    confidenceTier: "HIGH",
    requirementLevel: "MENTIONED",
    requirementMethod: "DEFAULT_MENTIONED",
    requirementConfidenceTier: "LOW",
  };
}

test("occupation title exact, keyword, skill association, unknown, and ties", () => {
  const exact = classifyOccupation({
    title: "Software Developer",
    skills: [],
    occupations: [software, web, nurse],
  });
  assert.equal(exact.status, "CLASSIFIED");
  assert.equal(exact.occupationId, "occ-software");
  assert.equal(exact.method, OCCUPATION_CLASSIFICATION_METHOD.TITLE_EXACT);
  assert.equal(exact.code, "2512");

  const keyword = classifyOccupation({
    title: "Senior Software Developers",
    skills: [],
    occupations: [software, web],
  });
  assert.equal(keyword.method, OCCUPATION_CLASSIFICATION_METHOD.TITLE_KEYWORD);

  const associated = classifyOccupation({
    title: "Engineer",
    skills: [resolved("skill-js", "JavaScript"), resolved("skill-react", "React")],
    occupations: [software, web, nurse],
  });
  assert.equal(associated.occupationId, "occ-web");
  assert.equal(associated.method, OCCUPATION_CLASSIFICATION_METHOD.SKILL_ASSOCIATION);

  const unknown = classifyOccupation({
    title: "Machine Operator",
    skills: [],
    occupations: [software, web, nurse],
  });
  assert.equal(unknown.status, "UNCLASSIFIED");

  const weak = classifyOccupation({
    title: "Engineer",
    skills: [resolved("skill-js", "JavaScript")],
    occupations: [software, web],
  });
  assert.equal(weak.status, "UNCLASSIFIED");

  const tied = classifyOccupation({
    title: "Health worker",
    skills: [resolved("skill-care", "Patient Care"), resolved("skill-ipc", "IPC")],
    occupations: [nurse, community],
  });
  assert.equal(tied.status, "UNCLASSIFIED");
  assert.equal(tied.occupationId, undefined);

  const first = classifyOccupation({
    title: "Software Developer",
    skills: [],
    occupations: [web, software],
  });
  const second = classifyOccupation({
    title: "Software Developer",
    skills: [],
    occupations: [software, web],
  });
  assert.deepEqual(first, second);
});

test("sector derives from occupation and stays unclassified otherwise", () => {
  const classified = classifyOccupation({
    title: "Software Developer",
    skills: [],
    occupations: [software],
  });
  const sector = classifySector({
    occupation: classified,
    sector: {
      id: "sec-it",
      code: "sp.sector.it-ites",
      name: "Information Technology",
      status: "ACTIVE",
    },
  });
  assert.equal(sector.status, "CLASSIFIED");
  assert.equal(sector.method, "OCCUPATION_SECTOR");
  assert.equal(sector.sectorId, "sec-it");

  const missing = classifySector({
    occupation: classified,
    sector: null,
  });
  assert.equal(missing.status, "UNCLASSIFIED");

  const unknownOcc = classifySector({
    occupation: {
      status: "UNCLASSIFIED",
      method: "UNCLASSIFIED",
    },
    sector: {
      id: "sec-it",
      code: "sp.sector.it-ites",
      name: "Information Technology",
      status: "ACTIVE",
    },
  });
  assert.equal(unknownOcc.status, "UNCLASSIFIED");
  assert.equal(unknownOcc.sectorId, undefined);
});
