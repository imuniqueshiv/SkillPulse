import type { SkillDemandRow } from "./contract";
import { DEMAND_METHODOLOGY_VERSION } from "./policy";

/**
 * demand-v1 scoring: transparent metrics only.
 * Ranking uses weightedDemand (then jobCount, then name) — no opaque 0–100 AI score.
 */
export type DemandScoreExplanation = {
  demandVersion: typeof DEMAND_METHODOLOGY_VERSION;
  primaryMetric: "weightedDemand";
  formula: string;
  normalization: string;
  tieBreaking: string;
  notes: string[];
};

export function demandScoreExplanation(): DemandScoreExplanation {
  return {
    demandVersion: DEMAND_METHODOLOGY_VERSION,
    primaryMetric: "weightedDemand",
    formula:
      "skill contribution = qualityWeight(eligibility) × requirementWeight(level); " +
      "occupation/sector/geography weightedDemand = sum(qualityWeight) over contributing jobs",
    normalization:
      "jobPenetration = entityWeightedDemand / weightedEligibleJobs; " +
      "skillDemandShare = skillWeightedDemand / sum(skillWeightedDemand)",
    tieBreaking: "weightedDemand DESC, jobCount DESC, canonicalName/name ASC",
    notes: [
      "No mysterious 0–100 demand score is produced.",
      "Weights are MVP policy values, not calibrated labour-market probabilities.",
      "Demand metrics represent analytically eligible job observations — not official statistics.",
    ],
  };
}

export function selectTrendSkills(
  skills: readonly SkillDemandRow[],
  rankLimit: number,
): {
  risingSkills: SkillDemandRow[];
  decliningSkills: SkillDemandRow[];
  stableSkills: SkillDemandRow[];
} {
  const risingSkills = skills
    .filter((row) => row.trend.direction === "RISING")
    .slice(0, rankLimit);
  const decliningSkills = skills
    .filter((row) => row.trend.direction === "DECLINING")
    .slice(0, rankLimit);
  const stableSkills = skills
    .filter((row) => row.trend.direction === "STABLE")
    .slice(0, rankLimit);
  return { risingSkills, decliningSkills, stableSkills };
}
