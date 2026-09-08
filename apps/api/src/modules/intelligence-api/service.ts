import { getPrisma } from "../../config/database";
import { AppError } from "../../utils/errors";
import { summarizeDemand } from "../demand";
import type { DemandGeographyFilter, DemandSummary } from "../demand/contract";
import { summarizeSkillGaps } from "../gaps";
import type { SkillGapSummary, SupplyObservation } from "../gaps/contract";
import {
  extractTrainingCapacity,
  loadTrainingPrograms,
  summarizeTrainingIntelligence,
} from "../training";
import type { TrainingIntelligenceSummary } from "../training/contract";
import {
  capacityFromSupplyObservations,
  summarizeInstituteIntelligence,
} from "../institute";
import type { InstituteIntelligenceSummary } from "../institute/contract";
import { summarizeEmploymentIntelligence } from "../employment";
import type {
  EmploymentIntelligenceSummary,
  EmploymentOutcomeObservation,
} from "../employment/contract";
import { summarizeGovernmentDecisions } from "../decision";
import type {
  DecisionSignal,
  GovernmentDecisionSummary,
} from "../decision/contract";
import {
  DECISION_CATEGORY,
  DECISION_CONFIDENCE,
  DECISION_PRIORITY,
  type DecisionCategory,
  type DecisionConfidence,
  type DecisionPriority,
} from "../decision/policy";
import {
  summarizeQualityAssessments,
  type QualitySummary,
} from "../quality/summary";
import { JOB_QUALITY_ASSESSMENT_VERSION } from "../quality/contract";
import { metaEnvelope } from "./access";
import { MAX_INTELLIGENCE_LIMIT } from "./policy";

export type IntelligenceQueryFilters = {
  from: Date;
  to: Date;
  geography?: DemandGeographyFilter;
  skillId?: string;
  occupationId?: string;
  sectorId?: string;
  rankLimit: number;
  supplyObservations?: readonly SupplyObservation[];
  employmentObservations?: readonly EmploymentOutcomeObservation[];
};

export type UpstreamIntelligenceBundle = {
  demand: DemandSummary;
  gaps: SkillGapSummary;
  training: TrainingIntelligenceSummary;
  institute: InstituteIntelligenceSummary;
  employment: EmploymentIntelligenceSummary;
  quality: QualitySummary;
  decisions: GovernmentDecisionSummary;
  limitations: string[];
};

/**
 * Single orchestration pass for Phase 14 adapters.
 * Runs each Phase 7–13 summarizer once; does not recompute their formulas.
 */
