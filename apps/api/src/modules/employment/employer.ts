import type { EmployerInsightRow } from "./contract";
import {
  classifyOutcomeConfidence,
  type ResolvedOutcomeGroup,
} from "./outcomes";
import { OUTCOME_TYPE, EMPLOYMENT_METHODOLOGY_VERSION } from "./policy";
import { summarizeSkillUtilization } from "./skill-utilization";
import { computeTimeToEmployment } from "./time-to-employment";
import {
  EMPLOYMENT_CONFIDENCE,
  type EmploymentConfidence,
} from "./policy";

function employerKey(g: ResolvedOutcomeGroup): string {
  const p = g.primary;
  if (p.employerId) return `id:${p.employerId}`;
  if (p.employerName) return `name:${p.employerName}`;
  return "unknown";
}

/**
 * Employer intelligence from observed employment outcomes.
 * Not a ranking. Organization EMPLOYER reused when employerId present.
 */
export function buildEmployerInsights(
  groups: readonly ResolvedOutcomeGroup[],
  rankLimit: number,
): EmployerInsightRow[] {
  const byKey = new Map<string, ResolvedOutcomeGroup[]>();
  for (const g of groups) {
    if (
      g.primary.outcomeType !== OUTCOME_TYPE.EMPLOYED &&
      g.primary.outcomeType !== OUTCOME_TYPE.PLACED
    ) {
      continue;
    }
    const key = employerKey(g);
    const list = byKey.get(key) ?? [];
    list.push(g);
    byKey.set(key, list);
  }

  const rows: EmployerInsightRow[] = [];
  for (const [, members] of byKey) {
    const primary = members[0]!.primary;
    const employedCount = members.filter(
      (m) => m.primary.outcomeType === OUTCOME_TYPE.EMPLOYED,
    ).length;
    const placedCount = members.filter(
      (m) => m.primary.outcomeType === OUTCOME_TYPE.PLACED,
    ).length;
    const programIds = unique(
      members.map((m) => m.primary.courseId).filter(Boolean) as string[],
    );
    const occupationIds = unique(
      members
        .map((m) => m.primary.occupationId)
        .filter(Boolean) as string[],
    );
    const employmentSkillIds = unique(
      members.flatMap((m) => m.primary.employmentSkillIds),
    );
    const tte = computeTimeToEmployment(members);
    const skillUtilization = summarizeSkillUtilization(members);
    const confidences = members.map((m) =>
      classifyOutcomeConfidence(m.primary),
    );
    const confidence = worstConfidence(confidences);

    rows.push({
      employerId: primary.employerId,
      employerName: primary.employerName,
      employedCount,
      placedCount,
      programIds,
      occupationIds,
      employmentSkillIds,
      medianTimeToEmploymentDays: tte.medianDays,
      skillUtilization,
      confidence,
      evidence: {
        observationIds: members.map((m) => m.primary.observationId).sort(),
        sourceIds: unique(
          members
            .map((m) => m.primary.sourceId)
            .filter(Boolean) as string[],
        ),
      },
      notes: [
        "Employer insight is observational — not a best/top employer ranking.",
      ],
      policyVersion: EMPLOYMENT_METHODOLOGY_VERSION,
    });
  }

  return rows
    .sort((a, b) => {
      if (b.employedCount !== a.employedCount) {
        return b.employedCount - a.employedCount;
      }
      return (a.employerName ?? a.employerId ?? "").localeCompare(
        b.employerName ?? b.employerId ?? "",
      );
    })
    .slice(0, rankLimit);
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

function worstConfidence(
  parts: EmploymentConfidence[],
): EmploymentConfidence {
  const order: EmploymentConfidence[] = [
    EMPLOYMENT_CONFIDENCE.UNKNOWN,
    EMPLOYMENT_CONFIDENCE.LOW,
    EMPLOYMENT_CONFIDENCE.MEDIUM,
    EMPLOYMENT_CONFIDENCE.HIGH,
  ];
  let worstIdx = order.length - 1;
  for (const p of parts) {
    const idx = order.indexOf(p);
    if (idx >= 0 && idx < worstIdx) worstIdx = idx;
  }
  return parts.length === 0
    ? EMPLOYMENT_CONFIDENCE.UNKNOWN
    : order[worstIdx]!;
}
