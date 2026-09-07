import { AppError } from "../../utils/errors";
import type {
  CohortDefinition,
  EmploymentIntelligenceInput,
  EmploymentIntelligenceSummary,
  EvidenceCoverage,
} from "./contract";
import { buildEmployerInsights } from "./employer";
import {
  certificationToEmploymentRate,
  trainingToEmploymentRate,
  trainingToPlacementRate,
} from "./metrics";
import { countByType, resolveOutcomeGroups } from "./outcomes";
import {
  DEFAULT_EMPLOYMENT_RANK_LIMIT,
  EMPLOYMENT_METHODOLOGY_VERSION,
  MAX_EMPLOYMENT_RANK_LIMIT,
  OUTCOME_STATUS,
  OUTCOME_TYPE,
} from "./policy";
import { buildProgramEmploymentInsights } from "./programs";
import { summarizeSkillUtilization } from "./skill-utilization";
import { computeTimeToEmployment } from "./time-to-employment";
import { buildEmploymentTrends } from "./trends";

/**
 * Phase 12 employer & placement intelligence (employment-v1).
 * Observational only — does not predict, rank, or recompute Phases 8–11.
 * Limited by employment outcome observations actually provided.
 */
export function summarizeEmploymentIntelligence(
  input: EmploymentIntelligenceInput,
): EmploymentIntelligenceSummary {
  if (!Array.isArray(input.observations)) {
    throw new AppError(400, "observations must be an array");
  }
  if (!input.period?.from || !input.period?.to) {
    throw new AppError(400, "period.from and period.to are required");
  }

  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_EMPLOYMENT_RANK_LIMIT),
    MAX_EMPLOYMENT_RANK_LIMIT,
  );

  const groups = resolveOutcomeGroups(input.observations);
  const linkageAvailable = input.cohort?.linkageAvailable ?? true;

  const trainedExclusive = countByType(groups, OUTCOME_TYPE.TRAINED);
  const certifiedExclusive = countByType(groups, OUTCOME_TYPE.CERTIFIED);
  const placedExclusive = countByType(groups, OUTCOME_TYPE.PLACED);
  const employedExclusive = countByType(groups, OUTCOME_TYPE.EMPLOYED);

  const trainedCohort = linkageAvailable ? groups.length : null;

  // Certified cohort = groups with an explicit CERTIFIED observation (never inferred from PLACED/EMPLOYED).
  const certifiedWithEvidence = groups.filter((g) =>
    g.members.some((m) => m.outcomeType === OUTCOME_TYPE.CERTIFIED),
  ).length;
  const certifiedDenominator =
    linkageAvailable && certifiedWithEvidence > 0
      ? certifiedWithEvidence
      : null;

  let rates = {
    trainingToPlacement: trainingToPlacementRate(
      placedExclusive,
      trainedCohort,
    ),
    trainingToEmployment: trainingToEmploymentRate(
      employedExclusive,
      trainedCohort,
    ),
    certificationToEmployment: certificationToEmploymentRate(
      employedExclusive,
      certifiedDenominator,
    ),
  };

  if (!linkageAvailable) {
    rates = {
      trainingToPlacement: trainingToPlacementRate(placedExclusive, null),
      trainingToEmployment: trainingToEmploymentRate(employedExclusive, null),
      certificationToEmployment: certificationToEmploymentRate(
        employedExclusive,
        null,
      ),
    };
  }

  const cohort: CohortDefinition = {
    description:
      input.cohort?.description ??
      "Unique learners (or observation identities) in the provided outcome set for the stated period. Rates require linkageAvailable=true. CERTIFIED is never inferred from PLACED/EMPLOYED.",
    periodFrom: input.cohort?.periodFrom ?? input.period.from,
    periodTo: input.cohort?.periodTo ?? input.period.to,
    linkageAvailable,
  };

  const phase10Map = new Map<string, string>();
  for (const p of input.trainingSummary?.programs ?? []) {
    phase10Map.set(p.programId, p.alignment);
  }

  const evidenceCoverage = buildEvidenceCoverage(groups);
  const limitations = [
    "Phase 12 is observational only — not placement prediction, ranking, or forecasting.",
    "TRAINED ≠ CERTIFIED ≠ PLACED ≠ EMPLOYED. REPORTED ≠ CONFIRMED.",
    "SkillPulse MVP has no durable learner/placement Prisma model — intelligence is limited by provided observations.",
    "Synthetic evaluation fixtures are NOT real labour-market evidence.",
    "Does not recompute Phase 8 demand, Phase 9 gaps, Phase 10 curriculum, or Phase 11 capability.",
    "Employment skills are never inferred from job titles alone.",
  ];

  if (input.observations.length === 0) {
    limitations.push(
      "No employment outcome observations provided — totals are zero; rates null where denominators missing.",
    );
  }

  return {
    employmentVersion: EMPLOYMENT_METHODOLOGY_VERSION,
    demandVersion:
      input.demandSummary?.demandVersion ??
      input.gapSummary?.demandVersion ??
      null,
    gapVersion: input.gapSummary?.gapVersion ?? null,
    trainingVersion: input.trainingSummary?.trainingVersion ?? null,
    instituteVersion: input.instituteSummary?.instituteVersion ?? null,
    period: input.period,
    cohort,
    totals: {
      trained: trainedExclusive,
      certified: certifiedExclusive,
      placed: placedExclusive,
      employed: employedExclusive,
      uniqueLearners: groups.length,
    },
    rates,
    timeToEmployment: computeTimeToEmployment(groups),
    skillUtilization: summarizeSkillUtilization(groups),
    employers: buildEmployerInsights(groups, rankLimit),
    programs: buildProgramEmploymentInsights({
      groups,
      programs: input.programs ?? [],
      phase10AlignmentByProgram: phase10Map,
      rankLimit,
    }),
    trends: buildEmploymentTrends({
      currentGroups: groups,
      previousObservations: input.previousObservations,
    }),
    evidenceCoverage,
    limitations,
    notes: [
      "employment-v1 consumes optional Phase 8–11 summaries without recomputation.",
      ...(input.gapSummary?.notes.slice(0, 1) ?? []),
    ],
  };
}

function buildEvidenceCoverage(
  groups: ReturnType<typeof resolveOutcomeGroups>,
): EvidenceCoverage {
  let withEvidence = 0;
  let confirmed = 0;
  let reported = 0;
  let unverified = 0;
  let unknown = 0;
  let withDates = 0;
  let withSkills = 0;
  let conflicts = 0;
  let totalObs = 0;

  for (const g of groups) {
    totalObs += g.members.length;
    if (g.conflict) conflicts += 1;
    for (const m of g.members) {
      if (m.evidenceId || m.evidenceType) withEvidence += 1;
      if (m.outcomeStatus === OUTCOME_STATUS.CONFIRMED) confirmed += 1;
      else if (m.outcomeStatus === OUTCOME_STATUS.REPORTED) reported += 1;
      else if (m.outcomeStatus === OUTCOME_STATUS.UNVERIFIED) unverified += 1;
      else unknown += 1;
      if (m.employmentStartDate || m.trainingCompletionDate) withDates += 1;
      if (m.employmentSkillIds.length > 0) withSkills += 1;
    }
  }

  return {
    totalObservations: totalObs,
    uniqueLearners: groups.length,
    observationsWithEvidence: withEvidence,
    confirmedOutcomes: confirmed,
    reportedOutcomes: reported,
    unverifiedOutcomes: unverified,
    unknownOutcomes: unknown,
    outcomesWithEmploymentDates: withDates,
    outcomesWithSkillEvidence: withSkills,
    conflictGroups: conflicts,
  };
}
