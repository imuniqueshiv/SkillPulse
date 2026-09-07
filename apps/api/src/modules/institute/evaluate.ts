import type { GapGeographyRef, SkillGapRow, SkillGapSummary } from "../gaps/contract";
import { GAP_METHODOLOGY_VERSION } from "../gaps/policy";
import type { TrainingProgramView } from "../training/contract";
import { CURRICULUM_COVERAGE_STATUS } from "../training/policy";
import { summarizeTrainingIntelligence } from "../training/summary";
import type {
  InstituteCapacityObservation,
  InstituteIntelligenceSummary,
} from "./contract";
import { summarizeInstituteIntelligence } from "./summary";
import { inferGeographyLevel } from "../gaps/comparability";

export const INSTITUTE_EVALUATION_DATA_CLASSIFICATION =
  "SYNTHETIC EVALUATION DATA";
export const INSTITUTE_EVALUATION_DATA_NOT_REAL =
  "NOT REAL INSTITUTE OR TRAINING CAPACITY EVIDENCE";

export type InstituteEvaluationExpected = {
  capabilityStatus?: string;
  alignment?: string;
  capacityStatus?: string;
  capacityQuantity?: number | null;
  providerCount?: number;
  programCount?: number;
  relevantProgramsMin?: number;
  inactiveExcluded?: boolean;
};

export type InstituteEvaluationCase = {
  id: string;
  label: string;
  expected: InstituteEvaluationExpected;
  _builder: string;
};

export type InstituteEvaluationDataset = {
  classification: string;
  note: string;
  cases: InstituteEvaluationCase[];
};

export function isInstituteEvaluationDataset(
  value: unknown,
): value is InstituteEvaluationDataset {
  if (!value || typeof value !== "object") return false;
  const row = value as InstituteEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
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
      demandQuantity: 20,
      supplyQuantity: 4,
      netGap: 16,
      shortageQuantity: 16,
      demandSupplyRatio: 5,
      supplyCoverageRatio: 0.2,
      gapPercentage: 80,
      zeroSupply: false,
      zeroDemand: false,
      bothZero: false,
    },
    severity: partial.severity ?? "SEVERE",
    confidence: partial.confidence ?? "HIGH",
    trend: partial.trend ?? {
      direction: "WIDENING",
      currentShortage: 16,
      previousShortage: 8,
      growthRate: 1,
      currentSample: 10,
      previousSample: 10,
      method: GAP_METHODOLOGY_VERSION,
    },
    priority: partial.priority ?? {
      score: 0.8,
      components: {
        shortageMagnitude: 0.8,
        demandMagnitude: 0.8,
        severity: 1,
        confidence: 1,
        trend: 1,
      },
      note: "eval",
    },
    geography: partial.geography ?? {
      locationId: null,
      country: "IN",
      state: "EvalState",
      district: "EvalDistrict",
      city: null,
      known: true,
      level: "DISTRICT",
    },
    period: partial.period ?? {
      from: "2026-08-16T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
      dateField: "postedAt",
    },
    demandVersion: "demand-v1",
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandJobCount: partial.demandJobCount ?? 10,
    supplyObservationCount: partial.supplyObservationCount ?? 3,
    occupationId: partial.occupationId ?? null,
    sectorId: partial.sectorId ?? null,
    evidence: partial.evidence ?? {
      demandIncludedJobs: 10,
      demandCautionJobs: 0,
      supplyObservationIds: ["s1"],
      supplySourceIds: ["src"],
    },
    notes: partial.notes ?? [],
  };
}

function makeGapSummary(skills: SkillGapRow[]): SkillGapSummary {
  return {
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: "demand-v1",
    period: skills[0]?.period ?? {
      from: "2026-08-16T00:00:00.000Z",
      to: "2026-09-01T00:00:00.000Z",
      dateField: "postedAt",
    },
    previousPeriod: {
      from: "2026-07-31T00:00:00.000Z",
      to: "2026-08-16T00:00:00.000Z",
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
      shortages: skills.filter((s) => s.metrics.shortageQuantity > 0).length,
      balanced: 0,
      surplus: 0,
      insufficientData: 0,
      severe: skills.filter((s) => s.severity === "SEVERE").length,
      high: skills.filter((s) => s.severity === "HIGH").length,
      direct: skills.length,
      proxy: 0,
      unknownComparability: 0,
      widening: skills.filter((s) => s.trend.direction === "WIDENING").length,
      narrowing: 0,
      stable: 0,
    },
    topPriority: skills.slice(0, 5),
    limitations: ["SYNTHETIC EVALUATION DATA"],
    notes: ["eval"],
  };
}

