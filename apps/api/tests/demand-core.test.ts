import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEMAND_MIN_TREND_SAMPLE,
  DEMAND_QUALITY_WEIGHT,
  DEMAND_REQUIREMENT_WEIGHT,
  DEMAND_TREND_DIRECTION,
  classifyTrend,
  compareDemandRows,
  dedupeJobSkills,
  qualityWeight,
  requirementWeight,
  skillContribution,
  summarizeDemandFromObservations,
} from "../src/modules/demand";
import { makeObs } from "../src/modules/demand/evaluate";
import type { JobIntelligenceSkill } from "../src/modules/intelligence/contract";

test("quality and requirement weighting; job-level skill dedupe", () => {
  assert.equal(qualityWeight("INCLUDE"), 1);
  assert.equal(qualityWeight("INCLUDE_WITH_CAUTION"), 0.5);
  assert.equal(qualityWeight("EXCLUDE"), 0);
  assert.equal(requirementWeight("REQUIRED"), 1);
  assert.equal(requirementWeight("PREFERRED"), 0.75);
  assert.equal(requirementWeight("OPTIONAL"), 0.5);
  assert.equal(requirementWeight("MENTIONED"), 0.25);
  assert.equal(skillContribution("INCLUDE", "REQUIRED"), 1);
  assert.equal(skillContribution("INCLUDE_WITH_CAUTION", "REQUIRED"), 0.5);
  assert.equal(skillContribution("INCLUDE", "PREFERRED"), 0.75);
  assert.equal(DEMAND_QUALITY_WEIGHT.EXCLUDE, 0);
  assert.equal(DEMAND_REQUIREMENT_WEIGHT.MENTIONED, 0.25);

  const skills: JobIntelligenceSkill[] = [
    {
      rawTerm: "Python",
      contributingTerms: ["Python"],
      skillId: "skill-python",
      canonicalName: "python",
      status: "RESOLVED",
      extractionMethod: "CANONICAL_NAME_MATCH",
      extractionMethods: ["CANONICAL_NAME_MATCH"],
      confidenceTier: "HIGH",
      requirementLevel: "MENTIONED",
      requirementMethod: "DEFAULT_MENTIONED",
      requirementConfidenceTier: "LOW",
    },
    {
      rawTerm: "Python",
      contributingTerms: ["Python"],
      skillId: "skill-python",
      canonicalName: "python",
      status: "RESOLVED",
      extractionMethod: "TEXT_MATCH",
      extractionMethods: ["TEXT_MATCH"],
      confidenceTier: "MEDIUM",
      requirementLevel: "REQUIRED",
      requirementMethod: "LOCAL_SIGNAL",
      requirementConfidenceTier: "HIGH",
    },
    {
      rawTerm: "Python",
      contributingTerms: ["Python"],
      skillId: "skill-python",
      canonicalName: "python",
      status: "RESOLVED",
      extractionMethod: "ALIAS_MATCH",
      extractionMethods: ["ALIAS_MATCH"],
      confidenceTier: "MEDIUM",
      requirementLevel: "PREFERRED",
      requirementMethod: "LOCAL_SIGNAL",
      requirementConfidenceTier: "MEDIUM",
    },
  ];
  const deduped = dedupeJobSkills(skills, "INCLUDE");
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0]?.requirementLevel, "REQUIRED");
  assert.equal(deduped[0]?.contribution, 1);
});

test("canonical aggregation, Java != JavaScript, caution/exclude weights", () => {
  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-09-01T00:00:00.000Z");
  const current = [
    makeObs({
      jobId: "j1",
      postedAt: "2026-08-10T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [
        { skillId: "skill-python", canonicalName: "python", requirementLevel: "REQUIRED" },
        { skillId: "skill-python", canonicalName: "python", requirementLevel: "MENTIONED" },
        { skillId: "skill-java", canonicalName: "java", requirementLevel: "REQUIRED" },
      ],
    }),
    makeObs({
      jobId: "j2",
      postedAt: "2026-08-12T00:00:00.000Z",
      eligibility: "INCLUDE_WITH_CAUTION",
      skills: [
        { skillId: "skill-python", canonicalName: "python", requirementLevel: "REQUIRED" },
        {
          skillId: "skill-javascript",
          canonicalName: "javascript",
          requirementLevel: "MENTIONED",
        },
      ],
    }),
    makeObs({
      jobId: "j-ex",
      postedAt: "2026-08-15T00:00:00.000Z",
      eligibility: "EXCLUDE",
      skills: [
        { skillId: "skill-python", canonicalName: "python", requirementLevel: "REQUIRED" },
      ],
    }),
  ];
  // Only contributing rows (EXCLUDE filtered like the loader)
  const contributing = current.filter((o) => o.qualityWeight > 0);
  const summary = summarizeDemandFromObservations({
    current: contributing,
    previous: [],
    from,
    to,
    weightedEligibleJobs: contributing.reduce((s, o) => s + o.qualityWeight, 0),
  });

  const python = summary.skills.find((s) => s.skillId === "skill-python");
  const java = summary.skills.find((s) => s.skillId === "skill-java");
  const js = summary.skills.find((s) => s.skillId === "skill-javascript");
  assert.ok(python && java && js);
  assert.notEqual(java.skillId, js.skillId);
  // INCLUDE REQUIRED 1.0 + CAUTION REQUIRED 0.5 = 1.5 (deduped once per job)
  assert.equal(python.weightedDemand, 1.5);
  assert.equal(python.jobCount, 2);
  assert.equal(java.weightedDemand, 1);
  assert.equal(js.weightedDemand, 0.125); // 0.5 * 0.25
  assert.equal(current.find((o) => o.jobId === "j-ex")?.qualityWeight, 0);
});

