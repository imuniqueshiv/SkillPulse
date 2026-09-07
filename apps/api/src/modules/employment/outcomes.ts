import type { EmploymentOutcomeObservation } from "./contract";
import {
  EMPLOYMENT_CONFIDENCE,
  EMPLOYMENT_EVIDENCE_TYPE,
  EVIDENCE_QUALITY_POINTS,
  OUTCOME_STATUS,
  OUTCOME_STATUS_PRECEDENCE,
  OUTCOME_TYPE,
  OUTCOME_TYPE_PRECEDENCE,
  type EmploymentConfidence,
  type OutcomeStatus,
  type OutcomeType,
} from "./policy";

export type ResolvedOutcomeGroup = {
  groupKey: string;
  primary: EmploymentOutcomeObservation;
  members: EmploymentOutcomeObservation[];
  conflict: boolean;
  notes: string[];
};

/**
 * Deduplication key:
 * - Prefer learnerId + sourceId when learnerId exists
 * - Else observationId (never collapse distinct observations without identity)
 */
export function outcomeGroupKey(obs: EmploymentOutcomeObservation): string {
  if (obs.learnerId && obs.learnerId.trim()) {
    return `learner:${obs.learnerId.trim()}`;
  }
  return `obs:${obs.observationId}`;
}

export function isValidOutcomeType(v: string): v is OutcomeType {
  return Object.values(OUTCOME_TYPE).includes(v as OutcomeType);
}

export function isValidOutcomeStatus(v: string): v is OutcomeStatus {
  return Object.values(OUTCOME_STATUS).includes(v as OutcomeStatus);
}

/**
 * Deduplicate + resolve conflicts deterministically.
 * Same learner: keep strongest type/status; preserve all members as evidence.
 * Identical observationId: keep one.
 */
