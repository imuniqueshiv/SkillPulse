import {
  JOB_INTELLIGENCE_PROCESSOR_VERSION,
} from "../intelligence/contract";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../quality/contract";
import type { DemandFilters, DemandSummary } from "./contract";
import { DEMAND_METHODOLOGY_VERSION } from "./contract";
import {
  aggregateExperienceDemand,
  aggregateQualificationDemand,
} from "./experience";
import { aggregateGeographyDemand } from "./geography";
import { loadDemandObservations } from "./observations";
import { aggregateOccupationDemand } from "./occupations";
import {
  previousPeriodOfEqualDuration,
  resolveFilters,
  toDemandPeriod,
} from "./period";
import {
  DEMAND_MIN_TREND_SAMPLE,
  DEMAND_QUALITY_WEIGHT,
  DEMAND_REQUIREMENT_WEIGHT,
  DEMAND_TREND_THRESHOLD,
} from "./policy";
import { demandScoreExplanation, selectTrendSkills } from "./scoring";
import { aggregateSectorDemand } from "./sectors";
import { aggregateSkillDemand } from "./skills";

/**
 * Unified Phase 8 demand summary (demand-v1).
 * Dynamic aggregation — does not persist snapshots; does not mutate Job/Intelligence/Quality.
 */
export async function summarizeDemand(
  input: DemandFilters,
): Promise<DemandSummary> {
  const filters = resolveFilters(input);
  const previous = previousPeriodOfEqualDuration(filters.from, filters.to);

  const [currentLoad, previousLoad] = await Promise.all([
    loadDemandObservations(filters),
    loadDemandObservations({
      ...filters,
      from: previous.from,
      to: previous.to,
    }),
  ]);

  const weightedEligibleJobs = currentLoad.qualityCoverage.weightedEligibleJobs;

  const skills = aggregateSkillDemand({
    current: currentLoad.observations,
    previous: previousLoad.observations,
    weightedEligibleJobs,
    recentFrom: filters.from,
    recentTo: filters.to,
    previousFrom: previous.from,
    previousTo: previous.to,
    rankLimit: filters.rankLimit,
  });

  const occupations = aggregateOccupationDemand({
    current: currentLoad.observations,
    previous: previousLoad.observations,
    weightedEligibleJobs,
    rankLimit: filters.rankLimit,
  });

  const sectors = aggregateSectorDemand({
    current: currentLoad.observations,
    previous: previousLoad.observations,
    weightedEligibleJobs,
    rankLimit: filters.rankLimit,
  });

  const geography = aggregateGeographyDemand({
    current: currentLoad.observations,
    previous: previousLoad.observations,
    weightedEligibleJobs,
    rankLimit: filters.rankLimit,
  });

  const experience = aggregateExperienceDemand(currentLoad.observations);
  const qualifications = aggregateQualificationDemand(currentLoad.observations);
  const trends = selectTrendSkills(skills, filters.rankLimit);
  const score = demandScoreExplanation();

  return {
    demandVersion: DEMAND_METHODOLOGY_VERSION,
    qualityAssessmentVersion:
      currentLoad.assessmentVersion || JOB_QUALITY_ASSESSMENT_VERSION,
    intelligenceProcessorVersion:
      currentLoad.intelligenceProcessorVersion ||
      JOB_INTELLIGENCE_PROCESSOR_VERSION,
    period: toDemandPeriod(filters.from, filters.to),
    previousPeriod: toDemandPeriod(previous.from, previous.to),
    filters: {
      sourceId: filters.sourceId ?? null,
      skillId: filters.skillId ?? null,
      occupationId: filters.occupationId ?? null,
      sectorId: filters.sectorId ?? null,
      geography: filters.geography ?? null,
    },
    policy: {
      qualityWeights: { ...DEMAND_QUALITY_WEIGHT },
      requirementWeights: { ...DEMAND_REQUIREMENT_WEIGHT },
      trendThresholds: {
        rising: DEMAND_TREND_THRESHOLD.RISING,
        declining: DEMAND_TREND_THRESHOLD.DECLINING,
      },
      minTrendSample: DEMAND_MIN_TREND_SAMPLE,
    },
    qualityCoverage: currentLoad.qualityCoverage,
    skills,
    occupations,
    sectors,
    geography,
    experience,
    qualifications,
    trends,
    notes: [
      "Demand metrics represent available analytically eligible job observations.",
      "They are NOT official government labour-market statistics.",
      "Phase 8 does NOT calculate labour supply, skill gaps, recommendations, curriculum, or forecasting.",
      "Event time uses postedAt (Phase 5 freshness semantics), never createdAt/updatedAt.",
      "EXCLUDE contributes zero; INCLUDE_WITH_CAUTION uses reduced quality weight.",
      score.formula,
      score.tieBreaking,
      ...score.notes,
    ],
  };
}

