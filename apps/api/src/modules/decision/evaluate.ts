import type { DemandPeriod } from "../demand/contract";
import type { SkillGapRow, SkillGapSummary } from "../gaps/contract";
import { GAP_METHODOLOGY_VERSION } from "../gaps/policy";
import { inferGeographyLevel } from "../gaps/comparability";
import type { TrainingIntelligenceSummary, TrainingNeedRow, ProgramAlignmentRow } from "../training/contract";
import { TRAINING_METHODOLOGY_VERSION } from "../training/policy";
import type { InstituteIntelligenceSummary, SkillCapabilityRow } from "../institute/contract";
import { INSTITUTE_METHODOLOGY_VERSION } from "../institute/policy";
import type { EmploymentIntelligenceSummary } from "../employment/contract";
import { EMPLOYMENT_METHODOLOGY_VERSION } from "../employment/policy";
import type { QualitySummary } from "../quality/summary";
import type { GovernmentDecisionSummary } from "./contract";
import { summarizeGovernmentDecisions } from "./summary";
import { DECISION_CATEGORY } from "./policy";

export const DECISION_EVALUATION_DATA_CLASSIFICATION =
  "SYNTHETIC EVALUATION DATA";
export const DECISION_EVALUATION_DATA_NOT_REAL =
  "Not government decision evidence. Not real labour-market evidence.";

export type DecisionEvaluationExpected = {
  hasCategory?: string;
  noCategory?: string;
  minSignals?: number;
  maxSignals?: number;
  priority?: string;
  confidence?: string;
  actionType?: string;
  insufficientData?: boolean;
};

export type DecisionEvaluationCase = {
  id: string;
  label: string;
  expected: DecisionEvaluationExpected;
  _builder: string;
};

export type DecisionEvaluationDataset = {
  classification: string;
  note: string;
  cases: DecisionEvaluationCase[];
};

export function isDecisionEvaluationDataset(
  value: unknown,
): value is DecisionEvaluationDataset {
  if (!value || typeof value !== "object") return false;
  const row = value as DecisionEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
}

const PERIOD: DemandPeriod = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
  dateField: "postedAt",
};

const OTHER_PERIOD: DemandPeriod = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-03-01T00:00:00.000Z",
  dateField: "postedAt",
};

function geo(state = "EvalState", district?: string) {
  return inferGeographyLevel({
    locationId: null,
    country: "IN",
    state,
    district: district ?? null,
    city: null,
    known: true,
  });
}

