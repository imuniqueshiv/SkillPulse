import {
  SKILL_REQUIREMENT_LEVEL,
  type JobIntelligenceResult,
  type JobIntelligenceSkill,
  type SkillRequirementLevel,
} from "../intelligence/contract";
import type { QualityEligibility } from "../quality/contract";
import {
  isStrongerRequirement,
  qualityWeight,
  requirementWeight,
  skillContribution,
} from "./policy";
import type { DemandSkillRef } from "./contract";

export function emptyRequirementBreakdown(): Record<SkillRequirementLevel, number> {
  return {
    [SKILL_REQUIREMENT_LEVEL.REQUIRED]: 0,
    [SKILL_REQUIREMENT_LEVEL.PREFERRED]: 0,
    [SKILL_REQUIREMENT_LEVEL.OPTIONAL]: 0,
    [SKILL_REQUIREMENT_LEVEL.MENTIONED]: 0,
  };
}

/**
 * Collapse Phase 6 skill mentions to one row per canonical skillId per job,
 * keeping the strongest requirement level.
 */
export function dedupeJobSkills(
  skills: readonly JobIntelligenceSkill[],
  eligibility: QualityEligibility,
): DemandSkillRef[] {
  const byId = new Map<string, DemandSkillRef>();

  for (const skill of skills) {
    if (skill.status !== "RESOLVED" || !skill.skillId?.trim()) {
      continue;
    }
    const skillId = skill.skillId.trim();
    const level = skill.requirementLevel;
    const existing = byId.get(skillId);
    if (!existing || isStrongerRequirement(level, existing.requirementLevel)) {
      const reqWeight = requirementWeight(level);
      byId.set(skillId, {
        skillId,
        canonicalName: skill.canonicalName?.trim() || skillId,
        name: skill.canonicalName?.trim() || skill.rawTerm,
        requirementLevel: level,
        requirementWeight: reqWeight,
        contribution: skillContribution(eligibility, level),
      });
    }
  }

  return [...byId.values()].sort((a, b) =>
    a.canonicalName.localeCompare(b.canonicalName),
  );
}

export function buildSkillsFromIntelligence(
  intelligence: JobIntelligenceResult | null,
  eligibility: QualityEligibility,
): DemandSkillRef[] {
  if (!intelligence) {
    return [];
  }
  return dedupeJobSkills(intelligence.skills, eligibility);
}

export function compareDemandRows(
  a: { weightedDemand: number; jobCount: number; name: string },
  b: { weightedDemand: number; jobCount: number; name: string },
): number {
  if (b.weightedDemand !== a.weightedDemand) {
    return b.weightedDemand - a.weightedDemand;
  }
  if (b.jobCount !== a.jobCount) {
    return b.jobCount - a.jobCount;
  }
  return a.name.localeCompare(b.name);
}

export function ratio(numerator: number, denominator: number): number {
  if (!(denominator > 0) || !Number.isFinite(numerator)) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(6));
}

export function contributingQualityWeight(eligibility: QualityEligibility): number {
  return qualityWeight(eligibility);
}
