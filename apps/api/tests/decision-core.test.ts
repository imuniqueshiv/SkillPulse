import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DECISION_METHODOLOGY_VERSION,
  DECISION_CATEGORY,
  DECISION_ACTION,
  periodsCompatible,
  summarizeGovernmentDecisions,
} from "../src/modules/decision";
import { buildDecisionEvaluationCase } from "../src/modules/decision/evaluate";

const PERIOD = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
  dateField: "postedAt" as const,
};

test("decision-v1 policy and temporal compatibility", () => {
  assert.equal(DECISION_METHODOLOGY_VERSION, "decision-v1");
  assert.ok(DECISION_CATEGORY.SKILL_SHORTAGE);
  assert.ok(DECISION_ACTION.MONITOR);
  assert.equal(
    periodsCompatible(PERIOD, PERIOD),
    true,
  );
  assert.equal(
    periodsCompatible(PERIOD, {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-03-01T00:00:00.000Z",
      dateField: "postedAt",
    }),
    false,
  );
});

test("severe shortage, capacity, curriculum, employment rules", () => {
  const severe = buildDecisionEvaluationCase({
    id: "a",
    label: "a",
    expected: {},
    _builder: "severe-shortage",
  });
  assert.ok(
    severe.summary.signals.some((s) => s.category === "SKILL_SHORTAGE"),
  );
  assert.ok(severe.summary.signals.every((s) => s.evidence.length >= 0));
  assert.ok(severe.summary.signals.every((s) => s.phaseVersions.decision));

  const cap = buildDecisionEvaluationCase({
    id: "b",
    label: "b",
    expected: {},
    _builder: "capacity-constraint",
  });
  assert.ok(cap.summary.signals.some((s) => s.category === "TRAINING_CAPACITY"));

  const cur = buildDecisionEvaluationCase({
    id: "c",
    label: "c",
    expected: {},
    _builder: "weak-curriculum",
  });
  assert.ok(
    cur.summary.signals.some((s) => s.actionType === "REVIEW_CURRICULUM"),
  );

  const emp = buildDecisionEvaluationCase({
    id: "d",
    label: "d",
    expected: {},
    _builder: "strong-align-weak-emp",
  });
  assert.ok(
    emp.summary.signals.some(
      (s) => s.actionType === "INVESTIGATE_EMPLOYMENT_OUTCOME",
    ),
  );
});

test("unknown capacity != insufficient; missing evidence != no problem", () => {
  const unk = buildDecisionEvaluationCase({
    id: "u",
    label: "u",
    expected: {},
    _builder: "unknown-capacity",
  });
  assert.ok(
    !unk.summary.signals.some((s) => s.category === "TRAINING_CAPACITY"),
  );

  const miss = buildDecisionEvaluationCase({
    id: "m",
    label: "m",
    expected: {},
    _builder: "insufficient-evidence",
  });
  assert.ok(
    miss.summary.signals.some(
      (s) =>
        s.priority === "INSUFFICIENT_DATA" ||
        s.confidence === "INSUFFICIENT_DATA",
    ),
  );
  assert.ok(
    !miss.summary.limitations.some((l) => /no shortage/i.test(l)),
  );
});

test("high priority + low confidence; conflicting evidence", () => {
  const hl = buildDecisionEvaluationCase({
    id: "hl",
    label: "hl",
    expected: {},
    _builder: "high-priority-low-confidence",
  });
  assert.ok(
    hl.summary.signals.some(
      (s) => s.priority === "HIGH" && s.confidence === "LOW",
    ),
  );

  const conflict = buildDecisionEvaluationCase({
    id: "cf",
    label: "cf",
    expected: {},
    _builder: "conflicting-evidence",
  });
  const sig = conflict.summary.signals.find(
    (s) => s.category === "SKILL_SHORTAGE",
  );
  assert.ok(sig);
  assert.equal(sig.confidence, "LOW");
  assert.ok(sig.limitations.some((l) => /conflict/i.test(l)));
});

test("healthy case does not invent intervention; Java != JavaScript", () => {
  const healthy = buildDecisionEvaluationCase({
    id: "h",
    label: "h",
    expected: {},
    _builder: "healthy-no-false-alarm",
  });
  assert.ok(
    !healthy.summary.signals.some(
      (s) =>
        s.category === "SKILL_SHORTAGE" ||
        s.category === "TRAINING_CAPACITY" ||
        s.category === "EMPLOYMENT_OUTCOME",
    ),
  );

  const jj = buildDecisionEvaluationCase({
    id: "j",
    label: "j",
    expected: {},
    _builder: "java-vs-js",
  });
  assert.ok(
    jj.summary.signals.some((s) => s.target.skillId === "skill-java"),
  );
  assert.ok(
    !jj.summary.signals.some(
      (s) =>
        s.target.skillId === "skill-javascript" &&
        s.category === "SKILL_SHORTAGE",
    ),
  );
});

test("deterministic repeated execution; no forbidden actions", () => {
  const a = buildDecisionEvaluationCase({
    id: "1",
    label: "1",
    expected: {},
    _builder: "severe-shortage",
  });
  const b = buildDecisionEvaluationCase({
    id: "2",
    label: "2",
    expected: {},
    _builder: "severe-shortage",
  });
  assert.equal(
    JSON.stringify(a.summary.signals.map((s) => s.signalId)),
    JSON.stringify(b.summary.signals.map((s) => s.signalId)),
  );
  assert.equal(a.summary.policyVersion, DECISION_METHODOLOGY_VERSION);
  const forbidden = [
    "CLOSE_PROGRAM",
    "ALLOCATE_BUDGET",
    "CLOSE_INSTITUTE",
  ];
  for (const s of a.summary.signals) {
    assert.ok(!forbidden.includes(s.actionType));
  }
});

test("summarizeGovernmentDecisions requires period", () => {
  assert.throws(() =>
    summarizeGovernmentDecisions({
      // @ts-expect-error intentional
      period: {},
    }),
  );
});