function makeGap(
  partial: Partial<SkillGapRow> & { skillId: string; canonicalName: string },
): SkillGapRow {
  return {
    skillId: partial.skillId,
    canonicalName: partial.canonicalName,
    name: partial.name ?? partial.canonicalName,
    supplyType: partial.supplyType ?? "AVAILABLE_WORKFORCE",
    comparability: partial.comparability ?? "DIRECT",
    metrics: partial.metrics ?? {
      demandQuantity: 40,
      supplyQuantity: 5,
      netGap: 35,
      shortageQuantity: 35,
      demandSupplyRatio: 8,
      supplyCoverageRatio: 0.125,
      gapPercentage: 87.5,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
    severity: partial.severity ?? "SEVERE",
    confidence: partial.confidence ?? "HIGH",
    trend: partial.trend ?? {
      direction: "WIDENING",
      currentShortage: 35,
      previousShortage: 20,
      growthRate: 0.75,
      currentSample: 10,
      previousSample: 10,
      method: GAP_METHODOLOGY_VERSION,
    },
    priority: partial.priority ?? {
      score: 0.9,
      components: {
        shortageMagnitude: 0.9,
        demandMagnitude: 0.9,
        severity: 1,
        confidence: 1,
        trend: 1,
      },
      note: "eval",
    },
    geography: partial.geography ?? geo(),
    period: partial.period ?? PERIOD,
    demandVersion: "demand-v1",
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandJobCount: partial.demandJobCount ?? 12,
    supplyObservationCount: partial.supplyObservationCount ?? 5,
    occupationId: null,
    sectorId: null,
    evidence: {
      demandIncludedJobs: 12,
      demandCautionJobs: 0,
      supplyObservationIds: ["s1"],
      supplySourceIds: ["src"],
    },
    notes: [],
  };
}

function makeGapSummary(skills: SkillGapRow[], period = PERIOD): SkillGapSummary {
  return {
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    period,
    previousPeriod: {
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-08-01T00:00:00.000Z",
      dateField: "postedAt",
    },
    filters: { geography: null, supplyType: null },
    policy: {
      minDemandSample: 5,
      minSupplySample: 3,
      severityThresholds: { BALANCED: 0.1, MODERATE: 0.3, HIGH: 0.5 },
      trendThresholds: { WIDENING: 0.1, NARROWING: -0.1 },
    },
    coverage: {
      demandSkills: skills.length,
      supplySkills: skills.length,
      matchedSkills: skills.length,
      demandOnlySkills: 0,
      supplyOnlySkills: 0,
      unresolvedSupplyObservations: 0,
    },
    skills,
    occupations: [],
    sectors: [],
    geography: [],
    buckets: {
      shortages: skills.length,
      balanced: 0,
      surplus: 0,
      insufficientData: 0,
      severe: skills.filter((s) => s.severity === "SEVERE").length,
      high: skills.filter((s) => s.severity === "HIGH").length,
      direct: skills.length,
      proxy: 0,
      unknownComparability: 0,
      widening: 1,
      narrowing: 0,
      stable: 0,
    },
    topPriority: skills.slice(0, 3),
    limitations: ["SYNTHETIC"],
    notes: ["eval"],
  };
}

function makeTrainingNeed(skillId: string, capacityStatus: string): TrainingNeedRow {
  return {
    skillId,
    canonicalName: skillId,
    name: skillId,
    demandQuantity: 40,
    supplyQuantity: 5,
    netGap: 35,
    shortageQuantity: 35,
    gapSeverity: "SEVERE",
    gapTrend: "WIDENING",
    gapConfidence: "HIGH",
    comparability: "DIRECT",
    trainingNeed: "HIGH",
    capacity: {
      skillId,
      quantity: capacityStatus === "UNKNOWN" ? null : 2,
      status: capacityStatus as TrainingNeedRow["capacity"]["status"],
      observationCount: capacityStatus === "UNKNOWN" ? 0 : 1,
    },
    priority: {
      score: 0.8,
      components: {
        gapSeverity: 1,
        gapMagnitude: 0.8,
        demandMagnitude: 0.8,
        trend: 1,
        confidence: 1,
        capacity: 0.5,
      },
      note: "eval",
    },
    confidence: "HIGH",
    intervention: "CAPACITY_GAP",
    programsCovering: 0,
    geography: geo(),
    period: PERIOD,
    evidence: {
      gapVersion: GAP_METHODOLOGY_VERSION,
      demandVersion: "demand-v1",
      supplyObservationIds: [],
    },
    notes: [],
    policyVersion: TRAINING_METHODOLOGY_VERSION,
  };
}

function makeAlignment(
  programId: string,
  alignment: ProgramAlignmentRow["alignment"],
): ProgramAlignmentRow {
  return {
    programId,
    courseName: programId,
    curriculumTitle: programId,
    alignment,
    demandWeightedCoverage: alignment === "STRONG" ? 0.9 : alignment === "WEAK" ? 0.2 : 0.5,
    coveredWeightedDemand: 10,
    totalRelevantWeightedDemand: 50,
    coveredSkillCount: 1,
    relevantSkillCount: 4,
    highGapSkillsTotal: 2,
    highGapSkillsCovered: alignment === "STRONG" ? 2 : 0,
    highGapSkillsMissing: alignment === "STRONG" ? 0 : 2,
    curriculumGaps: [],
    confidence: "MEDIUM",
    notes: [],
    policyVersion: TRAINING_METHODOLOGY_VERSION,
  };
}

function makeTrainingSummary(
  needs: TrainingNeedRow[],
  programs: ProgramAlignmentRow[],
): TrainingIntelligenceSummary {
  return {
    trainingVersion: TRAINING_METHODOLOGY_VERSION,
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    period: PERIOD,
    trainingNeeds: needs,
    programs,
    curriculumGaps: [],
    buckets: {
      highNeed: 1,
      moderateNeed: 0,
      lowNeed: 0,
      insufficientNeed: 0,
      capacityGaps: 1,
      strongAlignment: programs.filter((p) => p.alignment === "STRONG").length,
      moderateAlignment: 0,
      weakAlignment: programs.filter((p) => p.alignment === "WEAK").length,
      insufficientAlignment: 0,
      curriculumGapCount: 0,
    },
    topTrainingNeeds: needs.slice(0, 3),
    topCurriculumGaps: [],
    limitations: ["SYNTHETIC"],
    notes: [],
  };
}

function makeCapability(
  skillId: string,
  status: SkillCapabilityRow["capabilityStatus"],
): SkillCapabilityRow {
  return {
    skillId,
    canonicalName: skillId,
    name: skillId,
    gapSeverity: "SEVERE",
    demandQuantity: 40,
    shortageQuantity: 35,
    programsCovering: status === "MISSING" ? [] : [{ programId: "p1", providerId: "org1", programName: "P1" }],
    providersCovering: status === "MISSING" ? [] : [{ providerId: "org1", providerName: "Org" }],
    capacity: {
      quantity: status === "ADEQUATE" ? 50 : null,
      status: status === "ADEQUATE" ? "AVAILABLE" : "UNKNOWN",
      observationCount: status === "ADEQUATE" ? 1 : 0,
      observationIds: [],
      additive: false,
      notes: [],
    },
    capabilityStatus: status,
    confidence: status === "INSUFFICIENT_DATA" ? "INSUFFICIENT_DATA" : "MEDIUM",
    evidence: {
      gapVersion: GAP_METHODOLOGY_VERSION,
      programCountInAnalysis: status === "INSUFFICIENT_DATA" ? 0 : 2,
      providerCountInAnalysis: status === "INSUFFICIENT_DATA" ? 0 : 1,
    },
    notes: [],
    policyVersion: INSTITUTE_METHODOLOGY_VERSION,
  };
}

function makeInstituteSummary(
  caps: SkillCapabilityRow[],
): InstituteIntelligenceSummary {
  return {
    instituteVersion: INSTITUTE_METHODOLOGY_VERSION,
    trainingVersion: TRAINING_METHODOLOGY_VERSION,
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    period: PERIOD,
    programs: [],
    providers: [],
    skillCapabilities: caps,
    geography: [],
    buckets: {
      activeProviders: 1,
      activePrograms: 2,
      relevantPrograms: 1,
      skillsCovered: 1,
      highGapWithCapability: 0,
      highGapWithoutConfirmedCapability: 1,
      capabilityAdequate: 0,
      capabilityLimited: 0,
      capabilityMissing: 1,
      capabilityInsufficientData: 0,
      capacityKnown: 0,
      capacityUnknown: 1,
    },
    topRelevantPrograms: [],
    topCapableProviders: [],
    limitations: ["SYNTHETIC"],
    notes: [],
  };
}

function makeEmploymentSummary(partial: {
  rate: number | null;
  uniqueLearners: number;
  period?: DemandPeriod;
  declining?: boolean;
}): EmploymentIntelligenceSummary {
  const period = partial.period ?? PERIOD;
  return {
    employmentVersion: EMPLOYMENT_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    gapVersion: GAP_METHODOLOGY_VERSION,
    trainingVersion: TRAINING_METHODOLOGY_VERSION,
    instituteVersion: INSTITUTE_METHODOLOGY_VERSION,
    period,
    cohort: {
      description: "eval",
      periodFrom: period.from,
      periodTo: period.to,
      linkageAvailable: true,
    },
    totals: {
      trained: partial.uniqueLearners,
      certified: 0,
      placed: 0,
      employed: Math.round((partial.rate ?? 0) * partial.uniqueLearners),
      uniqueLearners: partial.uniqueLearners,
    },
    rates: {
      trainingToPlacement: {
        value: null,
        numerator: 0,
        denominator: partial.uniqueLearners,
        note: "",
      },
      trainingToEmployment: {
        value: partial.rate,
        numerator: Math.round((partial.rate ?? 0) * partial.uniqueLearners),
        denominator: partial.uniqueLearners,
        note: "",
      },
      certificationToEmployment: {
        value: null,
        numerator: 0,
        denominator: null,
        note: "",
      },
    },
    timeToEmployment: {
      knownCount: 0,
      medianDays: null,
      averageDays: null,
      minDays: null,
      maxDays: null,
      rejectedInvalid: 0,
      notes: [],
    },
    skillUtilization: {
      knownOutcomes: 0,
      full: 0,
      partial: 0,
      low: 0,
      none: 0,
      unknown: 0,
      rate: null,
    },
    employers: [],
    programs: [],
    trends: [
      {
        metric: "employed",
        direction: partial.declining ? "DECLINING" : "STABLE",
        current: 2,
        previous: partial.declining ? 10 : 2,
        growthRate: partial.declining ? -0.8 : 0,
        currentSample: partial.uniqueLearners,
        previousSample: partial.uniqueLearners,
        note: "eval",
      },
    ],
    evidenceCoverage: {
      totalObservations: partial.uniqueLearners,
      uniqueLearners: partial.uniqueLearners,
      observationsWithEvidence: 0,
      confirmedOutcomes: 0,
      reportedOutcomes: 0,
      unverifiedOutcomes: 0,
      unknownOutcomes: 0,
      outcomesWithEmploymentDates: 0,
      outcomesWithSkillEvidence: 0,
      conflictGroups: 0,
    },
    limitations: ["SYNTHETIC"],
    notes: [],
  };
}

function makeQuality(badShare = false): QualitySummary {
  return {
    assessmentVersion: "quality-v1",
    total: 10,
    eligibility: {
      INCLUDE: badShare ? 4 : 9,
      INCLUDE_WITH_CAUTION: badShare ? 3 : 1,
      EXCLUDE: badShare ? 3 : 0,
    },
    freshness: { FRESH: 5, AGING: 3, STALE: 2, UNKNOWN: 0 },
    intelligence: { HIGH: 5, MEDIUM: 3, LOW: 2, UNKNOWN: 0 },
    sourceTrust: {
      VERIFIED: 5,
      TRUSTED: 3,
      STANDARD: 2,
      UNVERIFIED: 0,
    },
    completeness: {
      averageScore: 0.8,
      high: 5,
      medium: 3,
      low: 2,
    },
    notes: ["SYNTHETIC"],
  };
}

export type BuiltDecisionCase = {
  summary: GovernmentDecisionSummary;
};

export function buildDecisionEvaluationCase(
  c: DecisionEvaluationCase,
): BuiltDecisionCase {
  switch (c._builder) {
    case "severe-shortage": {
      const gap = makeGap({
        skillId: "skill-docker",
        canonicalName: "Docker",
        severity: "SEVERE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
        }),
      };
    }
    case "capacity-constraint": {
      const gap = makeGap({
        skillId: "skill-k8s",
        canonicalName: "Kubernetes",
        severity: "HIGH",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [makeTrainingNeed("skill-k8s", "INSUFFICIENT")],
            [],
          ),
          instituteSummary: makeInstituteSummary([
            makeCapability("skill-k8s", "LIMITED"),
          ]),
        }),
      };
    }
    case "weak-curriculum": {
      const gap = makeGap({
        skillId: "skill-react",
        canonicalName: "React",
        severity: "HIGH",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [],
            [makeAlignment("prog-weak", "WEAK")],
          ),
        }),
      };
    }
    case "strong-align-weak-emp": {
      const gap = makeGap({
        skillId: "skill-python",
        canonicalName: "Python",
        severity: "HIGH",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [],
            [makeAlignment("prog-strong", "STRONG")],
          ),
          employmentSummary: makeEmploymentSummary({
            rate: 0.2,
            uniqueLearners: 10,
          }),
        }),
      };
    }
    case "adequate-low-demand": {
      const gap = makeGap({
        skillId: "skill-cobol",
        canonicalName: "COBOL",
        severity: "SURPLUS",
        metrics: {
          demandQuantity: 2,
          supplyQuantity: 20,
          netGap: -18,
          shortageQuantity: 0,
          demandSupplyRatio: 0.1,
          supplyCoverageRatio: 10,
          gapPercentage: 0,
          zeroSupply: false,
          zeroDemand: false,
          bothZero: false,
        },
        demandJobCount: 2,
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          instituteSummary: makeInstituteSummary([
            makeCapability("skill-cobol", "ADEQUATE"),
          ]),
        }),
      };
    }
    case "data-quality": {
      const gap = makeGap({
        skillId: "skill-sql",
        canonicalName: "SQL",
        severity: "MODERATE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          qualitySummary: makeQuality(true),
        }),
      };
    }
    case "insufficient-evidence": {
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: null,
        }),
      };
    }
    case "high-priority-low-confidence": {
      const gap = makeGap({
        skillId: "skill-aws",
        canonicalName: "AWS",
        severity: "SEVERE",
        confidence: "LOW",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
        }),
      };
    }
    case "conflicting-evidence": {
      const gap = makeGap({
        skillId: "skill-java",
        canonicalName: "Java",
        severity: "SEVERE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          employmentSummary: makeEmploymentSummary({
            rate: 0.85,
            uniqueLearners: 20,
          }),
        }),
      };
    }
    case "healthy-no-false-alarm": {
      const gap = makeGap({
        skillId: "skill-excel",
        canonicalName: "Excel",
        severity: "BALANCED",
        metrics: {
          demandQuantity: 20,
          supplyQuantity: 18,
          netGap: 2,
          shortageQuantity: 2,
          demandSupplyRatio: 1.1,
          supplyCoverageRatio: 0.9,
          gapPercentage: 10,
          zeroSupply: false,
          zeroDemand: false,
          bothZero: false,
        },
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [makeTrainingNeed("skill-excel", "AVAILABLE")],
            [makeAlignment("prog-ok", "STRONG")],
          ),
          instituteSummary: makeInstituteSummary([
            makeCapability("skill-excel", "ADEQUATE"),
          ]),
          employmentSummary: makeEmploymentSummary({
            rate: 0.75,
            uniqueLearners: 15,
          }),
        }),
      };
    }
    case "incompatible-period": {
      const gap = makeGap({
        skillId: "skill-go",
        canonicalName: "Go",
        severity: "SEVERE",
        period: OTHER_PERIOD,
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap], OTHER_PERIOD),
        }),
      };
    }
    case "unknown-capacity": {
      const gap = makeGap({
        skillId: "skill-rust",
        canonicalName: "Rust",
        severity: "HIGH",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [makeTrainingNeed("skill-rust", "UNKNOWN")],
            [],
          ),
        }),
      };
    }
    case "no-institute-capability": {
      const gap = makeGap({
        skillId: "skill-iiot",
        canonicalName: "Industrial IoT",
        severity: "SEVERE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          instituteSummary: makeInstituteSummary([
            makeCapability("skill-iiot", "MISSING"),
          ]),
          trainingSummary: makeTrainingSummary(
            [makeTrainingNeed("skill-iiot", "UNAVAILABLE")],
            [],
          ),
        }),
      };
    }
    case "java-vs-js": {
      // Distinct skills — signals keyed by canonical skillId, not name substring
      const java = makeGap({
        skillId: "skill-java",
        canonicalName: "Java",
        severity: "SEVERE",
      });
      const js = makeGap({
        skillId: "skill-javascript",
        canonicalName: "JavaScript",
        severity: "BALANCED",
        metrics: {
          demandQuantity: 5,
          supplyQuantity: 5,
          netGap: 0,
          shortageQuantity: 0,
          demandSupplyRatio: 1,
          supplyCoverageRatio: 1,
          gapPercentage: 0,
          zeroSupply: false,
          zeroDemand: false,
          bothZero: false,
        },
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([java, js]),
        }),
      };
    }
    case "c-vs-cpp": {
      const c = makeGap({
        skillId: "skill-c",
        canonicalName: "C",
        severity: "HIGH",
      });
      const cpp = makeGap({
        skillId: "skill-cpp",
        canonicalName: "C++",
        severity: "BALANCED",
        metrics: {
          demandQuantity: 4,
          supplyQuantity: 4,
          netGap: 0,
          shortageQuantity: 0,
          demandSupplyRatio: 1,
          supplyCoverageRatio: 1,
          gapPercentage: 0,
          zeroSupply: false,
          zeroDemand: false,
          bothZero: false,
        },
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([c, cpp]),
          trainingSummary: makeTrainingSummary(
            [makeTrainingNeed("skill-c", "INSUFFICIENT")],
            [],
          ),
        }),
      };
    }
    case "geo-mismatch": {
      const gap = makeGap({
        skillId: "skill-plc",
        canonicalName: "PLC",
        severity: "SEVERE",
        geography: geo("EvalState", "Nashik"),
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          instituteSummary: makeInstituteSummary([
            makeCapability("skill-plc", "MISSING"),
          ]),
        }),
      };
    }
    case "persistent-employment": {
      const gap = makeGap({
        skillId: "skill-node",
        canonicalName: "Node.js",
        severity: "MODERATE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          trainingSummary: makeTrainingSummary(
            [],
            [makeAlignment("prog-node", "STRONG")],
          ),
          employmentSummary: makeEmploymentSummary({
            rate: 0.15,
            uniqueLearners: 12,
            declining: true,
          }),
        }),
      };
    }
    case "strong-demand-gap-emp": {
      // Strong demand + severe gap + strong employment — conflict, not false healthy
      const gap = makeGap({
        skillId: "skill-ts",
        canonicalName: "TypeScript",
        severity: "SEVERE",
      });
      return {
        summary: summarizeGovernmentDecisions({
          period: PERIOD,
          gapSummary: makeGapSummary([gap]),
          employmentSummary: makeEmploymentSummary({
            rate: 0.8,
            uniqueLearners: 20,
          }),
        }),
      };
    }
    default:
      throw new Error(`Unknown decision evaluation builder: ${c._builder}`);
  }
}

