import {
  SKILL_EXTRACTION_METHOD,
  type ExtractedSkillCandidate,
  type PreparedJobText,
  type SkillExtractionMethod,
} from "./contract";

export type SkillMatchSurface = {
  surface: string;
  method: SkillExtractionMethod;
};

const CASE_SENSITIVE_SURFACES = new Set(["C", "R", "Go", ".NET", "C++", "C#"]);

const TEXT_MATCH_PATTERNS: { re: RegExp; method: SkillExtractionMethod }[] = [
  { re: /C\+\+/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /C#/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\.NET\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bNode\.js\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bReact\.js\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bGo\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bR\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bREST\s+APIs?\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
  { re: /\bPostgreSQL\b/g, method: SKILL_EXTRACTION_METHOD.TEXT_MATCH },
];

function isLetterOrNumber(ch: string | undefined): boolean {
  return ch != null && /[\p{L}\p{N}]/u.test(ch);
}

export function isBoundarySafeMatch(
  text: string,
  start: number,
  surface: string,
): boolean {
  if (start < 0 || start + surface.length > text.length) {
    return false;
  }
  const actual = text.slice(start, start + surface.length);
  const caseSensitive = CASE_SENSITIVE_SURFACES.has(surface);
  if (caseSensitive ? actual !== surface : actual.toLowerCase() !== surface.toLowerCase()) {
    return false;
  }

  const before = start === 0 ? undefined : text[start - 1];
  const afterIndex = start + surface.length;
  const after = afterIndex >= text.length ? undefined : text[afterIndex];

  if (surface === "C" && (after === "+" || after === "#")) {
    return false;
  }
  if ((surface === "C++" || surface === "C#") && isLetterOrNumber(after)) {
    return false;
  }

  const beforeOk = surface.startsWith(".") ? !isLetterOrNumber(before) : !isLetterOrNumber(before);
  const afterOk = !isLetterOrNumber(after);
  return beforeOk && afterOk;
}

function findSurfaceStarts(text: string, surface: string): number[] {
  if (!surface) {
    return [];
  }
  const caseSensitive = CASE_SENSITIVE_SURFACES.has(surface);
  const hay = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? surface : surface.toLowerCase();
  const starts: number[] = [];
  let from = 0;
  while (from <= hay.length - needle.length) {
    const idx = hay.indexOf(needle, from);
    if (idx === -1) {
      break;
    }
    if (isBoundarySafeMatch(text, idx, surface)) {
      starts.push(idx);
    }
    from = idx + 1;
  }
  return starts;
}

type Span = { start: number; end: number };

function overlaps(span: Span, occupied: readonly Span[]): boolean {
  return occupied.some((item) => span.start < item.end && span.end > item.start);
}

function uniqueCandidateKey(candidate: ExtractedSkillCandidate): string {
  return [
    candidate.rawTerm,
    candidate.sourceField,
    candidate.extractionMethod,
    String(candidate.evidenceStart ?? ""),
  ].join("\u001f");
}

function pushUnique(
  list: ExtractedSkillCandidate[],
  seen: Set<string>,
  candidate: ExtractedSkillCandidate,
) {
  const key = uniqueCandidateKey(candidate);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  list.push(candidate);
}

function collectFromField(
  field: "title" | "description",
  text: string,
  surfaces: readonly SkillMatchSurface[],
  occupied: Span[],
  seen: Set<string>,
  out: ExtractedSkillCandidate[],
) {
  const sorted = [...surfaces].sort((a, b) => {
    const length = b.surface.length - a.surface.length;
    if (length !== 0) {
      return length;
    }
    return a.surface.localeCompare(b.surface);
  });

  for (const entry of sorted) {
    for (const start of findSurfaceStarts(text, entry.surface)) {
      const end = start + entry.surface.length;
      if (overlaps({ start, end }, occupied)) {
        continue;
      }
      occupied.push({ start, end });
      occupied.sort((a, b) => a.start - b.start);
      const evidence = text.slice(start, end);
      pushUnique(out, seen, {
        rawTerm: evidence,
        sourceField: field,
        extractionMethod: entry.method,
        evidence,
        evidenceStart: start,
        evidenceEnd: end,
      });
    }
  }

  for (const pattern of TEXT_MATCH_PATTERNS) {
    pattern.re.lastIndex = 0;
    let match: RegExpExecArray | null = pattern.re.exec(text);
    while (match) {
      const start = match.index;
      const evidence = match[0];
      const end = start + evidence.length;
      if (!overlaps({ start, end }, occupied)) {
        occupied.push({ start, end });
        pushUnique(out, seen, {
          rawTerm: evidence,
          sourceField: field,
          extractionMethod: pattern.method,
          evidence,
          evidenceStart: start,
          evidenceEnd: end,
        });
      }
      match = pattern.re.exec(text);
    }
  }
}

/**
 * Deterministic skill-term extraction. Does not create Skills or call resolveTerm.
 */
export function extractSkillCandidates(input: {
  text: PreparedJobText;
  explicitSkills?: readonly string[] | null;
  jobSkillNames?: readonly string[] | null;
  surfaces?: readonly SkillMatchSurface[] | null;
}): ExtractedSkillCandidate[] {
  const out: ExtractedSkillCandidate[] = [];
  const seen = new Set<string>();
  const surfaces = input.surfaces ?? [];

  for (const term of input.explicitSkills ?? []) {
    if (typeof term !== "string" || term.trim() === "") {
      continue;
    }
    pushUnique(out, seen, {
      rawTerm: term,
      sourceField: "explicitSkills",
      extractionMethod: SKILL_EXTRACTION_METHOD.EXPLICIT_SKILL_FIELD,
      evidence: term,
    });
  }

  for (const term of input.jobSkillNames ?? []) {
    if (typeof term !== "string" || term.trim() === "") {
      continue;
    }
    pushUnique(out, seen, {
      rawTerm: term,
      sourceField: "job.skills",
      extractionMethod: SKILL_EXTRACTION_METHOD.EXPLICIT_SKILL_FIELD,
      evidence: term,
    });
  }

  collectFromField("title", input.text.titlePrepared, surfaces, [], seen, out);
  if (input.text.descriptionPrepared) {
    collectFromField(
      "description",
      input.text.descriptionPrepared,
      surfaces,
      [],
      seen,
      out,
    );
  }

  return out;
}