export async function loadUpstreamIntelligence(
  filters: IntelligenceQueryFilters,
): Promise<UpstreamIntelligenceBundle> {
  const rankLimit = Math.min(
    Math.max(1, filters.rankLimit),
    MAX_INTELLIGENCE_LIMIT,
  );
  const supplyObservations = filters.supplyObservations ?? [];
  const employmentObservations = filters.employmentObservations ?? [];

  const limitations: string[] = [
    "Phase 14 is a product/API adapter — it does not recompute Phase 7–13 intelligence.",
    "GET /api/v1/outcomes SAMPLE metrics are not Phase 12 employment evidence.",
  ];

  if (supplyObservations.length === 0) {
    limitations.push(
      "No labour-supply observations provided to the API — Phase 9 gaps reflect demand-only / INSUFFICIENT_DATA supply coverage.",
    );
  }
  if (employmentObservations.length === 0) {
    limitations.push(
      "No employment outcome observations provided — Phase 12 rates remain null/insufficient; do not treat zero totals as proven employment outcomes.",
    );
  }

  const [demand, quality] = await Promise.all([
    summarizeDemand({
      from: filters.from,
      to: filters.to,
      skillId: filters.skillId,
      occupationId: filters.occupationId,
      sectorId: filters.sectorId,
      geography: filters.geography,
      rankLimit,
      limit: 500,
    }),
    summarizeQualityAssessments({
      assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
    }),
  ]);

  const gaps = await summarizeSkillGaps({
    from: filters.from,
    to: filters.to,
    demand: {
      skillId: filters.skillId,
      occupationId: filters.occupationId,
      sectorId: filters.sectorId,
      geography: filters.geography,
      rankLimit,
    },
    supplyObservations,
    demandSummaryOverride: demand,
    rankLimit,
  });

  // One program load → Phase 10 → Phase 11 (no duplicate Phase 10 / N× loadTrainingPrograms).
  const programViews = await loadTrainingPrograms({
    includeDemo: true,
    limit: Math.min(Math.max(rankLimit * 4, 20), 100),
  });
  const trainingCapacityBySkill = extractTrainingCapacity(supplyObservations);
  const training = summarizeTrainingIntelligence({
    gapSummary: gaps,
    programs: programViews,
    trainingCapacityBySkill,
    rankLimit,
  });
  const institute = summarizeInstituteIntelligence({
    gapSummary: gaps,
    programs: programViews,
    trainingSummary: training,
    capacityObservations: capacityFromSupplyObservations(supplyObservations),
    rankLimit,
  });

  const employment = summarizeEmploymentIntelligence({
    observations: employmentObservations,
    period: demand.period,
    gapSummary: gaps,
    demandSummary: demand,
    trainingSummary: training,
    instituteSummary: institute,
    programs: programViews,
    cohort: { linkageAvailable: employmentObservations.length > 0 },
    rankLimit,
  });

  const decisions = summarizeGovernmentDecisions({
    period: demand.period,
    demandSummary: demand,
    gapSummary: gaps,
    trainingSummary: training,
    instituteSummary: institute,
    employmentSummary: employment,
    qualitySummary: quality,
    rankLimit,
  });

  return {
    demand,
    gaps,
    training,
    institute,
    employment,
    quality,
    decisions,
    limitations: [
      ...limitations,
      ...demand.notes.slice(0, 2),
      ...gaps.limitations.slice(0, 2),
      ...employment.limitations.slice(0, 2),
      ...decisions.limitations.slice(0, 2),
    ],
  };
}

function periodMeta(bundle: UpstreamIntelligenceBundle) {
  return {
    from: bundle.demand.period.from,
    to: bundle.demand.period.to,
    dateField: bundle.demand.period.dateField,
  };
}

function phaseVersions(bundle: UpstreamIntelligenceBundle) {
  return {
    quality: bundle.quality.assessmentVersion,
    demand: bundle.demand.demandVersion,
    gap: bundle.gaps.gapVersion,
    training: bundle.training.trainingVersion,
    institute: bundle.institute.instituteVersion,
    employment: bundle.employment.employmentVersion,
    decision: bundle.decisions.policyVersion,
  };
}

function metricOrInsufficient(
  value: number | null | undefined,
): { status: "AVAILABLE" | "INSUFFICIENT_DATA"; value: number | null } {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { status: "INSUFFICIENT_DATA", value: null };
  }
  return { status: "AVAILABLE", value };
}

function summarizeSignalRow(s: DecisionSignal) {
  return {
    signalId: s.signalId,
    priority: s.priority,
    category: s.category,
    confidence: s.confidence,
    actionType: s.actionType,
    target: {
      skillId: s.target.skillId,
      skillCanonicalName: s.target.skillCanonicalName,
      courseId: s.target.courseId,
      instituteId: s.target.instituteId,
    },
    rationale: s.rationale,
  };
}