export function resolveOutcomeGroups(
  observations: readonly EmploymentOutcomeObservation[],
): ResolvedOutcomeGroup[] {
  const byId = new Map<string, EmploymentOutcomeObservation>();
  for (const obs of observations) {
    if (!obs.observationId?.trim()) continue;
    if (!isValidOutcomeType(obs.outcomeType)) continue;
    if (!isValidOutcomeStatus(obs.outcomeStatus)) continue;
    if (!byId.has(obs.observationId)) {
      byId.set(obs.observationId, normalizeObservation(obs));
    }
  }

  const byGroup = new Map<string, EmploymentOutcomeObservation[]>();
  for (const obs of byId.values()) {
    const key = outcomeGroupKey(obs);
    const list = byGroup.get(key) ?? [];
    list.push(obs);
    byGroup.set(key, list);
  }

  const groups: ResolvedOutcomeGroup[] = [];
  for (const [groupKey, members] of [...byGroup.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const sorted = [...members].sort(compareObservationStrength);
    const primary = sorted[0]!;
    const types = new Set(members.map((m) => m.outcomeType));
    const statuses = new Set(members.map((m) => m.outcomeStatus));
    const conflict = types.size > 1 || statuses.size > 1;
    const notes: string[] = [];
    if (conflict) {
      notes.push(
        "Conflicting observations for same identity — precedence applied; members preserved.",
      );
    }
    // Merge skill evidence onto primary for utilization
    const merged = mergeMemberEvidence(primary, members);
    groups.push({
      groupKey,
      primary: merged,
      members: sorted,
      conflict,
      notes,
    });
  }
  return groups;
}

function normalizeObservation(
  obs: EmploymentOutcomeObservation,
): EmploymentOutcomeObservation {
  return {
    ...obs,
    learnerId: obs.learnerId?.trim() || null,
    courseId: obs.courseId?.trim() || null,
    instituteId: obs.instituteId?.trim() || null,
    employerId: obs.employerId?.trim() || null,
    employerName: obs.employerName?.trim() || null,
    trainedSkillIds: uniqueSorted(obs.trainedSkillIds ?? []),
    employmentSkillIds: uniqueSorted(obs.employmentSkillIds ?? []),
    occupationId: obs.occupationId?.trim() || null,
    sourceId: obs.sourceId?.trim() || null,
    evidenceId: obs.evidenceId?.trim() || null,
  };
}

function uniqueSorted(ids: readonly string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function mergeMemberEvidence(
  primary: EmploymentOutcomeObservation,
  members: readonly EmploymentOutcomeObservation[],
): EmploymentOutcomeObservation {
  const trained = new Set(primary.trainedSkillIds);
  const employed = new Set(primary.employmentSkillIds);
  for (const m of members) {
    for (const id of m.trainedSkillIds) trained.add(id);
    for (const id of m.employmentSkillIds) employed.add(id);
  }
  return {
    ...primary,
    trainedSkillIds: [...trained].sort((a, b) => a.localeCompare(b)),
    employmentSkillIds: [...employed].sort((a, b) => a.localeCompare(b)),
    trainingCompletionDate:
      primary.trainingCompletionDate ??
      members.find((m) => m.trainingCompletionDate)?.trainingCompletionDate ??
      null,
    employmentStartDate:
      primary.employmentStartDate ??
      members.find((m) => m.employmentStartDate)?.employmentStartDate ??
      null,
    employmentEndDate:
      primary.employmentEndDate ??
      members.find((m) => m.employmentEndDate)?.employmentEndDate ??
      null,
  };
}

function compareObservationStrength(
  a: EmploymentOutcomeObservation,
  b: EmploymentOutcomeObservation,
): number {
  const typeDiff =
    (OUTCOME_TYPE_PRECEDENCE[b.outcomeType] ?? 0) -
    (OUTCOME_TYPE_PRECEDENCE[a.outcomeType] ?? 0);
  if (typeDiff !== 0) return typeDiff;
  const statusDiff =
    (OUTCOME_STATUS_PRECEDENCE[b.outcomeStatus] ?? 0) -
    (OUTCOME_STATUS_PRECEDENCE[a.outcomeStatus] ?? 0);
  if (statusDiff !== 0) return statusDiff;
  return a.observationId.localeCompare(b.observationId);
}

export function classifyOutcomeConfidence(
  obs: EmploymentOutcomeObservation,
): EmploymentConfidence {
  if (obs.outcomeStatus === OUTCOME_STATUS.UNKNOWN) {
    return EMPLOYMENT_CONFIDENCE.UNKNOWN;
  }
  const evidencePoints = obs.evidenceType
    ? (EVIDENCE_QUALITY_POINTS[obs.evidenceType] ?? 0.2)
    : 0;
  const hasDates = Boolean(
    obs.trainingCompletionDate || obs.employmentStartDate || obs.outcomeDate,
  );
  const hasSkills = obs.employmentSkillIds.length > 0;

  if (
    obs.outcomeStatus === OUTCOME_STATUS.CONFIRMED &&
    evidencePoints >= 0.75 &&
    (hasDates || hasSkills)
  ) {
    return EMPLOYMENT_CONFIDENCE.HIGH;
  }
  if (
    obs.outcomeStatus === OUTCOME_STATUS.CONFIRMED ||
    (obs.outcomeStatus === OUTCOME_STATUS.REPORTED && evidencePoints >= 0.55)
  ) {
    return EMPLOYMENT_CONFIDENCE.MEDIUM;
  }
  if (obs.outcomeStatus === OUTCOME_STATUS.UNVERIFIED) {
    return EMPLOYMENT_CONFIDENCE.LOW;
  }
  return EMPLOYMENT_CONFIDENCE.LOW;
}

export function countByType(
  groups: readonly ResolvedOutcomeGroup[],
  type: OutcomeType,
): number {
  // A learner who is EMPLOYED also counts as having progressed past TRAINED
  // only when counting their primary type — totals use exclusive primary type.
  return groups.filter((g) => g.primary.outcomeType === type).length;
}

/**
 * Inclusive progression counts:
 * employed ⊆ placed? NO — PLACED ≠ EMPLOYED.
 * Count only exact primary type for exclusive totals.
 * For "reached at least X" use hasReached.
 */
export function hasReached(
  primary: EmploymentOutcomeObservation,
  type: OutcomeType,
): boolean {
  const rank = OUTCOME_TYPE_PRECEDENCE[primary.outcomeType] ?? 0;
  const need = OUTCOME_TYPE_PRECEDENCE[type] ?? 0;
  return rank >= need;
}

export function countReached(
  groups: readonly ResolvedOutcomeGroup[],
  type: OutcomeType,
): number {
  return groups.filter((g) => hasReached(g.primary, type)).length;
}

export { EMPLOYMENT_EVIDENCE_TYPE };
