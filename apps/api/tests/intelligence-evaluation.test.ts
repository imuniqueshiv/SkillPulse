import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import {
  EVALUATION_DATA_CLASSIFICATION,
  EVALUATION_DATA_NOT_MARKET,
  isEvaluationDataset,
  runEvaluationDataset,
  type EvaluationDataset,
  type EvaluationSummary,
} from "../src/modules/intelligence/evaluate";

after(async () => {
  await disconnectPrisma();
});

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/jobs.json",
);

function loadDataset(): EvaluationDataset {
  return JSON.parse(readFileSync(datasetPath, "utf8")) as EvaluationDataset;
}

function metricSnapshot(summary: EvaluationSummary) {
  return {
    skill: summary.skill,
    unresolved: summary.unresolved,
    occupationAccuracy: summary.occupationAccuracy,
    sectorAccuracy: summary.sectorAccuracy,
    experienceAccuracy: summary.experienceAccuracy,
    qualificationAccuracy: summary.qualificationAccuracy,
    requirementAccuracy: summary.requirementAccuracy,
  };
}

test("evaluation dataset loads as EVALUATION DATA and is not mutated", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const dataset = loadDataset();
  assert.equal(isEvaluationDataset(dataset), true);
  assert.equal(dataset.classification, EVALUATION_DATA_CLASSIFICATION);
  assert.match(dataset.note, new RegExp(EVALUATION_DATA_NOT_MARKET));
  assert.ok(dataset.jobs.length >= 20);
  assert.ok(dataset.jobs.length <= 50);

  const frozenExpected = structuredClone(dataset.jobs.map((job) => job.expected));
  const first = await runEvaluationDataset(dataset);
  const second = await runEvaluationDataset(dataset);

  assert.deepEqual(
    dataset.jobs.map((job) => job.expected),
    frozenExpected,
  );
  assert.deepEqual(metricSnapshot(first), metricSnapshot(second));
  assert.equal(first.jobCount, dataset.jobs.length);
  assert.equal(first.classification, EVALUATION_DATA_CLASSIFICATION);
  assert.match(first.limitation, /small EVALUATION DATA/i);

  assert.ok(first.skill.truePositive + first.skill.falsePositive + first.skill.falseNegative > 0);
  assert.equal(typeof first.occupationAccuracy.accuracy, "number");
  assert.equal(typeof first.requirementAccuracy.accuracy, "number");

  // Metrics must come from comparisons, not a hard-coded pass threshold.
  assert.ok(first.outcomes.every((row) => row.id && row.intelligence.jobId === `eval:${row.id}`));

  const mismatches = first.outcomes
    .filter((row) => {
      const job = dataset.jobs.find((item) => item.id === row.id);
      if (!job) {
        return true;
      }
      const skillMiss =
        Boolean(job.expected.skills) &&
        (row.skill.expected.join("|") !== row.skill.actual.join("|"));
      const unresolvedMiss =
        Boolean(job.expected.unresolved) &&
        (row.unresolved.expected.join("|") !== row.unresolved.actual.join("|"));
      return (
        skillMiss ||
        unresolvedMiss ||
        row.occupation.match === false ||
        row.sector.match === false ||
        row.experience.match === false ||
        row.qualification.match === false ||
        (row.requirement.expected > 0 && row.requirement.correct !== row.requirement.expected)
      );
    })
    .map((row) => row.id);

  console.log(
    "EVALUATION_METRICS",
    JSON.stringify({
      jobCount: first.jobCount,
      skill: first.skill,
      unresolved: first.unresolved,
      occupationAccuracy: first.occupationAccuracy,
      sectorAccuracy: first.sectorAccuracy,
      experienceAccuracy: first.experienceAccuracy,
      qualificationAccuracy: first.qualificationAccuracy,
      requirementAccuracy: first.requirementAccuracy,
      limitation: first.limitation,
      mismatchIds: mismatches,
    }),
  );
});
