import {
  INTELLIGENCE_CONFIDENCE_TIER,
  QUALIFICATION_EXTRACTION_METHOD,
  QUALIFICATION_INTELLIGENCE_STATUS,
  type JobIntelligenceQualification,
} from "./contract";

type Pattern = {
  type: string;
  normalized: string;
  re: RegExp;
};

const PATTERNS: Pattern[] = [
  { type: "DEGREE", normalized: "B.Tech", re: /\bb\.?\s*tech\b/i },
  { type: "DEGREE", normalized: "B.E.", re: /\bb\.\s*e\.?\b/i },
  { type: "DEGREE", normalized: "Bachelor's Degree", re: /\bbachelor'?s(?:\s+degree)?\b/i },
  { type: "DIPLOMA", normalized: "Diploma", re: /\bdiploma\b/i },
  { type: "ITI", normalized: "ITI", re: /\biti\b/i },
  { type: "FIELD", normalized: "Computer Science", re: /\bcomputer\s+science\b/i },
];

function unknown(rawText: string): JobIntelligenceQualification {
  return {
    rawText,
    status: QUALIFICATION_INTELLIGENCE_STATUS.UNKNOWN,
    extractionMethod: QUALIFICATION_EXTRACTION_METHOD.UNAVAILABLE,
    confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
  };
}

function unparsed(rawText: string): JobIntelligenceQualification {
  return {
    rawText,
    status: QUALIFICATION_INTELLIGENCE_STATUS.UNPARSED,
    extractionMethod: QUALIFICATION_EXTRACTION_METHOD.CALLER_TEXT,
    confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
  };
}

/**
 * Simple deterministic qualification tokens from caller-supplied text.
 * Canonical Job has no qualification field.
 */
export function extractQualifications(
  rawText: string | null | undefined,
): JobIntelligenceQualification[] {
  if (rawText == null) {
    return [unknown("")];
  }
  if (typeof rawText !== "string") {
    return [unparsed(String(rawText))];
  }

  const trimmed = rawText.trim();
  if (trimmed === "") {
    return [unknown(trimmed)];
  }

  const found: JobIntelligenceQualification[] = [];
  const seen = new Set<string>();
  for (const pattern of PATTERNS) {
    if (!pattern.re.test(trimmed)) {
      continue;
    }
    if (seen.has(pattern.normalized)) {
      continue;
    }
    seen.add(pattern.normalized);
    found.push({
      rawText: trimmed,
      normalized: pattern.normalized,
      type: pattern.type,
      status: QUALIFICATION_INTELLIGENCE_STATUS.PARSED,
      extractionMethod: QUALIFICATION_EXTRACTION_METHOD.CALLER_TEXT,
      confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.HIGH,
    });
  }

  if (found.length === 0) {
    return [unparsed(trimmed)];
  }

  return found;
}
