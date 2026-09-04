import {
  EXPERIENCE_EXTRACTION_METHOD,
  EXPERIENCE_INTELLIGENCE_STATUS,
  INTELLIGENCE_CONFIDENCE_TIER,
  type JobIntelligenceExperience,
} from "./contract";

const FRESHER_RE =
  /\b(?:freshers?(?:\s+can\s+apply)?|fresh\s+graduates?|no\s+experience(?:\s+required)?)\b/i;

const RANGE_RE = /(\d+(?:\.\d+)?)\s*[-–—to]+\s*(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?\.?)/i;
const MIN_PLUS_RE = /(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?\.?)/i;
const MINIMUM_RE =
  /\b(?:minimum|min(?:imum)?|at\s+least)\s+(\d+(?:\.\d+)?)\s*(?:years?|yrs?\.?)/i;

function hasYearToken(text: string): boolean {
  return /\b(?:years?|yrs?\.?)\b/i.test(text) || FRESHER_RE.test(text);
}

function asYears(raw: string): number {
  return Number(raw);
}

function parsed(fields: Omit<JobIntelligenceExperience, "extractionMethod" | "confidenceTier">): JobIntelligenceExperience {
  return {
    ...fields,
    extractionMethod: EXPERIENCE_EXTRACTION_METHOD.CALLER_TEXT,
    confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.HIGH,
  };
}

function unparsed(rawText: string): JobIntelligenceExperience {
  return {
    status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED,
    rawText,
    extractionMethod: EXPERIENCE_EXTRACTION_METHOD.CALLER_TEXT,
    confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
  };
}

function unknown(rawText: string | null): JobIntelligenceExperience {
  return {
    status: EXPERIENCE_INTELLIGENCE_STATUS.UNKNOWN,
    rawText,
    extractionMethod: EXPERIENCE_EXTRACTION_METHOD.UNAVAILABLE,
    confidenceTier: INTELLIGENCE_CONFIDENCE_TIER.LOW,
  };
}

/**
 * Parse experience from caller-supplied text. Canonical Job has no experience field.
 */
export function extractExperience(rawText: string | null | undefined): JobIntelligenceExperience {
  if (rawText == null) {
    return unknown(null);
  }
  if (typeof rawText !== "string") {
    return unparsed(String(rawText));
  }

  const trimmed = rawText.trim();
  if (trimmed === "") {
    return unknown(trimmed);
  }

  const freshersAccepted = FRESHER_RE.test(trimmed);
  const range = RANGE_RE.exec(trimmed);
  if (range) {
    const minYears = asYears(range[1] ?? "");
    const maxYears = asYears(range[2] ?? "");
    if (!Number.isFinite(minYears) || !Number.isFinite(maxYears)) {
      return unparsed(trimmed);
    }
    if (minYears < 0 || maxYears < 0 || minYears > maxYears) {
      return unparsed(trimmed);
    }
    return parsed({
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears,
      freshersAccepted: freshersAccepted || minYears === 0,
      rawText: trimmed,
    });
  }

  const minPlus = MIN_PLUS_RE.exec(trimmed);
  if (minPlus) {
    const minYears = asYears(minPlus[1] ?? "");
    if (!Number.isFinite(minYears) || minYears < 0) {
      return unparsed(trimmed);
    }
    return parsed({
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears: null,
      freshersAccepted,
      rawText: trimmed,
    });
  }

  const minimum = MINIMUM_RE.exec(trimmed);
  if (minimum) {
    const minYears = asYears(minimum[1] ?? "");
    if (!Number.isFinite(minYears) || minYears < 0) {
      return unparsed(trimmed);
    }
    return parsed({
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears: null,
      freshersAccepted,
      rawText: trimmed,
    });
  }

  if (freshersAccepted) {
    return parsed({
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears: 0,
      maxYears: null,
      freshersAccepted: true,
      rawText: trimmed,
    });
  }

  return unparsed(trimmed);
}
