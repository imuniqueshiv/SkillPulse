import {
  INTELLIGENCE_CONFIDENCE_TIER,
  SKILL_REQUIREMENT_LEVEL,
  SKILL_REQUIREMENT_METHOD,
  type IntelligenceConfidenceTier,
  type JobIntelligenceSkill,
  type PreparedJobText,
  type SkillRequirementLevel,
} from "./contract";
import { findBoundaryStarts } from "./skill-extraction";

const RANK: Record<SkillRequirementLevel, number> = {
  REQUIRED: 4,
  PREFERRED: 3,
  OPTIONAL: 2,
  MENTIONED: 1,
};

const REQUIRED_RE =
  /\b(?:required|mandatory|compulsory|essential|must(?:\s+have)?|strong knowledge)\b/i;
const PREFERRED_RE = /\b(?:preferred|preferably|preference)\b/i;
const OPTIONAL_RE =
  /\b(?:a\s+plus|desirable|nice\s+to\s+have|optional|an?\s+advantage)\b/i;

type Clause = { text: string; start: number; end: number };

function splitClauses(text: string): Clause[] {
  const clauses: Clause[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    const sentenceDot = ch === "." && (next == null || /\s/.test(next));
    const otherBreak = ch === "!" || ch === "?" || ch === ";" || ch === "\n";
    if (sentenceDot || otherBreak) {
      clauses.push({
        text: text.slice(start, i + 1),
        start,
        end: i + 1,
      });
      start = i + 1;
    }
  }
  if (start < text.length) {
    clauses.push({
      text: text.slice(start),
      start,
      end: text.length,
    });
  }
  return clauses.filter((clause) => clause.text.trim() !== "");
}

function clauseFor(clauses: readonly Clause[], index: number): Clause | undefined {
  return clauses.find((clause) => index >= clause.start && index < clause.end);
}

function levelFromClause(clauseText: string): SkillRequirementLevel {
  if (REQUIRED_RE.test(clauseText)) {
    return SKILL_REQUIREMENT_LEVEL.REQUIRED;
  }
  if (PREFERRED_RE.test(clauseText)) {
    return SKILL_REQUIREMENT_LEVEL.PREFERRED;
  }
  if (OPTIONAL_RE.test(clauseText)) {
    return SKILL_REQUIREMENT_LEVEL.OPTIONAL;
  }
  return SKILL_REQUIREMENT_LEVEL.MENTIONED;
}

function confidenceForLevel(level: SkillRequirementLevel): IntelligenceConfidenceTier {
  if (level === SKILL_REQUIREMENT_LEVEL.REQUIRED) {
    return INTELLIGENCE_CONFIDENCE_TIER.HIGH;
  }
  if (
    level === SKILL_REQUIREMENT_LEVEL.PREFERRED ||
    level === SKILL_REQUIREMENT_LEVEL.OPTIONAL
  ) {
    return INTELLIGENCE_CONFIDENCE_TIER.MEDIUM;
  }
  return INTELLIGENCE_CONFIDENCE_TIER.LOW;
}

function termsFor(skill: JobIntelligenceSkill): string[] {
  const terms = [...skill.contributingTerms, skill.rawTerm];
  if (skill.canonicalName) {
    terms.push(skill.canonicalName);
  }
  return [...new Set(terms.filter((term) => term.trim() !== ""))].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
}

type Hit = {
  level: SkillRequirementLevel;
  evidence: string;
};

function hitsInField(text: string, terms: readonly string[]): Hit[] {
  if (!text) {
    return [];
  }
  const clauses = splitClauses(text);
  const hits: Hit[] = [];
  for (const term of terms) {
    for (const start of findBoundaryStarts(text, term)) {
      const clause = clauseFor(clauses, start);
      if (!clause) {
        continue;
      }
      hits.push({
        level: levelFromClause(clause.text),
        evidence: clause.text.trim(),
      });
    }
  }
  return hits;
}

function strongest(hits: readonly Hit[]): Hit | undefined {
  if (hits.length === 0) {
    return undefined;
  }
  return [...hits].sort((a, b) => {
    const byRank = RANK[b.level] - RANK[a.level];
    if (byRank !== 0) {
      return byRank;
    }
    return a.evidence.localeCompare(b.evidence);
  })[0];
}

/**
 * Classify requirement level from the clause that contains the skill.
 * Unrelated sentences do not affect a skill. Stronger local signals win.
 */
export function applyRequirementSignals(
  skills: readonly JobIntelligenceSkill[],
  text: PreparedJobText,
): JobIntelligenceSkill[] {
  return skills.map((skill) => {
    const terms = termsFor(skill);
    const hits = [
      ...hitsInField(text.titlePrepared, terms),
      ...hitsInField(text.descriptionPrepared ?? "", terms),
    ];
    const best = strongest(hits);
    if (!best || best.level === SKILL_REQUIREMENT_LEVEL.MENTIONED) {
      return {
        ...skill,
        requirementLevel: SKILL_REQUIREMENT_LEVEL.MENTIONED,
        requirementMethod: SKILL_REQUIREMENT_METHOD.DEFAULT_MENTIONED,
        requirementEvidence: best?.evidence,
        requirementConfidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
      };
    }
    return {
      ...skill,
      requirementLevel: best.level,
      requirementMethod: SKILL_REQUIREMENT_METHOD.LOCAL_SIGNAL,
      requirementEvidence: best.evidence,
      requirementConfidenceTier: confidenceForLevel(best.level),
    };
  });
}
