import type {
  DemandJobObservation,
  SkillDemandRow,
} from "./contract";
import { observationInPeriod } from "./period";
import { classifyTrend } from "./trends";
import {
  compareDemandRows,
  emptyRequirementBreakdown,
  ratio,
} from "./skills-util";

type Acc = {
  skillId: string;
  canonicalName: string;
  name: string;
  jobIds: Set<string>;
  weightedDemand: number;
  requirementBreakdown: ReturnType<typeof emptyRequirementBreakdown>;
  includedJobs: Set<string>;
  cautionJobs: Set<string>;
  recentWeightedDemand: number;
  recentJobIds: Set<string>;
  previousWeightedDemand: number;
  previousJobIds: Set<string>;
};

function ensure(map: Map<string, Acc>, skill: DemandJobObservation["skills"][number]): Acc {
  let row = map.get(skill.skillId);
  if (!row) {
    row = {
      skillId: skill.skillId,
      canonicalName: skill.canonicalName,
      name: skill.name,
      jobIds: new Set(),
      weightedDemand: 0,
      requirementBreakdown: emptyRequirementBreakdown(),
      includedJobs: new Set(),
      cautionJobs: new Set(),
      recentWeightedDemand: 0,
      recentJobIds: new Set(),
      previousWeightedDemand: 0,
      previousJobIds: new Set(),
    };
    map.set(skill.skillId, row);
  }
  return row;
}

/**
 * Aggregate canonical skill demand from observations.
 * One contribution per (job, skillId). Metrics are semantically distinct.
 */
export function aggregateSkillDemand(input: {
  current: readonly DemandJobObservation[];
  previous: readonly DemandJobObservation[];
  weightedEligibleJobs: number;
  recentFrom: Date;
  recentTo: Date;
  previousFrom: Date;
  previousTo: Date;
  rankLimit: number;
}): SkillDemandRow[] {
  const map = new Map<string, Acc>();

  for (const obs of input.current) {
    for (const skill of obs.skills) {
      const row = ensure(map, skill);
      if (!row.jobIds.has(obs.jobId)) {
        row.jobIds.add(obs.jobId);
        row.requirementBreakdown[skill.requirementLevel] += 1;
        if (obs.eligibility === "INCLUDE") {
          row.includedJobs.add(obs.jobId);
        } else if (obs.eligibility === "INCLUDE_WITH_CAUTION") {
          row.cautionJobs.add(obs.jobId);
        }
      }
      row.weightedDemand += skill.contribution;
      if (observationInPeriod(obs.postedAt, input.recentFrom, input.recentTo)) {
        row.recentWeightedDemand += skill.contribution;
        row.recentJobIds.add(obs.jobId);
      }
    }
  }

  for (const obs of input.previous) {
    for (const skill of obs.skills) {
      const row = ensure(map, skill);
      row.previousWeightedDemand += skill.contribution;
      row.previousJobIds.add(obs.jobId);
    }
  }

  const totalWeightedDemand = [...map.values()].reduce(
    (sum, row) => sum + row.weightedDemand,
    0,
  );

  const rows: SkillDemandRow[] = [...map.values()].map((row) => ({
    skillId: row.skillId,
    canonicalName: row.canonicalName,
    name: row.name,
    jobCount: row.jobIds.size,
    weightedDemand: Number(row.weightedDemand.toFixed(6)),
    jobPenetration: ratio(row.weightedDemand, input.weightedEligibleJobs),
    skillDemandShare: ratio(row.weightedDemand, totalWeightedDemand),
    requirementBreakdown: row.requirementBreakdown,
    recentWeightedDemand: Number(row.recentWeightedDemand.toFixed(6)),
    trend: classifyTrend({
      current: row.weightedDemand,
      previous: row.previousWeightedDemand,
      currentSample: row.jobIds.size,
      previousSample: row.previousJobIds.size,
    }),
    qualityCoverage: {
      includedJobs: row.includedJobs.size,
      cautionJobs: row.cautionJobs.size,
    },
  }));

  rows.sort(compareDemandRows);
  return rows.slice(0, input.rankLimit);
}