export async function getOverviewIntelligence(
  filters: IntelligenceQueryFilters,
) {
  const bundle = await loadUpstreamIntelligence(filters);
  const highDemand = bundle.demand.skills.filter(
    (s) => s.trend.direction === "RISING" || s.weightedDemand >= 1,
  );
  const severeGaps = bundle.gaps.skills.filter(
    (s) => s.severity === "SEVERE" || s.severity === "HIGH",
  );
  const employmentRate = bundle.employment.rates.trainingToEmployment.value;
  const employmentCoverage =
    bundle.employment.evidenceCoverage.totalObservations;

  return {
    data: {
      demand: {
        status:
          bundle.demand.qualityCoverage.included +
            bundle.demand.qualityCoverage.caution >
          0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        highDemandSkillCount: highDemand.length,
        topSkills: bundle.demand.skills.slice(0, 10).map((s) => ({
          skillId: s.skillId,
          canonicalName: s.canonicalName,
          weightedDemand: s.weightedDemand,
          jobCount: s.jobCount,
          trend: s.trend.direction,
        })),
        qualityCoverage: bundle.demand.qualityCoverage,
      },
      gaps: {
        status:
          bundle.gaps.coverage.demandSkills > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        severeOrHighCount: severeGaps.length,
        insufficientDataCount: bundle.gaps.buckets.insufficientData,
        shortagesCount: bundle.gaps.buckets.shortages,
        topPriority: bundle.gaps.topPriority.slice(0, 10).map((s) => ({
          skillId: s.skillId,
          canonicalName: s.canonicalName,
          severity: s.severity,
          confidence: s.confidence,
          shortageQuantity: s.metrics.shortageQuantity,
        })),
        coverage: bundle.gaps.coverage,
      },
      training: {
        status:
          bundle.training.programs.length > 0 ||
          bundle.training.trainingNeeds.length > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        highNeedCount: bundle.training.buckets.highNeed,
        capacityGapCount: bundle.training.buckets.capacityGaps,
        weakAlignmentCount: bundle.training.buckets.weakAlignment,
        topTrainingNeeds: bundle.training.topTrainingNeeds.slice(0, 8).map((n) => ({
          skillId: n.skillId,
          canonicalName: n.canonicalName,
          trainingNeed: n.trainingNeed,
          capacityStatus: n.capacity.status,
          intervention: n.intervention,
        })),
      },
      employment: {
        status:
          employmentCoverage > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        trainingToEmployment: metricOrInsufficient(employmentRate),
        evidenceCoverage: bundle.employment.evidenceCoverage,
        note:
          employmentCoverage === 0
            ? "INSUFFICIENT_DATA — no Phase 12 employment observations available to the product API."
            : null,
      },
      decisions: {
        status:
          bundle.decisions.signals.length > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        priorityCounts: bundle.decisions.priorityCounts,
        highPriorityCount:
          bundle.decisions.priorityCounts.critical +
          bundle.decisions.priorityCounts.high,
        topSignals: bundle.decisions.signals.slice(0, 10).map(summarizeSignalRow),
      },
      dataQuality: {
        status:
          bundle.quality.total > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        totalAssessments: bundle.quality.total,
        eligibility: bundle.quality.eligibility,
        freshness: bundle.quality.freshness,
        intelligence: bundle.quality.intelligence,
      },
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: phaseVersions(bundle),
      limitations: bundle.limitations,
      dataQuality:
        bundle.quality.total > 0
          ? `${bundle.quality.eligibility.INCLUDE} INCLUDE / ${bundle.quality.eligibility.INCLUDE_WITH_CAUTION} CAUTION / ${bundle.quality.eligibility.EXCLUDE} EXCLUDE`
          : "INSUFFICIENT_DATA",
    }),
  };
}