/** Pure aggregation from in-memory observations (tests / evaluation). */
export function summarizeDemandFromObservations(input: {
  current: Parameters<typeof aggregateSkillDemand>[0]["current"];
  previous: Parameters<typeof aggregateSkillDemand>[0]["previous"];
  from: Date;
  to: Date;
  weightedEligibleJobs: number;
  rankLimit?: number;
  qualityCoverage?: DemandSummary["qualityCoverage"];
}): DemandSummary {
  const filters = resolveFilters({
    from: input.from,
    to: input.to,
    rankLimit: input.rankLimit,
  });
  const previous = previousPeriodOfEqualDuration(filters.from, filters.to);
  const weightedEligibleJobs = input.weightedEligibleJobs;

  const skills = aggregateSkillDemand({
    current: input.current,
    previous: input.previous,
    weightedEligibleJobs,
    recentFrom: filters.from,
    recentTo: filters.to,
    previousFrom: previous.from,
    previousTo: previous.to,
    rankLimit: filters.rankLimit,
  });

  return {
    demandVersion: DEMAND_METHODOLOGY_VERSION,
    qualityAssessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
    intelligenceProcessorVersion: JOB_INTELLIGENCE_PROCESSOR_VERSION,
    period: toDemandPeriod(filters.from, filters.to),
    previousPeriod: toDemandPeriod(previous.from, previous.to),
    filters: {
      sourceId: null,
      skillId: null,
      occupationId: null,
      sectorId: null,
      geography: null,
    },
    policy: {
      qualityWeights: { ...DEMAND_QUALITY_WEIGHT },
      requirementWeights: { ...DEMAND_REQUIREMENT_WEIGHT },
      trendThresholds: {
        rising: DEMAND_TREND_THRESHOLD.RISING,
        declining: DEMAND_TREND_THRESHOLD.DECLINING,
      },
      minTrendSample: DEMAND_MIN_TREND_SAMPLE,
    },
    qualityCoverage: input.qualityCoverage ?? {
      totalObservations: input.current.length,
      included: input.current.filter((o) => o.eligibility === "INCLUDE").length,
      caution: input.current.filter((o) => o.eligibility === "INCLUDE_WITH_CAUTION")
        .length,
      excluded: 0,
      analyzed: input.current.length,
      missingQuality: 0,
      missingIntelligence: 0,
      weightedEligibleJobs,
    },
    skills,
    occupations: aggregateOccupationDemand({
      current: input.current,
      previous: input.previous,
      weightedEligibleJobs,
      rankLimit: filters.rankLimit,
    }),
    sectors: aggregateSectorDemand({
      current: input.current,
      previous: input.previous,
      weightedEligibleJobs,
      rankLimit: filters.rankLimit,
    }),
    geography: aggregateGeographyDemand({
      current: input.current,
      previous: input.previous,
      weightedEligibleJobs,
      rankLimit: filters.rankLimit,
    }),
    experience: aggregateExperienceDemand(input.current),
    qualifications: aggregateQualificationDemand(input.current),
    trends: selectTrendSkills(skills, filters.rankLimit),
    notes: [
      "In-memory demand summary (evaluation/tests).",
      "NOT official labour-market statistics.",
    ],
  };
}
