import {
  EXPERIENCE_INTELLIGENCE_STATUS,
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

/**
 * Parse experience from caller-supplied text. Canonical Job has no experience field.
 */
export function extractExperience(rawText: string | null | undefined): JobIntelligenceExperience {
  if (rawText == null) {
    return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNKNOWN, rawText: null };
  }
  if (typeof rawText !== "string") {
    return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: String(rawText) };
  }

  const trimmed = rawText.trim();
  if (trimmed === "") {
    return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNKNOWN, rawText: trimmed };
  }

  const freshersAccepted = FRESHER_RE.test(trimmed);
  const range = RANGE_RE.exec(trimmed);
  if (range) {
    const minYears = asYears(range[1] ?? "");
    const maxYears = asYears(range[2] ?? "");
    if (!Number.isFinite(minYears) || !Number.isFinite(maxYears)) {
      return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
    }
    if (minYears < 0 || maxYears < 0 || minYears > maxYears) {
      return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
    }
    return {
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears,
      freshersAccepted: freshersAccepted || minYears === 0,
      rawText: trimmed,
    };
  }

  const minPlus = MIN_PLUS_RE.exec(trimmed);
  if (minPlus) {
    const minYears = asYears(minPlus[1] ?? "");
    if (!Number.isFinite(minYears) || minYears < 0) {
      return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
    }
    return {
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears: null,
      freshersAccepted,
      rawText: trimmed,
    };
  }

  const minimum = MINIMUM_RE.exec(trimmed);
  if (minimum) {
    const minYears = asYears(minimum[1] ?? "");
    if (!Number.isFinite(minYears) || minYears < 0) {
      return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
    }
    return {
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears,
      maxYears: null,
      freshersAccepted,
      rawText: trimmed,
    };
  }

  if (freshersAccepted) {
    return {
      status: EXPERIENCE_INTELLIGENCE_STATUS.PARSED,
      minYears: 0,
      maxYears: null,
      freshersAccepted: true,
      rawText: trimmed,
    };
  }

  if (hasYearToken(trimmed) || /\d/.test(trimmed)) {
    return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
  }

  return { status: EXPERIENCE_INTELLIGENCE_STATUS.UNPARSED, rawText: trimmed };
}