export async function getSkillIntelligence(
  skillId: string,
  filters: IntelligenceQueryFilters,
) {
  const prisma = getPrisma();
  const skill = await prisma.skill.findFirst({
    where: {
      OR: [{ id: skillId }, { code: skillId }, { canonicalName: skillId }],
    },
    select: {
      id: true,
      code: true,
      name: true,
      canonicalName: true,
      category: true,
      skillType: true,
      status: true,
    },
  });
  if (!skill) {
    throw new AppError(404, "Skill not found");
  }

  const bundle = await loadUpstreamIntelligence({
    ...filters,
    skillId: skill.id,
  });

  const demandRow =
    bundle.demand.skills.find((s) => s.skillId === skill.id) ?? null;
  const gapRow = bundle.gaps.skills.find((s) => s.skillId === skill.id) ?? null;
  const trainingNeed =
    bundle.training.trainingNeeds.find((n) => n.skillId === skill.id) ?? null;
  const capability =
    bundle.institute.skillCapabilities.find((c) => c.skillId === skill.id) ??
    null;
  const relatedSignals = bundle.decisions.signals.filter(
    (s) => s.target.skillId === skill.id,
  );
  const trendRow =
    bundle.demand.trends.risingSkills.find((t) => t.skillId === skill.id) ??
    bundle.demand.trends.decliningSkills.find((t) => t.skillId === skill.id) ??
    bundle.demand.trends.stableSkills.find((t) => t.skillId === skill.id) ??
    demandRow;

  return {
    data: {
      skill,
      marketDemand: demandRow
        ? {
            status: "AVAILABLE" as const,
            weightedDemand: demandRow.weightedDemand,
            jobCount: demandRow.jobCount,
            jobPenetration: demandRow.jobPenetration,
            skillDemandShare: demandRow.skillDemandShare,
            requirementBreakdown: demandRow.requirementBreakdown,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      demandTrend: trendRow
        ? {
            status: "AVAILABLE" as const,
            direction: trendRow.trend.direction,
            current: trendRow.trend.current,
            previous: trendRow.trend.previous,
            growthRate: trendRow.trend.growthRate,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      skillGap: gapRow
        ? {
            status:
              gapRow.severity === "INSUFFICIENT_DATA"
                ? ("INSUFFICIENT_DATA" as const)
                : ("AVAILABLE" as const),
            severity: gapRow.severity,
            confidence: gapRow.confidence,
            comparability: gapRow.comparability,
            metrics: gapRow.metrics,
            geography: gapRow.geography,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      training: trainingNeed
        ? {
            status:
              trainingNeed.trainingNeed === "INSUFFICIENT_DATA"
                ? ("INSUFFICIENT_DATA" as const)
                : ("AVAILABLE" as const),
            trainingNeed: trainingNeed.trainingNeed,
            capacityStatus: trainingNeed.capacity.status,
            capacityQuantity: trainingNeed.capacity.quantity,
            intervention: trainingNeed.intervention,
            confidence: trainingNeed.confidence,
            programsCovering: trainingNeed.programsCovering,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      instituteCapability: capability
        ? {
            status:
              capability.capabilityStatus === "INSUFFICIENT_DATA"
                ? ("INSUFFICIENT_DATA" as const)
                : ("AVAILABLE" as const),
            capabilityStatus: capability.capabilityStatus,
            capacity: capability.capacity,
            providerCount: capability.providersCovering.length,
            programCount: capability.programsCovering.length,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      employmentOutcomes: {
        status:
          bundle.employment.evidenceCoverage.totalObservations > 0
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        skillUtilizationSummary: bundle.employment.skillUtilization,
        note: "Per-skill utilization requires Phase 12 observations with employmentSkillIds; aggregate summary shown when available.",
        rates: {
          trainingToEmployment: metricOrInsufficient(
            bundle.employment.rates.trainingToEmployment.value,
          ),
        },
      },
      decisionSignals: relatedSignals.map(summarizeSignalRow),
      evidence: relatedSignals.flatMap((s) => s.evidence).slice(0, 20),
      confidence: gapRow?.confidence ?? null,
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: phaseVersions(bundle),
      limitations: [
        ...bundle.limitations,
        "Skill identity is the canonical Skill.id — display names are not keys.",
      ],
    }),
  };
}

export async function getProgramIntelligence(
  courseId: string,
  filters: IntelligenceQueryFilters,
  scopedOrganizationId: string | null,
) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      name: true,
      description: true,
      organizationId: true,
      occupationId: true,
      sectorId: true,
      status: true,
      isDemo: true,
      durationHours: true,
      organization: { select: { id: true, name: true, type: true } },
    },
  });
  if (!course) {
    throw new AppError(404, "Program not found");
  }

  if (
    scopedOrganizationId &&
    course.organizationId !== scopedOrganizationId
  ) {
    throw new AppError(403, "Forbidden");
  }

  const [bundle, programViews] = await Promise.all([
    loadUpstreamIntelligence(filters),
    loadTrainingPrograms({ courseIds: [course.id], includeDemo: true }),
  ]);

  const programView = programViews[0] ?? null;
  const trainingProgram = programView
    ? bundle.training.programs.find((p) => p.programId === programView.programId) ??
      null
    : null;
  const instituteProgram =
    bundle.institute.programs.find((p) => p.courseId === course.id) ?? null;
  const employmentProgram =
    bundle.employment.programs.find((p) => p.courseId === course.id) ?? null;
  const relatedSignals = bundle.decisions.signals.filter(
    (s) =>
      s.target.courseId === course.id ||
      s.target.programId === programView?.programId ||
      s.target.instituteId === course.organizationId,
  );

  return {
    data: {
      program: {
        courseId: course.id,
        name: course.name,
        description: course.description,
        status: course.status,
        isDemo: course.isDemo,
        durationHours: course.durationHours,
        occupationId: course.occupationId,
        sectorId: course.sectorId,
        organization: course.organization,
        location: {
          status: "UNKNOWN" as const,
          note: "Course has no locationId — institute geography is not inferred from skill-gap geography.",
        },
      },
      curriculumSkills: (programView?.skills ?? []).map((s) => ({
        skillId: s.skillId,
        canonicalName: s.canonicalName,
        coverage: s.coverage,
      })),
      marketAlignment: trainingProgram
        ? {
            status:
              trainingProgram.alignment === "INSUFFICIENT_DATA"
                ? ("INSUFFICIENT_DATA" as const)
                : ("AVAILABLE" as const),
            alignment: trainingProgram.alignment,
            demandWeightedCoverage: trainingProgram.demandWeightedCoverage,
            curriculumGaps: trainingProgram.curriculumGaps.slice(0, 15),
          }
        : { status: "INSUFFICIENT_DATA" as const },
      instituteRelevance: instituteProgram
        ? {
            status:
              instituteProgram.relevance.level === "INSUFFICIENT_DATA"
                ? ("INSUFFICIENT_DATA" as const)
                : ("AVAILABLE" as const),
            relevance: instituteProgram.relevance,
            capacity: instituteProgram.capacity,
            confidence: instituteProgram.confidence,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      employmentOutcomes: employmentProgram
        ? {
            status:
              employmentProgram.trained + employmentProgram.employed > 0
                ? ("AVAILABLE" as const)
                : ("INSUFFICIENT_DATA" as const),
            alignment: employmentProgram.alignment,
            employmentRate: metricOrInsufficient(employmentProgram.employmentRate),
            trained: employmentProgram.trained,
            employed: employmentProgram.employed,
            medianTimeToEmploymentDays:
              employmentProgram.medianTimeToEmploymentDays,
            skillUtilization: employmentProgram.skillUtilization,
          }
        : {
            status: "INSUFFICIENT_DATA" as const,
            note: "No Phase 12 employment observations for this program.",
          },
      decisionSignals: relatedSignals.map(summarizeSignalRow),
      evidence: relatedSignals.flatMap((s) => s.evidence).slice(0, 20),
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: phaseVersions(bundle),
      limitations: bundle.limitations,
    }),
  };
}