function skill(
  id: string,
  name: string,
): TrainingProgramView["skills"][number] {
  return {
    skillId: id,
    canonicalName: name,
    name,
    coverage: CURRICULUM_COVERAGE_STATUS.FULL,
    importance: null,
  };
}

function makeProgram(
  partial: Partial<TrainingProgramView> & {
    programId: string;
    courseName: string;
    organizationId: string;
  },
): TrainingProgramView {
  return {
    programId: partial.programId,
    curriculumId: partial.curriculumId ?? partial.programId,
    courseId: partial.courseId ?? `course-${partial.programId}`,
    courseName: partial.courseName,
    curriculumTitle: partial.curriculumTitle ?? partial.courseName,
    curriculumVersion: partial.curriculumVersion ?? "1",
    organizationId: partial.organizationId,
    organizationName: partial.organizationName ?? partial.organizationId,
    occupationId: partial.occupationId ?? null,
    sectorId: partial.sectorId ?? null,
    status: partial.status ?? "ACTIVE",
    isDemo: partial.isDemo ?? true,
    skills: partial.skills ?? [],
  };
}

function geo(state: string, district?: string): GapGeographyRef {
  return inferGeographyLevel({
    locationId: null,
    country: "IN",
    state,
    district: district ?? null,
    city: null,
    known: true,
  });
}

function cap(
  partial: Partial<InstituteCapacityObservation> & {
    observationId: string;
    quantity: number;
  },
): InstituteCapacityObservation {
  return {
    observationId: partial.observationId,
    quantity: partial.quantity,
    periodFrom: partial.periodFrom ?? "2026-08-16T00:00:00.000Z",
    periodTo: partial.periodTo ?? "2026-09-01T00:00:00.000Z",
    geography: partial.geography ?? geo("EvalState", "EvalDistrict"),
    providerId: partial.providerId ?? null,
    programId: partial.programId ?? null,
    skillId: partial.skillId ?? null,
    sourceId: partial.sourceId ?? "src-eval",
    evidenceId: partial.evidenceId ?? null,
    confidence: partial.confidence ?? "MEDIUM",
    aggregateGroup: partial.aggregateGroup ?? null,
    notes: partial.notes,
  };
}

export type BuiltInstituteCase = {
  gapSummary: SkillGapSummary;
  programs: TrainingProgramView[];
  capacity: InstituteCapacityObservation[];
  hasProviderProgramEvidence?: boolean;
  summary: InstituteIntelligenceSummary;
};

