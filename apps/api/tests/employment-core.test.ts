import assert from "node:assert/strict";
import { test } from "node:test";
import {
  EMPLOYMENT_METHODOLOGY_VERSION,
  OUTCOME_TYPE,
  OUTCOME_STATUS,
  SKILL_UTILIZATION_LEVEL,
  computeRate,
  computeSkillUtilization,
  computeTimeToEmployment,
  resolveOutcomeGroups,
  classifyOutcomeConfidence,
  summarizeEmploymentIntelligence,
  classifyEmploymentTrend,
  EMPLOYMENT_TREND_DIRECTION,
} from "../src/modules/employment";
import {
  buildEmploymentEvaluationCase,
  makeObservation,
} from "../src/modules/employment/evaluate";
import { EMPLOYMENT_EVIDENCE_TYPE } from "../src/modules/employment/policy";

const PERIOD = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
  dateField: "postedAt" as const,
};

test("employment-v1: trained/certified/placed != employed; rates null-safe", () => {
  assert.equal(EMPLOYMENT_METHODOLOGY_VERSION, "employment-v1");
  assert.notEqual(OUTCOME_TYPE.TRAINED, OUTCOME_TYPE.EMPLOYED);
  assert.notEqual(OUTCOME_TYPE.CERTIFIED, OUTCOME_TYPE.EMPLOYED);
  assert.notEqual(OUTCOME_TYPE.PLACED, OUTCOME_TYPE.EMPLOYED);
  assert.notEqual(OUTCOME_STATUS.REPORTED, OUTCOME_STATUS.CONFIRMED);

  assert.equal(computeRate(5, 0).value, null);
  assert.equal(computeRate(5, null).value, null);
  assert.ok(!Number.isNaN(computeRate(1, 2).value!));
  assert.ok(Number.isFinite(computeRate(1, 2).value!));
});

test("skill utilization: FULL/PARTIAL/NONE/UNKNOWN; Java != JavaScript", () => {
  assert.equal(
    computeSkillUtilization({
      trainedSkillIds: ["a", "b", "c", "d"],
      employmentSkillIds: ["a", "b", "c"],
    }).level,
    SKILL_UTILIZATION_LEVEL.FULL,
  );
  assert.equal(
    computeSkillUtilization({
      trainedSkillIds: ["a", "b", "c", "d"],
      employmentSkillIds: ["a", "b"],
    }).level,
    SKILL_UTILIZATION_LEVEL.PARTIAL,
  );
  assert.equal(
    computeSkillUtilization({
      trainedSkillIds: ["skill-java"],
      employmentSkillIds: ["skill-javascript"],
    }).level,
    SKILL_UTILIZATION_LEVEL.NONE,
  );
  assert.equal(
    computeSkillUtilization({
      trainedSkillIds: ["skill-java"],
      employmentSkillIds: [],
    }).level,
    SKILL_UTILIZATION_LEVEL.UNKNOWN,
  );
});

test("time-to-employment median; negative duration rejected", () => {
  const ok = resolveOutcomeGroups([
    makeObservation({
      observationId: "t1",
      learnerId: "A",
      outcomeType: OUTCOME_TYPE.EMPLOYED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      trainingCompletionDate: "2026-06-01T00:00:00.000Z",
      employmentStartDate: "2026-07-01T00:00:00.000Z",
    }),
    makeObservation({
      observationId: "t2",
      learnerId: "B",
      outcomeType: OUTCOME_TYPE.EMPLOYED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      trainingCompletionDate: "2026-06-01T00:00:00.000Z",
      employmentStartDate: "2026-06-16T00:00:00.000Z",
    }),
  ]);
  const stats = computeTimeToEmployment(ok);
  assert.equal(stats.knownCount, 2);
  assert.equal(stats.medianDays, 22.5);

  const bad = resolveOutcomeGroups([
    makeObservation({
      observationId: "bad",
      learnerId: "C",
      outcomeType: OUTCOME_TYPE.EMPLOYED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      trainingCompletionDate: "2026-08-01T00:00:00.000Z",
      employmentStartDate: "2026-07-01T00:00:00.000Z",
    }),
  ]);
  assert.equal(computeTimeToEmployment(bad).rejectedInvalid, 1);
  assert.equal(computeTimeToEmployment(bad).knownCount, 0);
});