test("occupation, sector, unknown geography, experience/qualification coverage", () => {
  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-09-01T00:00:00.000Z");
  const current = [
    makeObs({
      jobId: "a",
      postedAt: "2026-08-10T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [{ skillId: "s1", canonicalName: "python", requirementLevel: "REQUIRED" }],
      occupation: {
        status: "CLASSIFIED",
        occupationId: "occ-1",
        code: "2512",
        name: "Software Developers",
      },
      sector: {
        status: "CLASSIFIED",
        sectorId: "sec-1",
        code: "sp.sector.it-ites",
        name: "IT",
      },
      location: {
        locationId: "loc-1",
        country: "IN",
        state: "Maharashtra",
        district: "Mumbai",
        city: "Mumbai",
        known: true,
      },
      experience: {
        status: "PARSED",
        minYears: 2,
        maxYears: 4,
        confidenceTier: "HIGH",
      },
      qualifications: [
        {
          status: "PARSED",
          normalized: "bachelor",
          type: "degree",
          confidenceTier: "MEDIUM",
        },
      ],
    }),
    makeObs({
      jobId: "b",
      postedAt: "2026-08-11T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [{ skillId: "s2", canonicalName: "java", requirementLevel: "PREFERRED" }],
      occupation: {
        status: "UNCLASSIFIED",
        occupationId: null,
        code: null,
        name: null,
      },
      sector: {
        status: "UNCLASSIFIED",
        sectorId: null,
        code: null,
        name: null,
      },
      location: {
        locationId: null,
        country: null,
        state: null,
        district: null,
        city: null,
        known: false,
      },
      experience: { status: "UNKNOWN", confidenceTier: "LOW" },
      qualifications: [{ status: "UNKNOWN", confidenceTier: "LOW" }],
    }),
  ];
  const summary = summarizeDemandFromObservations({
    current,
    previous: [],
    from,
    to,
    weightedEligibleJobs: 2,
  });
  assert.ok(summary.occupations.some((o) => o.name === "Software Developers"));
  assert.ok(summary.occupations.some((o) => o.status === "UNCLASSIFIED"));
  assert.ok(summary.sectors.some((s) => s.name === "IT"));
  assert.ok(summary.geography.some((g) => g.state === "Maharashtra"));
  assert.ok(summary.geography.some((g) => !g.known));
  assert.equal(summary.experience.coverage.known, 1);
  assert.equal(summary.experience.coverage.unknown, 1);
  assert.equal(summary.qualifications.coverage.known, 1);
  assert.match(summary.experience.coverage.note, /Among jobs with identifiable/i);
});