export async function getInstituteIntelligence(
  organizationId: string,
  filters: IntelligenceQueryFilters,
  scopedOrganizationId: string | null,
) {
  if (scopedOrganizationId && scopedOrganizationId !== organizationId) {
    throw new AppError(403, "Forbidden");
  }

  const prisma = getPrisma();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      type: true,
      isDemo: true,
    },
  });
  if (!org) {
    throw new AppError(404, "Institute not found");
  }

  const bundle = await loadUpstreamIntelligence(filters);
  const provider =
    bundle.institute.providers.find((p) => p.providerId === org.id) ?? null;
  const programs = bundle.institute.programs.filter(
    (p) => p.providerId === org.id,
  );
  const relatedSignals = bundle.decisions.signals.filter(
    (s) => s.target.instituteId === org.id,
  );
  const employmentPrograms = bundle.employment.programs.filter(
    (p) => p.instituteId === org.id,
  );

  return {
    data: {
      institute: {
        ...org,
        location: {
          status: "UNKNOWN" as const,
          note: "Organization has no Location relation — geographic capability is not fabricated from skill-gap geography.",
        },
      },
      capability: provider
        ? {
            status: "AVAILABLE" as const,
            capabilityScore: provider.capabilityScore,
            confidence: provider.confidence,
            activeProgramCount: provider.activeProgramCount,
            skillsCovered: provider.skillsCovered,
            capacity: provider.capacity,
          }
        : { status: "INSUFFICIENT_DATA" as const },
      programs: programs.slice(0, filters.rankLimit).map((p) => ({
        courseId: p.courseId,
        programId: p.programId,
        courseName: p.programName,
        relevance: p.relevance,
        capacity: p.capacity,
        confidence: p.confidence,
      })),
      employmentOutcomes: {
        status:
          employmentPrograms.some(
            (p) => p.trained + p.employed + p.placed > 0,
          )
            ? ("AVAILABLE" as const)
            : ("INSUFFICIENT_DATA" as const),
        programs: employmentPrograms.slice(0, 10),
      },
      decisionSignals: relatedSignals.map(summarizeSignalRow),
      evidence: relatedSignals.flatMap((s) => s.evidence).slice(0, 20),
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: phaseVersions(bundle),
      limitations: [
        ...bundle.limitations,
        ...bundle.institute.limitations.slice(0, 3),
      ],
    }),
  };
}

