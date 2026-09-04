import { resolveTerm } from "../taxonomy/taxonomy.service";
import {
  INTELLIGENCE_CONFIDENCE_TIER,
  SKILL_EXTRACTION_METHOD,
  SKILL_INTELLIGENCE_STATUS,
  SKILL_REQUIREMENT_LEVEL,
  SKILL_REQUIREMENT_METHOD,
  type ExtractedSkillCandidate,
  type IntelligenceConfidenceTier,
  type JobIntelligenceSkill,
} from "./contract";

function uniquePush(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function confidenceFor(
  methods: readonly ExtractedSkillCandidate["extractionMethod"][],
  matchType?: "canonical" | "alias",
): IntelligenceConfidenceTier {
  if (methods.includes(SKILL_EXTRACTION_METHOD.EXPLICIT_SKILL_FIELD)) {
    return INTELLIGENCE_CONFIDENCE_TIER.HIGH;
  }
  if (matchType === "canonical" || methods.includes(SKILL_EXTRACTION_METHOD.CANONICAL_NAME_MATCH)) {
    return INTELLIGENCE_CONFIDENCE_TIER.HIGH;
  }
  if (matchType === "alias" || methods.includes(SKILL_EXTRACTION_METHOD.ALIAS_MATCH)) {
    return INTELLIGENCE_CONFIDENCE_TIER.MEDIUM;
  }
  return INTELLIGENCE_CONFIDENCE_TIER.LOW;
}

/**
 * Resolve extracted terms via Phase 4/5.9 `resolveTerm`. Does not write taxonomy.
 */
export async function normalizeExtractedSkills(
  candidates: readonly ExtractedSkillCandidate[],
): Promise<JobIntelligenceSkill[]> {
  const resolved = new Map<string, JobIntelligenceSkill>();
  const unresolved = new Map<string, JobIntelligenceSkill>();

  for (const candidate of candidates) {
    const lookup = await resolveTerm(candidate.rawTerm);
    if (lookup.status === "resolved") {
      const existing = resolved.get(lookup.skill.id);
      if (!existing) {
        resolved.set(lookup.skill.id, {
          rawTerm: candidate.rawTerm,
          contributingTerms: [candidate.rawTerm],
          skillId: lookup.skill.id,
          canonicalName: lookup.skill.canonicalName,
          status: SKILL_INTELLIGENCE_STATUS.RESOLVED,
          sourceField: candidate.sourceField,
          extractionMethod: candidate.extractionMethod,
          extractionMethods: [candidate.extractionMethod],
          normalizationMethod: lookup.matchType,
          confidenceTier: confidenceFor([candidate.extractionMethod], lookup.matchType),
          evidence: candidate.evidence,
          evidenceStart: candidate.evidenceStart,
          evidenceEnd: candidate.evidenceEnd,
          requirementLevel: SKILL_REQUIREMENT_LEVEL.MENTIONED,
          requirementMethod: SKILL_REQUIREMENT_METHOD.DEFAULT_MENTIONED,
          requirementConfidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
        });
        continue;
      }
      uniquePush(existing.contributingTerms, candidate.rawTerm);
      if (!existing.extractionMethods.includes(candidate.extractionMethod)) {
        existing.extractionMethods.push(candidate.extractionMethod);
      }
      existing.confidenceTier = confidenceFor(
        existing.extractionMethods,
        existing.normalizationMethod,
      );
      continue;
    }

    const key = candidate.rawTerm.trim().toLowerCase();
    if (!unresolved.has(key)) {
      unresolved.set(key, {
        rawTerm: candidate.rawTerm,
        contributingTerms: [candidate.rawTerm],
        status: SKILL_INTELLIGENCE_STATUS.UNRESOLVED,
        sourceField: candidate.sourceField,
        extractionMethod: candidate.extractionMethod,
        extractionMethods: [candidate.extractionMethod],
        confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
        evidence: candidate.evidence,
        evidenceStart: candidate.evidenceStart,
        evidenceEnd: candidate.evidenceEnd,
        requirementLevel: SKILL_REQUIREMENT_LEVEL.MENTIONED,
        requirementMethod: SKILL_REQUIREMENT_METHOD.DEFAULT_MENTIONED,
        requirementConfidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
      });
    } else {
      const existing = unresolved.get(key);
      if (existing) {
        uniquePush(existing.contributingTerms, candidate.rawTerm);
      }
    }
  }

  const resolvedRows = [...resolved.values()].sort((a, b) =>
    (a.canonicalName ?? a.rawTerm).localeCompare(b.canonicalName ?? b.rawTerm),
  );
  const unresolvedRows = [...unresolved.values()].sort((a, b) =>
    a.rawTerm.localeCompare(b.rawTerm),
  );
  return [...resolvedRows, ...unresolvedRows];
}