export function buildInstituteEvaluationCase(
  c: InstituteEvaluationCase,
): BuiltInstituteCase {
  switch (c._builder) {
    case "one-relevant-program": {
      const gaps = [
        makeGap({
          skillId: "skill-docker",
          canonicalName: "Docker",
          severity: "SEVERE",
        }),
        makeGap({
          skillId: "skill-k8s",
          canonicalName: "Kubernetes",
          severity: "HIGH",
          metrics: {
            demandQuantity: 15,
            supplyQuantity: 3,
            netGap: 12,
            shortageQuantity: 12,
            demandSupplyRatio: 5,
            supplyCoverageRatio: 0.2,
            gapPercentage: 80,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-cloud",
          courseName: "Cloud Engineering",
          organizationId: "org-a",
          organizationName: "Institute A",
          skills: [skill("skill-docker", "Docker"), skill("skill-linux", "Linux")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-1",
          quantity: 40,
          providerId: "org-a",
          programId: "prog-cloud",
          skillId: "skill-docker",
        }),
      ]);
    }
    case "multi-program-provider": {
      const gaps = [
        makeGap({ skillId: "skill-python", canonicalName: "Python", severity: "HIGH" }),
        makeGap({ skillId: "skill-sql", canonicalName: "SQL", severity: "MODERATE" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-ds",
          courseName: "Data Science",
          organizationId: "org-b",
          organizationName: "Institute B",
          skills: [skill("skill-python", "Python")],
        }),
        makeProgram({
          programId: "prog-db",
          courseName: "Database Admin",
          organizationId: "org-b",
          organizationName: "Institute B",
          skills: [skill("skill-sql", "SQL")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "multi-provider-same-skill": {
      const gaps = [
        makeGap({ skillId: "skill-react", canonicalName: "React", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-1",
          courseName: "Frontend A",
          organizationId: "org-1",
          skills: [skill("skill-react", "React")],
        }),
        makeProgram({
          programId: "prog-2",
          courseName: "Frontend B",
          organizationId: "org-2",
          skills: [skill("skill-react", "React")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "high-gap-capable": {
      const gaps = [
        makeGap({ skillId: "skill-plc", canonicalName: "PLC", severity: "SEVERE" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-ind",
          courseName: "Industrial Automation",
          organizationId: "org-ind",
          skills: [skill("skill-plc", "PLC")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-plc",
          quantity: 50,
          providerId: "org-ind",
          programId: "prog-ind",
          skillId: "skill-plc",
        }),
      ]);
    }
    case "high-gap-no-capability": {
      const gaps = [
        makeGap({
          skillId: "skill-iiot",
          canonicalName: "Industrial IoT",
          severity: "SEVERE",
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-other",
          courseName: "Basic IT",
          organizationId: "org-x",
          skills: [skill("skill-excel", "Excel")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "no-provider-data": {
      const gaps = [
        makeGap({
          skillId: "skill-aws",
          canonicalName: "AWS",
          severity: "HIGH",
        }),
      ];
      const built = finish(gaps, [], [], false);
      return built;
    }
    case "strong-align": {
      const gaps = [
        makeGap({
          skillId: "skill-python",
          canonicalName: "Python",
          severity: "HIGH",
          metrics: {
            demandQuantity: 100,
            supplyQuantity: 20,
            netGap: 80,
            shortageQuantity: 80,
            demandSupplyRatio: 5,
            supplyCoverageRatio: 0.2,
            gapPercentage: 80,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
        makeGap({
          skillId: "skill-sql",
          canonicalName: "SQL",
          severity: "HIGH",
          metrics: {
            demandQuantity: 90,
            supplyQuantity: 20,
            netGap: 70,
            shortageQuantity: 70,
            demandSupplyRatio: 4.5,
            supplyCoverageRatio: 0.22,
            gapPercentage: 78,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-full",
          courseName: "Full Stack",
          organizationId: "org-s",
          skills: [
            skill("skill-python", "Python"),
            skill("skill-sql", "SQL"),
          ],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "weak-align": {
      const gaps = [
        makeGap({
          skillId: "skill-python",
          canonicalName: "Python",
          metrics: {
            demandQuantity: 100,
            supplyQuantity: 10,
            netGap: 90,
            shortageQuantity: 90,
            demandSupplyRatio: 10,
            supplyCoverageRatio: 0.1,
            gapPercentage: 90,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
        makeGap({
          skillId: "skill-sql",
          canonicalName: "SQL",
          metrics: {
            demandQuantity: 90,
            supplyQuantity: 10,
            netGap: 80,
            shortageQuantity: 80,
            demandSupplyRatio: 9,
            supplyCoverageRatio: 0.11,
            gapPercentage: 89,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
        makeGap({
          skillId: "skill-docker",
          canonicalName: "Docker",
          metrics: {
            demandQuantity: 70,
            supplyQuantity: 5,
            netGap: 65,
            shortageQuantity: 65,
            demandSupplyRatio: 14,
            supplyCoverageRatio: 0.07,
            gapPercentage: 93,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
        makeGap({
          skillId: "skill-aws",
          canonicalName: "AWS",
          metrics: {
            demandQuantity: 60,
            supplyQuantity: 5,
            netGap: 55,
            shortageQuantity: 55,
            demandSupplyRatio: 12,
            supplyCoverageRatio: 0.08,
            gapPercentage: 92,
            zeroSupply: false,
            zeroDemand: false,
            bothZero: false,
          },
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-partial",
          courseName: "Intro Coding",
          organizationId: "org-w",
          skills: [
            skill("skill-python", "Python"),
            skill("skill-sql", "SQL"),
          ],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "known-capacity": {
      const gaps = [
        makeGap({ skillId: "skill-java", canonicalName: "Java", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-java",
          courseName: "Java Course",
          organizationId: "org-j",
          skills: [skill("skill-java", "Java")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-j",
          quantity: 25,
          providerId: "org-j",
          programId: "prog-java",
          skillId: "skill-java",
        }),
      ]);
    }
    case "unknown-capacity": {
      const gaps = [
        makeGap({ skillId: "skill-go", canonicalName: "Go", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-go",
          courseName: "Go Course",
          organizationId: "org-g",
          skills: [skill("skill-go", "Go")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "zero-capacity": {
      const gaps = [
        makeGap({ skillId: "skill-c", canonicalName: "C", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-c",
          courseName: "C Course",
          organizationId: "org-c",
          skills: [skill("skill-c", "C")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-zero",
          quantity: 0,
          providerId: "org-c",
          programId: "prog-c",
          skillId: "skill-c",
        }),
      ]);
    }
    case "capacity-aggregate": {
      const gaps = [
        makeGap({ skillId: "skill-net", canonicalName: "Networking", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-a",
          courseName: "Net A",
          organizationId: "org-n",
          skills: [skill("skill-net", "Networking")],
        }),
        makeProgram({
          programId: "prog-b",
          courseName: "Net B",
          organizationId: "org-n",
          skills: [skill("skill-net", "Networking")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-a",
          quantity: 50,
          providerId: "org-n",
          programId: "prog-a",
          skillId: "skill-net",
        }),
        cap({
          observationId: "cap-b",
          quantity: 30,
          providerId: "org-n",
          programId: "prog-b",
          skillId: "skill-net",
        }),
      ]);
    }
    case "capacity-overlap": {
      const gaps = [
        makeGap({ skillId: "skill-sec", canonicalName: "Security", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-sec",
          courseName: "Security",
          organizationId: "org-sec",
          skills: [skill("skill-sec", "Security")],
        }),
      ];
      return finish(gaps, programs, [
        cap({
          observationId: "cap-prov",
          quantity: 100,
          providerId: "org-sec",
          programId: null,
          skillId: "skill-sec",
        }),
        cap({
          observationId: "cap-prog",
          quantity: 40,
          providerId: "org-sec",
          programId: "prog-sec",
          skillId: "skill-sec",
        }),
      ]);
    }
    case "inactive-excluded": {
      const gaps = [
        makeGap({ skillId: "skill-rust", canonicalName: "Rust", severity: "HIGH" }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-active",
          courseName: "Rust Active",
          organizationId: "org-r",
          status: "ACTIVE",
          skills: [skill("skill-rust", "Rust")],
        }),
        makeProgram({
          programId: "prog-draft",
          courseName: "Rust Draft",
          organizationId: "org-r",
          status: "DRAFT",
          skills: [skill("skill-rust", "Rust")],
        }),
        makeProgram({
          programId: "prog-arch",
          courseName: "Rust Archived",
          organizationId: "org-r",
          status: "ARCHIVED",
          skills: [skill("skill-rust", "Rust")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "geo-district": {
      const gaps = [
        makeGap({
          skillId: "skill-scada",
          canonicalName: "SCADA",
          severity: "SEVERE",
          geography: geo("EvalState", "Nashik"),
        }),
        makeGap({
          skillId: "skill-iiot",
          canonicalName: "Industrial IoT",
          severity: "HIGH",
          geography: geo("EvalState", "Nashik"),
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-scada",
          courseName: "SCADA Ops",
          organizationId: "org-nk",
          skills: [skill("skill-scada", "SCADA")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    case "unresolved-no-infer": {
      // Unresolved skills are not on CurriculumSkill — programs only use canonical IDs.
      const gaps = [
        makeGap({
          skillId: "skill-java",
          canonicalName: "Java",
          severity: "HIGH",
        }),
      ];
      const programs = [
        makeProgram({
          programId: "prog-js",
          courseName: "JavaScript Bootcamp",
          organizationId: "org-js",
          // Explicit mapping is JavaScript only — must NOT count as Java
          skills: [skill("skill-javascript", "JavaScript")],
        }),
      ];
      return finish(gaps, programs, []);
    }
    default:
      throw new Error(`Unknown institute evaluation builder: ${c._builder}`);
  }
}

function finish(
  gaps: SkillGapRow[],
  programs: TrainingProgramView[],
  capacity: InstituteCapacityObservation[],
  hasProviderProgramEvidence?: boolean,
): BuiltInstituteCase {
  const gapSummary = makeGapSummary(gaps);
  const trainingSummary = summarizeTrainingIntelligence({
    gapSummary,
    programs: programs.filter((p) => p.status === "ACTIVE"),
  });
  const summary = summarizeInstituteIntelligence({
    gapSummary,
    programs,
    trainingSummary,
    capacityObservations: capacity,
    hasProviderProgramEvidence:
      hasProviderProgramEvidence ?? programs.some((p) => p.status === "ACTIVE"),
  });
  return {
    gapSummary,
    programs,
    capacity,
    hasProviderProgramEvidence,
    summary,
  };
}

export function checkInstituteEvaluationCase(
  c: InstituteEvaluationCase,
  built: BuiltInstituteCase,
): string[] {
  const failures: string[] = [];
  const { expected } = c;
  const { summary } = built;

  if (expected.capabilityStatus) {
    const match = summary.skillCapabilities.find(
      (s) => s.capabilityStatus === expected.capabilityStatus,
    );
    const row = match ?? summary.skillCapabilities[0];
    if (!row || row.capabilityStatus !== expected.capabilityStatus) {
      failures.push(
        `capabilityStatus expected ${expected.capabilityStatus}, got ${row?.capabilityStatus}`,
      );
    }
  }
  if (expected.alignment) {
    const prog = summary.programs[0];
    if (!prog || prog.alignment?.alignment !== expected.alignment) {
      failures.push(
        `alignment expected ${expected.alignment}, got ${prog?.alignment?.alignment}`,
      );
    }
  }
  if (expected.capacityStatus) {
    const row = summary.skillCapabilities[0];
    if (!row || row.capacity.status !== expected.capacityStatus) {
      failures.push(
        `capacityStatus expected ${expected.capacityStatus}, got ${row?.capacity.status}`,
      );
    }
  }
  if (expected.capacityQuantity !== undefined) {
    const row = summary.skillCapabilities[0];
    if (!row || row.capacity.quantity !== expected.capacityQuantity) {
      // For provider aggregate cases, check provider capacity
      const prov = summary.providers[0];
      if (
        expected.capacityQuantity !== null &&
        prov &&
        prov.capacity.quantity === expected.capacityQuantity
      ) {
        // ok via provider
      } else if (row?.capacity.quantity !== expected.capacityQuantity) {
        failures.push(
          `capacityQuantity expected ${expected.capacityQuantity}, got skill=${row?.capacity.quantity} provider=${prov?.capacity.quantity}`,
        );
      }
    }
  }
  if (expected.providerCount !== undefined) {
    if (summary.buckets.activeProviders !== expected.providerCount) {
      failures.push(
        `providerCount expected ${expected.providerCount}, got ${summary.buckets.activeProviders}`,
      );
    }
  }
  if (expected.programCount !== undefined) {
    if (summary.buckets.activePrograms !== expected.programCount) {
      failures.push(
        `programCount expected ${expected.programCount}, got ${summary.buckets.activePrograms}`,
      );
    }
  }
  if (expected.relevantProgramsMin !== undefined) {
    if (summary.buckets.relevantPrograms < expected.relevantProgramsMin) {
      failures.push(
        `relevantProgramsMin expected >= ${expected.relevantProgramsMin}, got ${summary.buckets.relevantPrograms}`,
      );
    }
  }
  if (expected.inactiveExcluded) {
    if (summary.programs.some((p) => !p.isActive)) {
      failures.push("inactive programs should be excluded from current capability");
    }
    if (summary.buckets.activePrograms !== 1) {
      failures.push(
        `expected 1 active program after exclusion, got ${summary.buckets.activePrograms}`,
      );
    }
  }
  return failures;
}