test("duplicate and conflicting observations", () => {
  const dup = buildEmploymentEvaluationCase({
    id: "d",
    label: "d",
    expected: {},
    _builder: "duplicate-obs",
  });
  assert.equal(dup.summary.totals.uniqueLearners, 1);

  const conflict = buildEmploymentEvaluationCase({
    id: "c",
    label: "c",
    expected: {},
    _builder: "conflict-obs",
  });
  assert.equal(conflict.summary.totals.employed, 1);
  assert.equal(conflict.summary.totals.placed, 0);
  assert.equal(conflict.summary.evidenceCoverage.conflictGroups, 1);
});

test("confidence prefers evidence quality over count; reported != confirmed", () => {
  const confirmed = classifyOutcomeConfidence(
    makeObservation({
      observationId: "h",
      outcomeType: OUTCOME_TYPE.EMPLOYED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      evidenceType: EMPLOYMENT_EVIDENCE_TYPE.OFFICIAL_RECORD,
      evidenceId: "e",
      employmentStartDate: "2026-07-01T00:00:00.000Z",
      employmentSkillIds: ["skill-react"],
    }),
  );
  assert.equal(confirmed, "HIGH");

  const reported = classifyOutcomeConfidence(
    makeObservation({
      observationId: "r",
      outcomeType: OUTCOME_TYPE.PLACED,
      outcomeStatus: OUTCOME_STATUS.REPORTED,
      evidenceType: EMPLOYMENT_EVIDENCE_TYPE.LEARNER_REPORT,
    }),
  );
  assert.notEqual(reported, "HIGH");
});

test("trends: rising / insufficient sample; not a forecast", () => {
  const rising = classifyEmploymentTrend({
    metric: "employed",
    current: 20,
    previous: 10,
    currentSample: 5,
    previousSample: 5,
  });
  assert.equal(rising.direction, EMPLOYMENT_TREND_DIRECTION.RISING);
  assert.match(rising.note, /not a prediction/i);

  const insuff = classifyEmploymentTrend({
    metric: "employed",
    current: 1,
    previous: 0,
    currentSample: 1,
    previousSample: 1,
  });
  assert.equal(insuff.direction, EMPLOYMENT_TREND_DIRECTION.INSUFFICIENT_DATA);
});

test("deterministic repeated execution; policyVersion present", () => {
  const a = buildEmploymentEvaluationCase({
    id: "a",
    label: "a",
    expected: {},
    _builder: "confirmed-employment",
  });
  const b = buildEmploymentEvaluationCase({
    id: "b",
    label: "b",
    expected: {},
    _builder: "confirmed-employment",
  });
  assert.equal(a.summary.employmentVersion, EMPLOYMENT_METHODOLOGY_VERSION);
  assert.equal(
    JSON.stringify(a.summary.totals),
    JSON.stringify(b.summary.totals),
  );
  assert.ok(a.summary.limitations.some((l) => /no durable learner/i.test(l)));
});

test("empty observations and missing linkage", () => {
  const empty = summarizeEmploymentIntelligence({
    observations: [],
    period: PERIOD,
  });
  assert.equal(empty.totals.uniqueLearners, 0);
  assert.equal(empty.rates.trainingToEmployment.value, null);

  const unlink = buildEmploymentEvaluationCase({
    id: "u",
    label: "u",
    expected: {},
    _builder: "missing-linkage",
  });
  assert.equal(unlink.summary.rates.trainingToEmployment.value, null);
});

test("employer and program aggregation without ranking language", () => {
  const multi = buildEmploymentEvaluationCase({
    id: "m",
    label: "m",
    expected: {},
    _builder: "multi-employer",
  });
  assert.equal(multi.summary.employers.length, 2);
  assert.ok(
    multi.summary.employers.every((e) => /not a best\/top/i.test(e.notes.join(" "))),
  );

  const programs = buildEmploymentEvaluationCase({
    id: "p",
    label: "p",
    expected: {},
    _builder: "multi-program",
  });
  assert.ok(programs.summary.programs.length >= 2);
  assert.ok(
    programs.summary.limitations.some((l) => /not placement prediction/i.test(l)),
  );
});
