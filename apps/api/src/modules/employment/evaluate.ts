import { inferGeographyLevel } from "../gaps/comparability";
import type { GapGeographyRef } from "../gaps/contract";
import type { TrainingProgramView } from "../training/contract";
import { CURRICULUM_COVERAGE_STATUS } from "../training/policy";
import type {
  EmploymentIntelligenceSummary,
  EmploymentOutcomeObservation,
} from "./contract";
import {
  EMPLOYMENT_EVIDENCE_TYPE,
  OUTCOME_STATUS,
  OUTCOME_TYPE,
} from "./policy";
import { summarizeEmploymentIntelligence } from "./summary";

export const EMPLOYMENT_EVALUATION_DATA_CLASSIFICATION =
  "SYNTHETIC EVALUATION DATA";
export const EMPLOYMENT_EVALUATION_DATA_NOT_REAL =
  "NOT REAL LABOUR-MARKET EVIDENCE";

export type EmploymentEvaluationExpected = {
  employed?: number;
  placed?: number;
  trained?: number;
  certified?: number;
  uniqueLearners?: number;
  trainingToEmploymentNull?: boolean;
  trainingToEmploymentApprox?: number;
  utilizationLevel?: string;
  timeToEmploymentMedian?: number;
  rejectedInvalid?: number;
  conflictGroups?: number;
  employerCount?: number;
  alignment?: string;
  confidence?: string;
};

export type EmploymentEvaluationCase = {
  id: string;
  label: string;
  expected: EmploymentEvaluationExpected;
  _builder: string;
};

export type EmploymentEvaluationDataset = {
  classification: string;
  note: string;
  cases: EmploymentEvaluationCase[];
};

export function isEmploymentEvaluationDataset(
  value: unknown,
): value is EmploymentEvaluationDataset {
  if (!value || typeof value !== "object") return false;
  const row = value as EmploymentEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
}

const PERIOD = {
  from: "2026-08-01T00:00:00.000Z",
  to: "2026-09-01T00:00:00.000Z",
  dateField: "postedAt" as const,
};

function geo(state = "EvalState", district?: string): GapGeographyRef {
  return inferGeographyLevel({
    locationId: null,
    country: "IN",
    state,
    district: district ?? null,
    city: null,
    known: true,
  });
}

export function makeObservation(
  partial: Partial<EmploymentOutcomeObservation> & {
    observationId: string;
    outcomeType: EmploymentOutcomeObservation["outcomeType"];
  },
): EmploymentOutcomeObservation {
  return {
    observationId: partial.observationId,
    learnerId: partial.learnerId ?? null,
    courseId: partial.courseId ?? null,
    instituteId: partial.instituteId ?? null,
    employerId: partial.employerId ?? null,
    employerName: partial.employerName ?? null,
    trainedSkillIds: partial.trainedSkillIds ?? [],
    employmentSkillIds: partial.employmentSkillIds ?? [],
    outcomeType: partial.outcomeType,
    outcomeStatus: partial.outcomeStatus ?? OUTCOME_STATUS.REPORTED,
    trainingCompletionDate: partial.trainingCompletionDate ?? null,
    outcomeDate: partial.outcomeDate ?? null,
    employmentStartDate: partial.employmentStartDate ?? null,
    employmentEndDate: partial.employmentEndDate ?? null,
    geography: partial.geography ?? geo(),
    occupationId: partial.occupationId ?? null,
    sourceId: partial.sourceId ?? "src-eval",
    evidenceType: partial.evidenceType ?? EMPLOYMENT_EVIDENCE_TYPE.INSTITUTE_REPORT,
    evidenceId: partial.evidenceId ?? null,
    observedAt: partial.observedAt ?? "2026-08-20T10:00:00.000Z",
    notes: partial.notes,
  };
}