export type DecisionListFilters = IntelligenceQueryFilters & {
  priority?: DecisionPriority;
  category?: DecisionCategory;
  confidence?: DecisionConfidence;
  state?: string;
  district?: string;
  offset: number;
};

export async function listDecisionSignals(filters: DecisionListFilters) {
  const rankLimit = Math.min(
    Math.max(1, filters.rankLimit),
    MAX_INTELLIGENCE_LIMIT,
  );
  const bundle = await loadUpstreamIntelligence({
    ...filters,
    rankLimit,
  });
  let signals = [...bundle.decisions.signals];

  if (filters.priority) {
    signals = signals.filter((s) => s.priority === filters.priority);
  }
  if (filters.category) {
    signals = signals.filter((s) => s.category === filters.category);
  }
  if (filters.confidence) {
    signals = signals.filter((s) => s.confidence === filters.confidence);
  }
  if (filters.skillId) {
    signals = signals.filter((s) => s.target.skillId === filters.skillId);
  }
  if (filters.state) {
    const state = filters.state.toLowerCase();
    signals = signals.filter(
      (s) => s.geography?.state?.toLowerCase() === state,
    );
  }
  if (filters.district) {
    const district = filters.district.toLowerCase();
    signals = signals.filter(
      (s) => s.geography?.district?.toLowerCase() === district,
    );
  }

  signals.sort((a, b) => {
    if (b.decisionScore?.score !== a.decisionScore?.score) {
      return (b.decisionScore?.score ?? -1) - (a.decisionScore?.score ?? -1);
    }
    return a.signalId.localeCompare(b.signalId);
  });

  const total = signals.length;
  const page = signals.slice(filters.offset, filters.offset + rankLimit);

  return {
    data: {
      signals: page.map((s) => ({
        ...summarizeSignalRow(s),
        geography: s.geography,
        decisionScore: s.decisionScore,
      })),
      priorityCounts: bundle.decisions.priorityCounts,
      categoryCounts: bundle.decisions.categoryCounts,
      evidenceCoverage: bundle.decisions.evidenceCoverage,
      pagination: {
        total,
        limit: rankLimit,
        offset: filters.offset,
        hasMore: filters.offset + rankLimit < total,
      },
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: phaseVersions(bundle),
      limitations: bundle.decisions.limitations,
    }),
  };
}

