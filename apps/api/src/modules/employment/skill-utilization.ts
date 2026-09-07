import type {
  SkillUtilizationResult,
  SkillUtilizationSummary,
} from "./contract";
import type { ResolvedOutcomeGroup } from "./outcomes";
import {
  OUTCOME_TYPE,
  SKILL_UTILIZATION_LEVEL,
  SKILL_UTILIZATION_THRESHOLD,
  type SkillUtilizationLevel,
} from "./policy";

/**
 * Skill utilization: trained canonical skills ∩ employment-evidenced skills.
 * Never infer employment skills from job title alone.
 */
export function computeSkillUtilization(input: {
  trainedSkillIds: readonly string[];
  employmentSkillIds: readonly string[];
}): SkillUtilizationResult {
  const trained = unique(input.trainedSkillIds);
  const employment = unique(input.employmentSkillIds);

  if (trained.length === 0) {
    return {
      level: SKILL_UTILIZATION_LEVEL.UNKNOWN,
      ratio: null,
      matchedSkillIds: [],
      trainedSkillIds: trained,
      employmentSkillIds: employment,
      note: "No trained skill IDs — utilization UNKNOWN.",
    };
  }
  if (employment.length === 0) {
    return {
      level: SKILL_UTILIZATION_LEVEL.UNKNOWN,
      ratio: null,
      matchedSkillIds: [],
      trainedSkillIds: trained,
      employmentSkillIds: employment,
      note: "No employment skill evidence — UNKNOWN (not NONE). Titles alone do not prove skills.",
    };
  }

  const empSet = new Set(employment);
  const matched = trained.filter((id) => empSet.has(id));
  const ratio = matched.length / trained.length;
  const level = classifyUtilizationLevel(ratio);

  return {
    level,
    ratio: Number(ratio.toFixed(6)),
    matchedSkillIds: matched.sort((a, b) => a.localeCompare(b)),
    trainedSkillIds: trained,
    employmentSkillIds: employment,
    note: "Observational match of canonical skill IDs — not causal employment proof.",
  };
}

export function classifyUtilizationLevel(
  ratio: number | null,
): SkillUtilizationLevel {
  if (ratio === null || !Number.isFinite(ratio)) {
    return SKILL_UTILIZATION_LEVEL.UNKNOWN;
  }
  if (ratio >= SKILL_UTILIZATION_THRESHOLD.FULL) {
    return SKILL_UTILIZATION_LEVEL.FULL;
  }
  if (ratio >= SKILL_UTILIZATION_THRESHOLD.PARTIAL) {
    return SKILL_UTILIZATION_LEVEL.PARTIAL;
  }
  if (ratio > 0) return SKILL_UTILIZATION_LEVEL.LOW;
  return SKILL_UTILIZATION_LEVEL.NONE;
}

function unique(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function summarizeSkillUtilization(
  groups: readonly ResolvedOutcomeGroup[],
): SkillUtilizationSummary {
  const buckets = {
    knownOutcomes: 0,
    full: 0,
    partial: 0,
    low: 0,
    none: 0,
    unknown: 0,
  };
  const ratios: number[] = [];

  for (const g of groups) {
    if (
      g.primary.outcomeType !== OUTCOME_TYPE.EMPLOYED &&
      g.primary.outcomeType !== OUTCOME_TYPE.PLACED
    ) {
      continue;
    }
    const u = computeSkillUtilization({
      trainedSkillIds: g.primary.trainedSkillIds,
      employmentSkillIds: g.primary.employmentSkillIds,
    });
    if (u.level === SKILL_UTILIZATION_LEVEL.UNKNOWN) {
      buckets.unknown += 1;
      continue;
    }
    buckets.knownOutcomes += 1;
    if (u.ratio !== null) ratios.push(u.ratio);
    if (u.level === SKILL_UTILIZATION_LEVEL.FULL) buckets.full += 1;
    else if (u.level === SKILL_UTILIZATION_LEVEL.PARTIAL) buckets.partial += 1;
    else if (u.level === SKILL_UTILIZATION_LEVEL.LOW) buckets.low += 1;
    else buckets.none += 1;
  }

  const rate =
    ratios.length > 0
      ? Number(
          (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(6),
        )
      : null;

  return { ...buckets, rate };
}