function makeProgram(
  partial: Partial<TrainingProgramView> & {
    programId: string;
    courseId: string;
    courseName: string;
  },
): TrainingProgramView {
  return {
    programId: partial.programId,
    curriculumId: partial.curriculumId ?? partial.programId,
    courseId: partial.courseId,
    courseName: partial.courseName,
    curriculumTitle: partial.curriculumTitle ?? partial.courseName,
    curriculumVersion: "1",
    organizationId: partial.organizationId ?? "org-inst",
    organizationName: partial.organizationName ?? "Eval Institute",
    occupationId: null,
    sectorId: null,
    status: "ACTIVE",
    isDemo: true,
    skills: partial.skills ?? [],
  };
}

function skill(id: string, name: string) {
  return {
    skillId: id,
    canonicalName: name,
    name,
    coverage: CURRICULUM_COVERAGE_STATUS.FULL,
    importance: null,
  };
}

export type BuiltEmploymentCase = {
  observations: EmploymentOutcomeObservation[];
  previous?: EmploymentOutcomeObservation[];
  programs: TrainingProgramView[];
  linkageAvailable: boolean;
  summary: EmploymentIntelligenceSummary;
};

export function buildEmploymentEvaluationCase(
  c: EmploymentEvaluationCase,
): BuiltEmploymentCase {
  switch (c._builder) {
    case "confirmed-employment": {
      const observations = [
        makeObservation({
          observationId: "e1",
          learnerId: "L1",
          courseId: "course-fs",
          employerId: "emp-1",
          employerName: "Employer One",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          evidenceType: EMPLOYMENT_EVIDENCE_TYPE.OFFICIAL_RECORD,
          evidenceId: "ev-1",
          trainedSkillIds: ["skill-react", "skill-node"],
          employmentSkillIds: ["skill-react", "skill-node"],
          trainingCompletionDate: "2026-06-01T00:00:00.000Z",
          employmentStartDate: "2026-07-01T00:00:00.000Z",
        }),
      ];
      return finish(observations, [
        makeProgram({
          programId: "prog-fs",
          courseId: "course-fs",
          courseName: "Full Stack",
          skills: [skill("skill-react", "React"), skill("skill-node", "Node.js")],
        }),
      ]);
    }
    case "reported-placement": {
      const observations = [
        makeObservation({
          observationId: "p1",
          learnerId: "L2",
          courseId: "course-fs",
          outcomeType: OUTCOME_TYPE.PLACED,
          outcomeStatus: OUTCOME_STATUS.REPORTED,
          evidenceType: EMPLOYMENT_EVIDENCE_TYPE.INSTITUTE_REPORT,
        }),
      ];
      return finish(observations, []);
    }
    case "trained-only": {
      const observations = [
        makeObservation({
          observationId: "t1",
          learnerId: "L3",
          courseId: "course-fs",
          outcomeType: OUTCOME_TYPE.TRAINED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          trainedSkillIds: ["skill-python"],
        }),
      ];
      return finish(observations, []);
    }
    case "partial-utilization": {
      const observations = [
        makeObservation({
          observationId: "u1",
          learnerId: "L4",
          courseId: "course-fs",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          evidenceType: EMPLOYMENT_EVIDENCE_TYPE.EMPLOYER_REPORT,
          trainedSkillIds: [
            "skill-react",
            "skill-node",
            "skill-pg",
            "skill-docker",
          ],
          employmentSkillIds: ["skill-react", "skill-node"],
          trainingCompletionDate: "2026-05-01T00:00:00.000Z",
          employmentStartDate: "2026-06-15T00:00:00.000Z",
        }),
      ];
      return finish(observations, [
        makeProgram({
          programId: "prog-fs",
          courseId: "course-fs",
          courseName: "Full Stack",
          skills: [
            skill("skill-react", "React"),
            skill("skill-node", "Node.js"),
            skill("skill-pg", "PostgreSQL"),
            skill("skill-docker", "Docker"),
          ],
        }),
      ]);
    }
    case "no-employment-skills": {
      const observations = [
        makeObservation({
          observationId: "ns1",
          learnerId: "L5",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.REPORTED,
          trainedSkillIds: ["skill-java"],
          employmentSkillIds: [],
        }),
      ];
      return finish(observations, []);
    }
    case "zero-denominator": {
      return finish([], [], true);
    }
    case "missing-linkage": {
      const observations = [
        makeObservation({
          observationId: "ml1",
          learnerId: "L6",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
      ];
      return finish(observations, [], false);
    }
    case "duplicate-obs": {
      const observations = [
        makeObservation({
          observationId: "dup",
          learnerId: "L7",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
        makeObservation({
          observationId: "dup",
          learnerId: "L7",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
      ];
      return finish(observations, []);
    }
    case "conflict-obs": {
      const observations = [
        makeObservation({
          observationId: "c1",
          learnerId: "L8",
          outcomeType: OUTCOME_TYPE.PLACED,
          outcomeStatus: OUTCOME_STATUS.REPORTED,
        }),
        makeObservation({
          observationId: "c2",
          learnerId: "L8",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          evidenceType: EMPLOYMENT_EVIDENCE_TYPE.OFFICIAL_RECORD,
        }),
      ];
      return finish(observations, []);
    }
    case "multi-employer": {
      const observations = [
        makeObservation({
          observationId: "me1",
          learnerId: "LA",
          employerId: "emp-a",
          employerName: "Alpha Co",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
        makeObservation({
          observationId: "me2",
          learnerId: "LB",
          employerId: "emp-b",
          employerName: "Beta Co",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
      ];
      return finish(observations, []);
    }
    case "multi-program": {
      const observations = [
        makeObservation({
          observationId: "mp1",
          learnerId: "LC",
          courseId: "course-a",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          trainedSkillIds: ["skill-python"],
          employmentSkillIds: ["skill-python"],
        }),
        makeObservation({
          observationId: "mp2",
          learnerId: "LD",
          courseId: "course-b",
          outcomeType: OUTCOME_TYPE.TRAINED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          trainedSkillIds: ["skill-sql"],
        }),
      ];
      return finish(observations, [
        makeProgram({
          programId: "pa",
          courseId: "course-a",
          courseName: "Python Prog",
          skills: [skill("skill-python", "Python")],
        }),
        makeProgram({
          programId: "pb",
          courseId: "course-b",
          courseName: "SQL Prog",
          skills: [skill("skill-sql", "SQL")],
        }),
      ]);
    }
    case "negative-duration": {
      const observations = [
        makeObservation({
          observationId: "nd1",
          learnerId: "LE",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          trainingCompletionDate: "2026-08-01T00:00:00.000Z",
          employmentStartDate: "2026-07-01T00:00:00.000Z",
        }),
      ];
      return finish(observations, []);
    }
    case "java-vs-js": {
      const observations = [
        makeObservation({
          observationId: "jj1",
          learnerId: "LF",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          trainedSkillIds: ["skill-java"],
          employmentSkillIds: ["skill-javascript"],
        }),
      ];
      return finish(observations, []);
    }
    case "geo-state": {
      const observations = [
        makeObservation({
          observationId: "g1",
          learnerId: "LG",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
          geography: geo("EvalState", "Pune"),
        }),
      ];
      return finish(observations, []);
    }
    case "certified-employed": {
      const observations = [
        makeObservation({
          observationId: "ce1",
          learnerId: "LH",
          outcomeType: OUTCOME_TYPE.CERTIFIED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
        makeObservation({
          observationId: "ce2",
          learnerId: "LI",
          outcomeType: OUTCOME_TYPE.EMPLOYED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
        makeObservation({
          observationId: "ce3",
          learnerId: "LI",
          outcomeType: OUTCOME_TYPE.CERTIFIED,
          outcomeStatus: OUTCOME_STATUS.CONFIRMED,
        }),
      ];
      return finish(observations, []);
    }
    default:
      throw new Error(`Unknown employment evaluation builder: ${c._builder}`);
  }
}

function finish(
  observations: EmploymentOutcomeObservation[],
  programs: TrainingProgramView[],
  linkageAvailable = true,
  previous?: EmploymentOutcomeObservation[],
): BuiltEmploymentCase {
  const summary = summarizeEmploymentIntelligence({
    observations,
    previousObservations: previous,
    period: PERIOD,
    programs,
    cohort: { linkageAvailable },
  });
  return { observations, previous, programs, linkageAvailable, summary };
}

export function checkEmploymentEvaluationCase(
  c: EmploymentEvaluationCase,
  built: BuiltEmploymentCase,
): string[] {
  const failures: string[] = [];
  const { expected } = c;
  const s = built.summary;

  if (expected.employed !== undefined && s.totals.employed !== expected.employed) {
    failures.push(`employed expected ${expected.employed}, got ${s.totals.employed}`);
  }
  if (expected.placed !== undefined && s.totals.placed !== expected.placed) {
    failures.push(`placed expected ${expected.placed}, got ${s.totals.placed}`);
  }
  if (expected.trained !== undefined && s.totals.trained !== expected.trained) {
    failures.push(`trained expected ${expected.trained}, got ${s.totals.trained}`);
  }
  if (expected.certified !== undefined && s.totals.certified !== expected.certified) {
    failures.push(`certified expected ${expected.certified}, got ${s.totals.certified}`);
  }
  if (
    expected.uniqueLearners !== undefined &&
    s.totals.uniqueLearners !== expected.uniqueLearners
  ) {
    failures.push(
      `uniqueLearners expected ${expected.uniqueLearners}, got ${s.totals.uniqueLearners}`,
    );
  }
  if (expected.trainingToEmploymentNull && s.rates.trainingToEmployment.value !== null) {
    failures.push("trainingToEmployment expected null");
  }
  if (expected.trainingToEmploymentApprox !== undefined) {
    const v = s.rates.trainingToEmployment.value;
    if (v === null || Math.abs(v - expected.trainingToEmploymentApprox) > 0.001) {
      failures.push(
        `trainingToEmployment expected ~${expected.trainingToEmploymentApprox}, got ${v}`,
      );
    }
  }
  if (expected.utilizationLevel) {
    const levels = [
      s.skillUtilization.full > 0 ? "FULL" : null,
      s.skillUtilization.partial > 0 ? "PARTIAL" : null,
      s.skillUtilization.low > 0 ? "LOW" : null,
      s.skillUtilization.none > 0 ? "NONE" : null,
      s.skillUtilization.unknown > 0 ? "UNKNOWN" : null,
    ].filter(Boolean);
    if (!levels.includes(expected.utilizationLevel)) {
      failures.push(
        `utilizationLevel expected ${expected.utilizationLevel}, got ${levels.join(",")}`,
      );
    }
  }
  if (
    expected.timeToEmploymentMedian !== undefined &&
    s.timeToEmployment.medianDays !== expected.timeToEmploymentMedian
  ) {
    failures.push(
      `timeToEmploymentMedian expected ${expected.timeToEmploymentMedian}, got ${s.timeToEmployment.medianDays}`,
    );
  }
  if (
    expected.rejectedInvalid !== undefined &&
    s.timeToEmployment.rejectedInvalid !== expected.rejectedInvalid
  ) {
    failures.push(
      `rejectedInvalid expected ${expected.rejectedInvalid}, got ${s.timeToEmployment.rejectedInvalid}`,
    );
  }
  if (
    expected.conflictGroups !== undefined &&
    s.evidenceCoverage.conflictGroups !== expected.conflictGroups
  ) {
    failures.push(
      `conflictGroups expected ${expected.conflictGroups}, got ${s.evidenceCoverage.conflictGroups}`,
    );
  }
  if (
    expected.employerCount !== undefined &&
    s.employers.length !== expected.employerCount
  ) {
    failures.push(
      `employerCount expected ${expected.employerCount}, got ${s.employers.length}`,
    );
  }
  if (expected.alignment) {
    const row = s.programs.find((p) => p.alignment === expected.alignment);
    if (!row) {
      failures.push(`alignment expected ${expected.alignment}`);
    }
  }
  return failures;
}