test("trends: rising, stable, declining, insufficient, zero previous", () => {
  assert.equal(
    classifyTrend({
      current: 20,
      previous: 10,
      currentSample: DEMAND_MIN_TREND_SAMPLE,
      previousSample: DEMAND_MIN_TREND_SAMPLE,
    }).direction,
    DEMAND_TREND_DIRECTION.RISING,
  );
  assert.equal(
    classifyTrend({
      current: 10,
      previous: 10,
      currentSample: DEMAND_MIN_TREND_SAMPLE,
      previousSample: DEMAND_MIN_TREND_SAMPLE,
    }).direction,
    DEMAND_TREND_DIRECTION.STABLE,
  );
  assert.equal(
    classifyTrend({
      current: 8,
      previous: 10,
      currentSample: DEMAND_MIN_TREND_SAMPLE,
      previousSample: DEMAND_MIN_TREND_SAMPLE,
    }).direction,
    DEMAND_TREND_DIRECTION.DECLINING,
  );
  assert.equal(
    classifyTrend({
      current: 2,
      previous: 1,
      currentSample: 2,
      previousSample: 1,
    }).direction,
    DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA,
  );
  const zeroPrev = classifyTrend({
    current: 5,
    previous: 0,
    currentSample: DEMAND_MIN_TREND_SAMPLE,
    previousSample: DEMAND_MIN_TREND_SAMPLE,
  });
  assert.equal(zeroPrev.direction, DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA);
  assert.equal(zeroPrev.growthRate, null);

  const from = new Date("2026-08-16T00:00:00.000Z");
  const to = new Date("2026-09-01T00:00:00.000Z");
  const mkMany = (
    skillId: string,
    count: number,
    startDay: number,
    prefix: string,
  ) =>
    Array.from({ length: count }, (_, i) =>
      makeObs({
        jobId: `${prefix}-${i}`,
        postedAt: new Date(Date.UTC(2026, 7, startDay + (i % 10))).toISOString(),
        eligibility: "INCLUDE",
        skills: [
          { skillId, canonicalName: skillId, requirementLevel: "REQUIRED" },
        ],
      }),
    );

  const current = [
    ...mkMany("skill-rise", 12, 20, "cur-rise"),
    ...mkMany("skill-fall", 10, 20, "cur-fall"),
    ...mkMany("skill-flat", 10, 20, "cur-flat"),
    ...mkMany("skill-tiny", 2, 20, "cur-tiny"),
  ];
  const previous = [
    ...mkMany("skill-rise", 10, 5, "prev-rise"),
    ...mkMany("skill-fall", 12, 5, "prev-fall"),
    ...mkMany("skill-flat", 10, 5, "prev-flat"),
    ...mkMany("skill-tiny", 1, 5, "prev-tiny"),
  ];
  // Fix postedAt to fall in correct windows: current [Aug16, Sep1), previous equal duration
  const prevFrom = new Date("2026-07-31T00:00:00.000Z");
  const stampedCurrent = current.map((o, i) => ({
    ...o,
    postedAt: new Date(from.getTime() + i * 3600_000).toISOString(),
  }));
  const stampedPrevious = previous.map((o, i) => ({
    ...o,
    postedAt: new Date(prevFrom.getTime() + i * 3600_000).toISOString(),
  }));

  const summary = summarizeDemandFromObservations({
    current: stampedCurrent,
    previous: stampedPrevious,
    from,
    to,
    weightedEligibleJobs: stampedCurrent.length,
    rankLimit: 50,
  });
  assert.ok(summary.trends.risingSkills.some((s) => s.skillId === "skill-rise"));
  assert.ok(summary.trends.decliningSkills.some((s) => s.skillId === "skill-fall"));
  const flat = summary.skills.find((s) => s.skillId === "skill-flat");
  assert.equal(flat?.trend.direction, DEMAND_TREND_DIRECTION.STABLE);
  const tiny = summary.skills.find((s) => s.skillId === "skill-tiny");
  assert.equal(tiny?.trend.direction, DEMAND_TREND_DIRECTION.INSUFFICIENT_DATA);
});

test("deterministic ranking and output", () => {
  const ranked = [
    { weightedDemand: 1, jobCount: 1, name: "b" },
    { weightedDemand: 2, jobCount: 1, name: "a" },
    { weightedDemand: 1, jobCount: 2, name: "a" },
    { weightedDemand: 1, jobCount: 1, name: "a" },
  ].sort(compareDemandRows);
  assert.deepEqual(
    ranked.map((r) => `${r.weightedDemand}:${r.jobCount}:${r.name}`),
    ["2:1:a", "1:2:a", "1:1:a", "1:1:b"],
  );

  const from = new Date("2026-08-01T00:00:00.000Z");
  const to = new Date("2026-09-01T00:00:00.000Z");
  const obs = [
    makeObs({
      jobId: "z",
      postedAt: "2026-08-10T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [{ skillId: "s-b", canonicalName: "beta", requirementLevel: "REQUIRED" }],
    }),
    makeObs({
      jobId: "a",
      postedAt: "2026-08-10T00:00:00.000Z",
      eligibility: "INCLUDE",
      skills: [{ skillId: "s-a", canonicalName: "alpha", requirementLevel: "REQUIRED" }],
    }),
  ];
  const first = summarizeDemandFromObservations({
    current: obs,
    previous: [],
    from,
    to,
    weightedEligibleJobs: 2,
  });
  const second = summarizeDemandFromObservations({
    current: [...obs].reverse(),
    previous: [],
    from,
    to,
    weightedEligibleJobs: 2,
  });
  assert.deepEqual(
    first.skills.map((s) => s.skillId),
    second.skills.map((s) => s.skillId),
  );
  assert.equal(first.demandVersion, "demand-v1");
  assert.ok(first.qualityCoverage);
});