export function checkDecisionEvaluationCase(
  c: DecisionEvaluationCase,
  built: BuiltDecisionCase,
): string[] {
  const failures: string[] = [];
  const { expected } = c;
  const s = built.summary;

  if (expected.hasCategory) {
    if (!s.signals.some((x) => x.category === expected.hasCategory)) {
      failures.push(`missing category ${expected.hasCategory}`);
    }
  }
  if (expected.noCategory) {
    if (s.signals.some((x) => x.category === expected.noCategory)) {
      failures.push(`unexpected category ${expected.noCategory}`);
    }
  }
  if (expected.minSignals !== undefined && s.signals.length < expected.minSignals) {
    failures.push(`minSignals ${expected.minSignals}, got ${s.signals.length}`);
  }
  if (expected.maxSignals !== undefined && s.signals.length > expected.maxSignals) {
    failures.push(`maxSignals ${expected.maxSignals}, got ${s.signals.length}`);
  }
  if (expected.priority) {
    if (!s.signals.some((x) => x.priority === expected.priority)) {
      failures.push(`missing priority ${expected.priority}`);
    }
  }
  if (expected.confidence) {
    if (!s.signals.some((x) => x.confidence === expected.confidence)) {
      failures.push(`missing confidence ${expected.confidence}`);
    }
  }
  if (expected.actionType) {
    if (!s.signals.some((x) => x.actionType === expected.actionType)) {
      failures.push(`missing action ${expected.actionType}`);
    }
  }
  if (expected.insufficientData) {
    if (
      !s.signals.some(
        (x) =>
          x.priority === "INSUFFICIENT_DATA" ||
          x.confidence === "INSUFFICIENT_DATA",
      )
    ) {
      failures.push("expected INSUFFICIENT_DATA signal");
    }
  }
  // Healthy case: no TRAINING_CAPACITY / SKILL_SHORTAGE CRITICAL from balanced skill
  if (c._builder === "healthy-no-false-alarm") {
    if (
      s.signals.some(
        (x) =>
          x.category === DECISION_CATEGORY.SKILL_SHORTAGE ||
          x.category === DECISION_CATEGORY.TRAINING_CAPACITY ||
          x.category === DECISION_CATEGORY.EMPLOYMENT_OUTCOME,
      )
    ) {
      failures.push("healthy case should not emit shortage/capacity/employment intervention signals");
    }
  }
  if (c._builder === "java-vs-js") {
    const javaSig = s.signals.find(
      (x) => x.target.skillId === "skill-java" && x.category === "SKILL_SHORTAGE",
    );
    const jsSig = s.signals.find(
      (x) =>
        x.target.skillId === "skill-javascript" &&
        x.category === "SKILL_SHORTAGE",
    );
    if (!javaSig) failures.push("Java should have shortage signal");
    if (jsSig) failures.push("JavaScript must not inherit Java shortage");
  }
  return failures;
}
