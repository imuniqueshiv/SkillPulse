import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  GAP_EVALUATION_DATA_CLASSIFICATION,
  GAP_EVALUATION_DATA_NOT_MARKET,
  buildGapEvaluationCase,
  evaluateGapCase,
  isGapEvaluationDataset,
  type GapEvaluationCase,
} from "../src/modules/gaps/evaluate";
import { summarizeSkillGapsFromParts } from "../src/modules/gaps/summary";

const datasetPath = resolve(
  __dirname,
  "../../../data/sample/evaluation/skill-gaps.json",
);

test("skill-gap evaluation dataset is synthetic and cases pass", () => {
  const raw = JSON.parse(readFileSync(datasetPath, "utf8")) as unknown;
  assert.ok(isGapEvaluationDataset(raw));
  assert.equal(raw.classification, GAP_EVALUATION_DATA_CLASSIFICATION);
  assert.match(raw.note, new RegExp(GAP_EVALUATION_DATA_NOT_MARKET, "i"));

  const outcomes = raw.cases.map((meta) => {
    const built = buildGapEvaluationCase(meta as GapEvaluationCase);
    const summary = summarizeSkillGapsFromParts({
      from: built.from,
      to: built.to,
      demandCurrent: built.demandCurrent,
      demandPrevious: built.demandPrevious,
      weightedEligibleJobs: built.demandCurrent.reduce(
        (s, o) => s + o.qualityWeight,
        0,
      ),
      supplyObservations: built.supply,
      previousSupplyObservations: built.previousSupply,
      geography: { country: "IN", state: "EvalState" },
      rankLimit: 50,
    });
    return evaluateGapCase({
      id: built.id,
      summary,
      expected: built.expected,
    });
  });

  console.log(
    "GAP_EVALUATION_METRICS",
    JSON.stringify({
      caseCount: outcomes.length,
      passed: outcomes.filter((o) => o.pass).length,
      failed: outcomes.filter((o) => !o.pass).length,
      failures: outcomes.filter((o) => !o.pass),
    }),
  );

  assert.equal(outcomes.every((o) => o.pass), true);
});
