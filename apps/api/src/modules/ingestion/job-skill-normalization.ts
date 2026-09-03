import type { SkillStatus } from "@prisma/client";
import { AppError } from "../../utils/errors";
import { resolveTerm } from "../taxonomy/taxonomy.service";
import type { JobDedupStatus } from "./job-deduplication";
import type { JobFreshnessStatus } from "./job-freshness";
import {
  JOB_VALIDATION_STATUS,
  type JobValidationResult,
} from "./job-validation";

/**
 * Ingestion-facing statuses. Mapped from Phase 4 `resolveTerm`
 * (`resolved` / `unresolved`). `AMBIGUOUS` is not produced: Skill.canonicalName
 * and SkillAlias.normalizedTerm are unique, and resolveTerm never guesses.
 */
export const JOB_SKILL_RESOLUTION_STATUS = {
  RESOLVED: "RESOLVED",
  UNRESOLVED: "UNRESOLVED",
} as const;

export type JobSkillResolutionStatus =
  (typeof JOB_SKILL_RESOLUTION_STATUS)[keyof typeof JOB_SKILL_RESOLUTION_STATUS];

export type JobSkillMatchType = "canonical" | "alias";

export type JobSkillInputTerm = string | { readonly term: string };

export type JobSkillNormalizationInput = {
  observationId: string;
  validation: JobValidationResult;
  /** Explicit source skill terms. Original strings are preserved. */
  skills?: readonly JobSkillInputTerm[] | null;
  dedupStatus?: JobDedupStatus | null;
  freshnessStatus?: JobFreshnessStatus | null;
};

export type JobSkillTermResolution = {
  inputTerm: string;
  normalized: string;
  status: JobSkillResolutionStatus;
  matchType?: JobSkillMatchType;
  skillId?: string;
  canonicalName?: string;
  skillName?: string;
  skillCode?: string;
  skillStatus?: SkillStatus;
  confidence?: number;
};

export type JobNormalizedSkill = {
  skillId: string;
  canonicalName: string;
  skillName: string;
  skillCode: string;
  skillStatus: SkillStatus;
  inputTerms: string[];
  matchTypes: JobSkillMatchType[];
};

export type JobSkillNormalizationResult = {
  observationId: string;
  terms: JobSkillTermResolution[];
  resolvedSkills: JobNormalizedSkill[];
  unresolvedTerms: string[];
  dedupStatus: JobDedupStatus | null;
  freshnessStatus: JobFreshnessStatus | null;
};

function requireEligibleRecord(validation: JobValidationResult) {
  if (validation.status === JOB_VALIDATION_STATUS.REJECTED || !validation.record) {
    throw new AppError(400, "Job observation is not eligible for skill normalization");
  }
  return validation.record;
}

function asTerm(value: JobSkillInputTerm): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && typeof value.term === "string") {
    return value.term;
  }
  throw new AppError(400, "Invalid skill term");
}

function uniquePush<T>(list: T[], value: T) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

/**
 * Collect skill terms without extracting from title/description.
 * Explicit `skills` wins. Otherwise `sourceMetadata.skills` when it is a string[].
 * `sourceMetadata.skillsText` blobs are not parsed.
 */
export function collectJobObservationSkillTerms(
  input: JobSkillNormalizationInput,
): string[] {
  if (Array.isArray(input.skills)) {
    return input.skills.map(asTerm);
  }

  const metadata = input.validation.record?.payload.sourceMetadata?.skills;
  if (!Array.isArray(metadata)) {
    return [];
  }

  return metadata.filter((value): value is string => typeof value === "string");
}

function toTermResolution(
  inputTerm: string,
  resolved: Awaited<ReturnType<typeof resolveTerm>>,
): JobSkillTermResolution {
  if (resolved.status !== "resolved") {
    return {
      inputTerm,
      normalized: resolved.normalized,
      status: JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED,
    };
  }

  return {
    inputTerm,
    normalized: resolved.normalized,
    status: JOB_SKILL_RESOLUTION_STATUS.RESOLVED,
    matchType: resolved.matchType,
    skillId: resolved.skill.id,
    canonicalName: resolved.skill.canonicalName,
    skillName: resolved.skill.name,
    skillCode: resolved.skill.code,
    skillStatus: resolved.skill.status,
    confidence: resolved.confidence,
  };
}

function collapseResolvedSkills(
  terms: readonly JobSkillTermResolution[],
): JobNormalizedSkill[] {
  const byId = new Map<string, JobNormalizedSkill>();

  for (const term of terms) {
    if (term.status !== JOB_SKILL_RESOLUTION_STATUS.RESOLVED || !term.skillId) {
      continue;
    }

    const existing = byId.get(term.skillId);
    if (!existing) {
      byId.set(term.skillId, {
        skillId: term.skillId,
        canonicalName: term.canonicalName ?? "",
        skillName: term.skillName ?? "",
        skillCode: term.skillCode ?? "",
        skillStatus: term.skillStatus ?? "ACTIVE",
        inputTerms: [term.inputTerm],
        matchTypes: term.matchType ? [term.matchType] : [],
      });
      continue;
    }

    uniquePush(existing.inputTerms, term.inputTerm);
    if (term.matchType) {
      uniquePush(existing.matchTypes, term.matchType);
    }
  }

  return [...byId.values()];
}

/**
 * Resolve supplied job skill terms against the Phase 4 taxonomy.
 * Reads via `resolveTerm` only. Does not write Skill, SkillAlias, Job, or JobSkill.
 */
export async function normalizeJobObservationSkills(
  input: JobSkillNormalizationInput,
): Promise<JobSkillNormalizationResult> {
  const observationId = input.observationId.trim();
  if (!observationId) {
    throw new AppError(400, "observationId is required");
  }

  requireEligibleRecord(input.validation);
  const skillTerms = collectJobObservationSkillTerms(input);
  const terms: JobSkillTermResolution[] = [];

  for (const inputTerm of skillTerms) {
    const resolved = await resolveTerm(inputTerm);
    terms.push(toTermResolution(inputTerm, resolved));
  }

  const unresolvedTerms: string[] = [];
  for (const term of terms) {
    if (term.status === JOB_SKILL_RESOLUTION_STATUS.UNRESOLVED) {
      uniquePush(unresolvedTerms, term.inputTerm);
    }
  }

  return {
    observationId,
    terms,
    resolvedSkills: collapseResolvedSkills(terms),
    unresolvedTerms,
    dedupStatus: input.dedupStatus ?? null,
    freshnessStatus: input.freshnessStatus ?? null,
  };
}
