import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TRAINING_METHODOLOGY_VERSION,
  TRAINING_NEED_LEVEL,
  TRAINING_CAPACITY_STATUS,
  PROGRAM_ALIGNMENT,
  CURRICULUM_COVERAGE_STATUS,
  classifyTrainingCapacity,
  classifyTrainingNeed,
  computeDemandWeightedCoverage,
  classifyAlignment,
  dedupeProgramSkills,
  buildProgramView,
  summarizeTrainingIntelligence,
  extractTrainingCapacity,
} from "../src/modules/training";
import { buildTrainingEvaluationCase } from "../src/modules/training/evaluate";
import { SUPPLY_TYPE } from "../src/modules/gaps/policy";
import type { SupplyObservation } from "../src/modules/gaps/contract";
import { inferGeographyLevel } from "../src/modules/gaps/comparability";

test("training-v1 capacity and need classification", () => {
  assert.equal(
    classifyTrainingCapacity({
      capacityQuantity: null,
      shortageQuantity: 10,
      hasCapacityObservations: false,
    }).status,
    TRAINING_CAPACITY_STATUS.UNKNOWN,
  );
  assert.equal(
    classifyTrainingCapacity({
      capacityQuantity: 0,
      shortageQuantity: 10,
      hasCapacityObservations: true,
    }).status,
    TRAINING_CAPACITY_STATUS.UNAVAILABLE,
  );
  assert.equal(
    classifyTrainingCapacity({
      capacityQuantity: 5,
      shortageQuantity: 10,
      hasCapacityObservations: true,
    }).status,
    TRAINING_CAPACITY_STATUS.INSUFFICIENT,
  );
  assert.equal(
    classifyTrainingCapacity({
      capacityQuantity: 12,
      shortageQuantity: 10,
      hasCapacityObservations: true,
    }).status,
    TRAINING_CAPACITY_STATUS.AVAILABLE,
  );

  const high = buildTrainingEvaluationCase({
    id: "x",
    label: "x",
    expected: {},
    _builder: "high-need",
  });
  const need = classifyTrainingNeed({
    gap: high.gapSummary.skills[0]!,
    capacityStatus: TRAINING_CAPACITY_STATUS.INSUFFICIENT,
  });
  assert.equal(need, TRAINING_NEED_LEVEL.HIGH);
});

test("demand-weighted coverage, alignment, curriculum gaps; training need ≠ curriculum gap", () => {
  const built = buildTrainingEvaluationCase({
    id: "w",
    label: "w",
    expected: {},
    _builder: "weak-align-gaps",
  });
  const summary = summarizeTrainingIntelligence({
    gapSummary: built.gapSummary,
    programs: built.programs,
    trainingCapacityBySkill: built.capacity,
  });

  assert.equal(summary.trainingVersion, TRAINING_METHODOLOGY_VERSION);
  const prog = summary.programs[0];
  assert.ok(prog);
  assert.equal(prog.alignment, PROGRAM_ALIGNMENT.MODERATE);
  // python 100 + sql 90 covered; docker 70 + aws 60 missing → 190/320 ≈ 0.59375
  assert.equal(prog.demandWeightedCoverage, Number((190 / 320).toFixed(6)));
  assert.ok(summary.curriculumGaps.some((g) => g.skillId === "skill-docker"));
  assert.ok(!summary.curriculumGaps.some((g) => g.skillId === "skill-python"));

  const pythonNeed = summary.trainingNeeds.find((n) => n.skillId === "skill-python");
  assert.ok(pythonNeed);
  assert.equal(pythonNeed.trainingNeed, TRAINING_NEED_LEVEL.HIGH);
  assert.equal(pythonNeed.programsCovering, 1);
  assert.ok(
    pythonNeed.notes.some((n) => /not a curriculum gap/i.test(n)),
  );
});

test("duplicate skill mapping prevented; capacity extraction ignores non-capacity types", () => {
  const program = buildProgramView({
    programId: "p1",
    curriculumId: "p1",
    courseId: "c1",
    courseName: "Course",
    curriculumTitle: "C v1",
    curriculumVersion: "1",
    organizationId: "o1",
    organizationName: null,
    occupationId: null,
    sectorId: null,
    status: "ACTIVE",
    isDemo: true,
    skills: [
      {
        skillId: "skill-a",
        canonicalName: "a",
        name: "A",
        coverage: CURRICULUM_COVERAGE_STATUS.FULL,
        importance: null,
      },
      {
        skillId: "skill-a",
        canonicalName: "a",
        name: "A dup",
        coverage: CURRICULUM_COVERAGE_STATUS.FULL,
        importance: null,
      },
    ],
  });
  assert.equal(program.skills.length, 1);
  assert.equal(dedupeProgramSkills(program.skills).length, 1);

  const geo = inferGeographyLevel({
    locationId: null,
    country: "IN",
    state: "EvalState",
    district: null,
    city: null,
  });
  const obs: SupplyObservation[] = [
    {
      observationId: "1",
      sourceId: "s",
      skillId: "skill-a",
      canonicalName: "a",
      resolved: true,
      occupationId: null,
      sectorId: null,
      geography: geo,
      periodFrom: "2026-08-01T00:00:00.000Z",
      periodTo: "2026-09-01T00:00:00.000Z",
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      quantity: 3,
      confidence: null,
      evidenceId: null,
    },
    {
      observationId: "2",
      sourceId: "s",
      skillId: "skill-a",
      canonicalName: "a",
      resolved: true,
      occupationId: null,
      sectorId: null,
      geography: geo,
      periodFrom: "2026-08-01T00:00:00.000Z",
      periodTo: "2026-09-01T00:00:00.000Z",
      supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
      quantity: 99,
      confidence: null,
      evidenceId: null,
    },
  ];
  const capacity = extractTrainingCapacity(obs);
  assert.equal(capacity["skill-a"], 3);
});

test("zero demand → insufficient alignment; strong coverage when all demanded skills covered", () => {
  const emptyMarket = computeDemandWeightedCoverage({
    program: buildProgramView({
      programId: "p",
      curriculumId: "p",
      courseId: "c",
      courseName: "C",
      curriculumTitle: "T",
      curriculumVersion: "1",
      organizationId: "o",
      organizationName: null,
      occupationId: null,
      sectorId: null,
      status: "ACTIVE",
      isDemo: true,
      skills: [],
    }),
    market: [],
  });
  assert.equal(emptyMarket.coverage, null);
  assert.equal(classifyAlignment(null, 0), PROGRAM_ALIGNMENT.INSUFFICIENT_DATA);

  const strong = buildTrainingEvaluationCase({
    id: "s",
    label: "s",
    expected: {},
    _builder: "strong-align",
  });
  const summary = summarizeTrainingIntelligence({
    gapSummary: strong.gapSummary,
    programs: strong.programs,
  });
  assert.equal(summary.programs[0]?.alignment, PROGRAM_ALIGNMENT.STRONG);
  assert.equal(summary.programs[0]?.demandWeightedCoverage, 1);
});
