/**
 * Maharashtra synthetic fixture → Phase 8–13 → Phase 14 adapter (state-agnostic).
 * Does not hard-code Maharashtra production logic.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { after, test } from "node:test";
import { disconnectPrisma, getPrisma } from "../src/config/database";
import { env } from "../src/config/env";
import { mahaswayamRojgarAdapter } from "../src/modules/ingestion/sources/mahaswayam-rojgar";
import { processJobIntelligence } from "../src/modules/intelligence/pipeline";
import { assessJobQuality } from "../src/modules/quality/pipeline";
import { makeSupplyObs } from "../src/modules/gaps/evaluate";
import { SUPPLY_TYPE } from "../src/modules/gaps/policy";
import { makeObservation } from "../src/modules/employment/evaluate";
import {
  EMPLOYMENT_EVIDENCE_TYPE,
  OUTCOME_STATUS,
  OUTCOME_TYPE,
} from "../src/modules/employment";
import {
  getOverviewIntelligence,
  listDecisionSignals,
  loadUpstreamIntelligence,
} from "../src/modules/intelligence-api/service";
import { DEMAND_METHODOLOGY_VERSION } from "../src/modules/demand/policy";
import { GAP_METHODOLOGY_VERSION } from "../src/modules/gaps/policy";
import { TRAINING_METHODOLOGY_VERSION } from "../src/modules/training/policy";
import { INSTITUTE_METHODOLOGY_VERSION } from "../src/modules/institute/policy";
import { EMPLOYMENT_METHODOLOGY_VERSION } from "../src/modules/employment/policy";
import { DECISION_METHODOLOGY_VERSION } from "../src/modules/decision/policy";

const OBSERVED_AT = "2026-08-20T10:00:00.000Z";
const INGESTED_AT = "2026-08-20T10:05:00.000Z";
const REFERENCE = new Date("2026-09-01T00:00:00.000Z");
const stamp = Date.now();
const createdJobIds: string[] = [];
const createdSourceIds: string[] = [];
const createdLocationIds: string[] = [];

const samplePath = resolve(
  __dirname,
  "../../../data/sample/ingestion/mahaswayam-rojgar.sample.json",
);

after(async () => {
  if (env.DATABASE_URL) {
    const prisma = getPrisma();
    if (createdJobIds.length > 0) {
      await prisma.jobQualityAssessment.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.jobIntelligence.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    }
    if (createdLocationIds.length > 0) {
      await prisma.location.deleteMany({
        where: { id: { in: createdLocationIds } },
      });
    }
    if (createdSourceIds.length > 0) {
      await prisma.dataSource.deleteMany({
        where: { id: { in: createdSourceIds } },
      });
    }
  }
  await disconnectPrisma();
});

test("Maharashtra synthetic Demand→…→Decision→Phase 14 API preserves versions and evidence", async (t) => {
  if (!env.DATABASE_URL) {
    t.skip("DATABASE_URL is not configured");
    return;
  }

  const sample = JSON.parse(readFileSync(samplePath, "utf8")) as {
    acquisition?: string;
    note?: string;
    records: Record<string, unknown>[];
  };
  assert.equal(sample.acquisition, "synthetic-fixture");
  assert.match(sample.note ?? "", /SYNTHETIC/i);

  const developer = sample.records.find((row) => row.vacancy_id === "MH-ROJ-1003");
  assert.ok(developer);

  const mapped = mahaswayamRojgarAdapter.parse({
    ...developer,
    observedAt: OBSERVED_AT,
    ingestedAt: INGESTED_AT,
  });

  const prisma = getPrisma();
  const source = await prisma.dataSource.create({
    data: {
      code: `sp.source.test-mh-p14-${stamp}`,
      name: `[TEST] MH product ${stamp}`,
      type: "OTHER",
      accessMethod: "MANUAL_IMPORT",
      domain: "JOBS",
      geographicScope: "STATE",
      isDemo: true,
    },
  });
  createdSourceIds.push(source.id);

  const location = await prisma.location.create({
    data: {
      country: "IN",
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    },
  });
  createdLocationIds.push(location.id);

  const react = await prisma.skill.findUniqueOrThrow({
    where: { code: "sp.skill.react" },
    select: { id: true, canonicalName: true },
  });

  const job = await prisma.job.create({
    data: {
      title: mapped.payload.title,
      description: mapped.payload.description ?? null,
      companyName: mapped.payload.employerName ?? null,
      sourceId: source.id,
      externalId: `mh-p14-${stamp}`,
      postedAt: mapped.payload.postedAt
        ? new Date(mapped.payload.postedAt)
        : new Date(OBSERVED_AT),
      locationId: location.id,
      isDemo: true,
      skills: { create: [{ skillId: react.id }] },
    },
  });
  createdJobIds.push(job.id);

  await processJobIntelligence({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      skills: [{ skillId: react.id, name: "React" }],
    },
    explicitSkills: ["React.js"],
    persist: true,
  });
  await assessJobQuality({
    jobId: job.id,
    referenceTime: REFERENCE,
    persist: true,
    provenanceOverride: {
      observedAt: new Date(OBSERVED_AT),
      ingestedAt: new Date(INGESTED_AT),
      validationStatus: "VALID",
      dedupStatus: "UNIQUE",
    },
  });

  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-09-15T00:00:00.000Z");

  const supply = [
    makeSupplyObs({
      observationId: `p14_sup_${stamp}`,
      skillId: react.id,
      canonicalName: react.canonicalName,
      quantity: 2,
      supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
      state: "Maharashtra",
      district: "Pune",
      city: "Pune",
    }),
  ];

  const employmentObs = [
    makeObservation({
      observationId: `p14_emp_t_${stamp}`,
      learnerId: `learner_p14_${stamp}`,
      outcomeType: OUTCOME_TYPE.TRAINED,
      outcomeStatus: OUTCOME_STATUS.CONFIRMED,
      trainedSkillIds: [react.id],
      employmentSkillIds: [],
      evidenceType: EMPLOYMENT_EVIDENCE_TYPE.INSTITUTE_REPORT,
      evidenceId: `ev_t_${stamp}`,
      observedAt: OBSERVED_AT,
      trainingCompletionDate: "2026-08-10",
      geography: {
        locationId: location.id,
        country: "IN",
        state: "Maharashtra",
        district: "Pune",
        city: "Pune",
        known: true,
        level: "DISTRICT",
      },
    }),
  ];

  const bundle = await loadUpstreamIntelligence({
    from,
    to,
    rankLimit: 15,
    geography: { state: "Maharashtra" },
    supplyObservations: supply,
    employmentObservations: employmentObs,
  });

  assert.equal(bundle.demand.demandVersion, DEMAND_METHODOLOGY_VERSION);
  assert.equal(bundle.gaps.gapVersion, GAP_METHODOLOGY_VERSION);
  assert.equal(bundle.training.trainingVersion, TRAINING_METHODOLOGY_VERSION);
  assert.equal(bundle.institute.instituteVersion, INSTITUTE_METHODOLOGY_VERSION);
  assert.equal(bundle.employment.employmentVersion, EMPLOYMENT_METHODOLOGY_VERSION);
  assert.equal(bundle.decisions.policyVersion, DECISION_METHODOLOGY_VERSION);

  const overview = await getOverviewIntelligence({
    from,
    to,
    rankLimit: 15,
    geography: { state: "Maharashtra" },
    supplyObservations: supply,
    employmentObservations: employmentObs,
  });
  assert.equal(overview.meta.period.from, bundle.demand.period.from);
  assert.equal(overview.meta.period.to, bundle.demand.period.to);
  assert.ok(overview.meta.generatedAt);
  assert.equal(overview.meta.phaseVersions.demand, DEMAND_METHODOLOGY_VERSION);
  assert.equal(overview.meta.phaseVersions.decision, DECISION_METHODOLOGY_VERSION);
  assert.equal(overview.data.employment.status, "AVAILABLE");
  assert.ok(
    !JSON.stringify(overview).includes("78.4"),
    "must not embed SAMPLE outcomes placeholders",
  );

  const decisions = await listDecisionSignals({
    from,
    to,
    rankLimit: 15,
    offset: 0,
    geography: { state: "Maharashtra" },
    supplyObservations: supply,
    employmentObservations: employmentObs,
  });
  for (const s of decisions.data.signals) {
    assert.ok(typeof s.signalId === "string");
  }

  assert.match(
    bundle.institute.limitations.join(" "),
    /Course has no Location|geographic/i,
  );
});
