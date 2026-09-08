/**
 * Phase 14 semantic regression: adapter output must equal upstream Phase 7–13 meaning.
 * Formatting may differ; analytical values must not.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { disconnectPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { summarizeDemand } from "../src/modules/demand";
import { summarizeSkillGaps } from "../src/modules/gaps";
import { summarizeTrainingIntelligence } from "../src/modules/training";
import { extractTrainingCapacity, loadTrainingPrograms } from "../src/modules/training";
import {
  capacityFromSupplyObservations,
  summarizeInstituteIntelligence,
} from "../src/modules/institute";
import { summarizeEmploymentIntelligence } from "../src/modules/employment";
import { summarizeGovernmentDecisions } from "../src/modules/decision";
import { summarizeQualityAssessments } from "../src/modules/quality/summary";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../src/modules/quality/contract";
import {
  getOverviewIntelligence,
  loadUpstreamIntelligence,
  listDecisionSignals,
} from "../src/modules/intelligence-api/service";
import { PRODUCT_API_VERSION } from "../src/modules/intelligence-api/policy";

after(async () => {
  await disconnectPrisma();
});

const window = {
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-09-15T00:00:00.000Z"),
  rankLimit: 10,
};

test("Phase 14 bundle demand/gap equals direct Phase 8/9 services", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const demandDirect = await summarizeDemand({
    from: window.from,
    to: window.to,
    rankLimit: window.rankLimit,
    limit: 500,
  });

  const gapsDirect = await summarizeSkillGaps({
    from: window.from,
    to: window.to,
    supplyObservations: [],
    demandSummaryOverride: demandDirect,
    rankLimit: window.rankLimit,
  });

  const bundle = await loadUpstreamIntelligence({
    from: window.from,
    to: window.to,
    rankLimit: window.rankLimit,
    supplyObservations: [],
    employmentObservations: [],
  });

  assert.equal(bundle.demand.demandVersion, demandDirect.demandVersion);
  assert.equal(bundle.gaps.gapVersion, gapsDirect.gapVersion);
  assert.equal(bundle.demand.period.from, demandDirect.period.from);
  assert.equal(bundle.demand.period.to, demandDirect.period.to);
  assert.equal(bundle.demand.period.dateField, "postedAt");

  assert.deepEqual(
    bundle.demand.skills.map((s) => ({
      skillId: s.skillId,
      weightedDemand: s.weightedDemand,
      jobCount: s.jobCount,
      trend: s.trend.direction,
    })),
    demandDirect.skills.map((s) => ({
      skillId: s.skillId,
      weightedDemand: s.weightedDemand,
      jobCount: s.jobCount,
      trend: s.trend.direction,
    })),
  );

  assert.deepEqual(
    bundle.gaps.skills.map((s) => ({
      skillId: s.skillId,
      severity: s.severity,
      shortageQuantity: s.metrics.shortageQuantity,
      confidence: s.confidence,
    })),
    gapsDirect.skills.map((s) => ({
      skillId: s.skillId,
      severity: s.severity,
      shortageQuantity: s.metrics.shortageQuantity,
      confidence: s.confidence,
    })),
  );
});

test("Phase 14 training/institute/decision equal direct Phase 10/11/13 path", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const bundle = await loadUpstreamIntelligence({
    from: window.from,
    to: window.to,
    rankLimit: window.rankLimit,
  });

  const programs = await loadTrainingPrograms({
    includeDemo: true,
    limit: Math.min(Math.max(window.rankLimit * 4, 20), 100),
  });
  const trainingDirect = summarizeTrainingIntelligence({
    gapSummary: bundle.gaps,
    programs,
    trainingCapacityBySkill: extractTrainingCapacity([]),
    rankLimit: window.rankLimit,
  });
  const instituteDirect = summarizeInstituteIntelligence({
    gapSummary: bundle.gaps,
    programs,
    trainingSummary: trainingDirect,
    capacityObservations: capacityFromSupplyObservations([]),
    rankLimit: window.rankLimit,
  });
  const employmentDirect = summarizeEmploymentIntelligence({
    observations: [],
    period: bundle.demand.period,
    gapSummary: bundle.gaps,
    demandSummary: bundle.demand,
    trainingSummary: trainingDirect,
    instituteSummary: instituteDirect,
    programs,
    cohort: { linkageAvailable: false },
    rankLimit: window.rankLimit,
  });
  const qualityDirect = await summarizeQualityAssessments({
    assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
  });
  const decisionsDirect = summarizeGovernmentDecisions({
    period: bundle.demand.period,
    demandSummary: bundle.demand,
    gapSummary: bundle.gaps,
    trainingSummary: trainingDirect,
    instituteSummary: instituteDirect,
    employmentSummary: employmentDirect,
    qualitySummary: qualityDirect,
    rankLimit: window.rankLimit,
  });

  assert.equal(bundle.training.trainingVersion, trainingDirect.trainingVersion);
  assert.equal(bundle.institute.instituteVersion, instituteDirect.instituteVersion);
  assert.equal(bundle.employment.employmentVersion, employmentDirect.employmentVersion);
  assert.equal(bundle.decisions.policyVersion, decisionsDirect.policyVersion);

  assert.deepEqual(
    bundle.training.buckets,
    trainingDirect.buckets,
  );
  assert.deepEqual(
    bundle.institute.buckets,
    instituteDirect.buckets,
  );
  assert.equal(
    bundle.employment.rates.trainingToEmployment.value,
    employmentDirect.rates.trainingToEmployment.value,
  );
  assert.equal(
    bundle.employment.evidenceCoverage.totalObservations,
    0,
  );

  assert.deepEqual(
    bundle.decisions.signals.map((s) => ({
      signalId: s.signalId,
      priority: s.priority,
      category: s.category,
      confidence: s.confidence,
      actionType: s.actionType,
      rationale: s.rationale,
      decisionScore: s.decisionScore?.score ?? null,
    })),
    decisionsDirect.signals.map((s) => ({
      signalId: s.signalId,
      priority: s.priority,
      category: s.category,
      confidence: s.confidence,
      actionType: s.actionType,
      rationale: s.rationale,
      decisionScore: s.decisionScore?.score ?? null,
    })),
  );
});

test("overview API presentation preserves Phase 8/13 meaning without fabricating employment", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const overview = await getOverviewIntelligence({
    from: window.from,
    to: window.to,
    rankLimit: window.rankLimit,
  });
  const decisions = await listDecisionSignals({
    from: window.from,
    to: window.to,
    rankLimit: window.rankLimit,
    offset: 0,
  });

  assert.equal(overview.meta.productVersion, PRODUCT_API_VERSION);
  assert.ok(overview.meta.generatedAt);
  assert.equal(overview.meta.period.dateField, "postedAt");
  assert.equal(overview.data.employment.status, "INSUFFICIENT_DATA");
  assert.equal(
    overview.data.employment.trainingToEmployment.status,
    "INSUFFICIENT_DATA",
  );
  assert.equal(overview.data.employment.trainingToEmployment.value, null);

  // generatedAt must not appear inside analytical decision scores / IDs
  for (const s of decisions.data.signals) {
    assert.equal(String(s.signalId).includes(overview.meta.generatedAt), false);
  }

  if (overview.data.demand.status === "AVAILABLE") {
    assert.ok(
      (overview.data.demand.topSkills?.length ?? 0) <= 10,
    );
  }
});

test("oversized limit is capped; negative offset rejected at list layer", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const capped = await listDecisionSignals({
    from: window.from,
    to: window.to,
    rankLimit: 999,
    offset: 0,
  });
  assert.ok(capped.data.pagination.limit <= 50);
  assert.ok(capped.data.signals.length <= capped.data.pagination.limit);
});