export async function getDecisionSignalDetail(
  signalId: string,
  filters: IntelligenceQueryFilters,
) {
  const bundle = await loadUpstreamIntelligence({
    ...filters,
    rankLimit: MAX_INTELLIGENCE_LIMIT,
  });
  const signal = bundle.decisions.signals.find((s) => s.signalId === signalId);
  if (!signal) {
    throw new AppError(404, "Decision signal not found");
  }

  return {
    data: {
      signal,
    },
    meta: metaEnvelope({
      period: periodMeta(bundle),
      phaseVersions: {
        ...phaseVersions(bundle),
        ...signal.phaseVersions,
      },
      limitations: signal.limitations,
    }),
  };
}

export async function getQualityIntelligence() {
  const quality = await summarizeQualityAssessments({
    assessmentVersion: JOB_QUALITY_ASSESSMENT_VERSION,
  });

  return {
    data: {
      status:
        quality.total > 0
          ? ("AVAILABLE" as const)
          : ("INSUFFICIENT_DATA" as const),
      assessmentVersion: quality.assessmentVersion,
      total: quality.total,
      eligibility: quality.eligibility,
      freshness: quality.freshness,
      intelligence: quality.intelligence,
      sourceTrust: quality.sourceTrust,
      completeness: quality.completeness,
      notes: quality.notes,
      interpretation: [
        "Employment evidence is incomplete when Phase 12 observations are absent.",
        "Decision signals involving employment should be interpreted with caution when employment coverage is insufficient.",
        "Stale freshness and EXCLUDE eligibility reduce analytical trust for demand-backed views.",
      ],
    },
    meta: metaEnvelope({
      period: {
        from: quality.assessmentVersion,
        to: quality.assessmentVersion,
        dateField: "postedAt",
      },
      phaseVersions: { quality: quality.assessmentVersion },
      limitations: [
        "Quality summary counts PROCESSED assessments only — not a labour-market period window.",
        ...quality.notes,
      ],
      dataQuality:
        quality.total > 0
          ? `${quality.total} PROCESSED assessments`
          : "INSUFFICIENT_DATA",
    }),
  };
}

export function parseDecisionPriority(raw: unknown): DecisionPriority | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") {
    throw new AppError(400, "Invalid priority");
  }
  if (!(Object.values(DECISION_PRIORITY) as string[]).includes(raw)) {
    throw new AppError(400, "Invalid priority");
  }
  return raw as DecisionPriority;
}

export function parseDecisionCategory(raw: unknown): DecisionCategory | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") {
    throw new AppError(400, "Invalid category");
  }
  if (!(Object.values(DECISION_CATEGORY) as string[]).includes(raw)) {
    throw new AppError(400, "Invalid category");
  }
  return raw as DecisionCategory;
}

export function parseDecisionConfidence(
  raw: unknown,
): DecisionConfidence | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") {
    throw new AppError(400, "Invalid confidence");
  }
  if (!(Object.values(DECISION_CONFIDENCE) as string[]).includes(raw)) {
    throw new AppError(400, "Invalid confidence");
  }
  return raw as DecisionConfidence;
}

export function parseOffset(raw: unknown): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(400, "Invalid offset");
  }
  return Math.floor(n);
}
