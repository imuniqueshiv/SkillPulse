import type { DemandSummary, SkillDemandRow } from "../demand/contract";
import { DEMAND_METHODOLOGY_VERSION } from "../demand/policy";
import type { DemandSkillInput, GapDemandSignal } from "./contract";

/**
 * Thin adapter from Phase 8 SkillDemandRow → gap demand signal.
 * Does not recompute demand.
 */
export function adaptDemandSkills(
  skills: readonly DemandSkillInput[] | readonly SkillDemandRow[],
): GapDemandSignal[] {
  return skills.map((row) => ({
    skillId: row.skillId,
    canonicalName: row.canonicalName,
    name: row.name,
    demandQuantity: row.weightedDemand,
    jobCount: row.jobCount,
    trendDirection: row.trend.direction,
    includedJobs: row.qualityCoverage.includedJobs,
    cautionJobs: row.qualityCoverage.cautionJobs,
    occupationId: null,
    sectorId: null,
  }));
}

export function adaptDemandSummary(summary: DemandSummary): {
  demandVersion: string;
  signals: GapDemandSignal[];
} {
  return {
    demandVersion: summary.demandVersion || DEMAND_METHODOLOGY_VERSION,
    signals: adaptDemandSkills(summary.skills),
  };
}
