import type { DemandJobObservation } from "../demand/contract";
import { makeObs as makeDemandObs } from "../demand/evaluate";
import type { QualityEligibility } from "../quality/contract";
import type { SkillRequirementLevel } from "../intelligence/contract";
import type { SupplyObservation, SkillGapSummary } from "./contract";
import { inferGeographyLevel } from "./comparability";
import { summarizeSkillGapsFromParts } from "./summary";
import { SUPPLY_TYPE, type SupplyType } from "./policy";

export const GAP_EVALUATION_DATA_CLASSIFICATION = "SYNTHETIC EVALUATION DATA";
export const GAP_EVALUATION_DATA_NOT_MARKET = "NOT REAL LABOUR-MARKET EVIDENCE";

export type GapEvaluationExpected = {
  skillId?: string;
  supplyType?: SupplyType;
  netGap?: number;
  shortageQuantity?: number;
  severity?: string;
  confidence?: string;
  comparability?: string;
  demandSupplyRatioNull?: boolean;
  gapPercentageNull?: boolean;
  surplus?: boolean;
  trendDirection?: string;
};

export type GapEvaluationCase = {
  id: string;
  label: string;
  from: string;
  to: string;
  expected: GapEvaluationExpected;
  _builder: string;
};

export type GapEvaluationDataset = {
  classification: string;
  note: string;
  cases: GapEvaluationCase[];
};

export function isGapEvaluationDataset(
  value: unknown,
): value is GapEvaluationDataset {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as GapEvaluationDataset;
  return (
    typeof row.classification === "string" &&
    typeof row.note === "string" &&
    Array.isArray(row.cases)
  );
}

export function makeSupplyObs(input: {
  observationId: string;
  skillId: string | null;
  canonicalName?: string | null;
  quantity: number;
  supplyType: SupplyType;
  state?: string | null;
  district?: string | null;
  city?: string | null;
  occupationId?: string | null;
  sectorId?: string | null;
  periodFrom?: string;
  periodTo?: string;
  resolved?: boolean;
}): SupplyObservation {
  const geography = inferGeographyLevel({
    locationId: null,
    country: input.state ? "IN" : null,
    state: input.state ?? null,
    district: input.district ?? null,
    city: input.city ?? null,
  });
  return {
    observationId: input.observationId,
    sourceId: "src-eval-supply",
    skillId: input.skillId,
    canonicalName: input.canonicalName ?? input.skillId,
    resolved: input.resolved ?? Boolean(input.skillId),
    occupationId: input.occupationId ?? null,
    sectorId: input.sectorId ?? null,
    geography,
    periodFrom: input.periodFrom ?? "2026-08-01T00:00:00.000Z",
    periodTo: input.periodTo ?? "2026-09-01T00:00:00.000Z",
    supplyType: input.supplyType,
    quantity: input.quantity,
    confidence: null,
    evidenceId: null,
  };
}

function demandJobs(
  count: number,
  skillId: string,
  canonicalName: string,
  eligibility: QualityEligibility,
  requirement: SkillRequirementLevel,
  prefix: string,
  day: number,
): DemandJobObservation[] {
  return Array.from({ length: count }, (_, i) =>
    makeDemandObs({
      jobId: `${prefix}-${i}`,
      postedAt: new Date(Date.UTC(2026, 7, day, i % 12)).toISOString(),
      eligibility,
      skills: [{ skillId, canonicalName, requirementLevel: requirement }],
      location: {
        locationId: null,
        country: "IN",
        state: "EvalState",
        district: null,
        city: null,
        known: true,
      },
    }),
  );
}

export function buildGapEvaluationCase(
  meta: GapEvaluationCase,
): {
  from: Date;
  to: Date;
  demandCurrent: DemandJobObservation[];
  demandPrevious: DemandJobObservation[];
  supply: SupplyObservation[];
  previousSupply: SupplyObservation[];
  expected: GapEvaluationExpected;
  id: string;
} {
  const from = new Date(meta.from);
  const to = new Date(meta.to);
  const expected = meta.expected;

  switch (meta._builder) {
    case "shortage-direct": {
      const demandCurrent = demandJobs(
        8,
        "skill-python",
        "python",
        "INCLUDE",
        "REQUIRED",
        "d-cur",
        20,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious: demandJobs(
          8,
          "skill-python",
          "python",
          "INCLUDE",
          "REQUIRED",
          "d-prev",
          5,
        ),
        supply: [
          makeSupplyObs({
            observationId: "s1",
            skillId: "skill-python",
            canonicalName: "python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "s2",
            skillId: "skill-python",
            canonicalName: "python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "s3",
            skillId: "skill-python",
            canonicalName: "python",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        previousSupply: [
          makeSupplyObs({
            observationId: "s1p",
            skillId: "skill-python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "s2p",
            skillId: "skill-python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "s3p",
            skillId: "skill-python",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        expected: {
          ...expected,
          skillId: "skill-python",
          netGap: 6,
          shortageQuantity: 6,
          comparability: "DIRECT",
        },
      };
    }
    case "surplus": {
      const demandCurrent = demandJobs(
        5,
        "skill-java",
        "java",
        "INCLUDE",
        "REQUIRED",
        "sur-d",
        20,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious: [],
        supply: [
          makeSupplyObs({
            observationId: "sur-s1",
            skillId: "skill-java",
            quantity: 4,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "sur-s2",
            skillId: "skill-java",
            quantity: 4,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "sur-s3",
            skillId: "skill-java",
            quantity: 4,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        previousSupply: [],
        expected: {
          ...expected,
          skillId: "skill-java",
          surplus: true,
          severity: "SURPLUS",
        },
      };
    }
    case "zero-supply": {
      const demandCurrent = demandJobs(
        6,
        "skill-react",
        "react",
        "INCLUDE",
        "REQUIRED",
        "zs-d",
        20,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious: [],
        supply: [
          makeSupplyObs({
            observationId: "zs-s1",
            skillId: "skill-react",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "zs-s2",
            skillId: "skill-react",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "zs-s3",
            skillId: "skill-react",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        previousSupply: [],
        expected: {
          ...expected,
          skillId: "skill-react",
          demandSupplyRatioNull: true,
          shortageQuantity: 6,
        },
      };
    }
    case "proxy-training": {
      const demandCurrent = demandJobs(
        6,
        "skill-python",
        "python",
        "INCLUDE",
        "REQUIRED",
        "px-d",
        20,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious: [],
        supply: [
          makeSupplyObs({
            observationId: "px-s1",
            skillId: "skill-python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "px-s2",
            skillId: "skill-python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "px-s3",
            skillId: "skill-python",
            quantity: 1,
            supplyType: SUPPLY_TYPE.TRAINING_CAPACITY,
            state: "EvalState",
          }),
        ],
        previousSupply: [],
        expected: {
          ...expected,
          skillId: "skill-python",
          comparability: "PROXY",
        },
      };
    }
    case "unknown-type": {
      const demandCurrent = demandJobs(
        6,
        "skill-sql",
        "sql",
        "INCLUDE",
        "REQUIRED",
        "uk-d",
        20,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious: [],
        supply: [
          makeSupplyObs({
            observationId: "uk-s1",
            skillId: "skill-sql",
            quantity: 1,
            supplyType: SUPPLY_TYPE.OTHER,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "uk-s2",
            skillId: "skill-sql",
            quantity: 0,
            supplyType: SUPPLY_TYPE.OTHER,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "uk-s3",
            skillId: "skill-sql",
            quantity: 0,
            supplyType: SUPPLY_TYPE.OTHER,
            state: "EvalState",
          }),
        ],
        previousSupply: [],
        expected: {
          ...expected,
          skillId: "skill-sql",
          comparability: "UNKNOWN",
          severity: "INSUFFICIENT_DATA",
        },
      };
    }
    case "widening": {
      const demandCurrent = demandJobs(
        10,
        "skill-rise",
        "rise",
        "INCLUDE",
        "REQUIRED",
        "w-d",
        20,
      );
      const demandPrevious = demandJobs(
        6,
        "skill-rise",
        "rise",
        "INCLUDE",
        "REQUIRED",
        "w-p",
        5,
      );
      return {
        id: meta.id,
        from,
        to,
        demandCurrent,
        demandPrevious,
        supply: [
          makeSupplyObs({
            observationId: "w-s1",
            skillId: "skill-rise",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "w-s2",
            skillId: "skill-rise",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "w-s3",
            skillId: "skill-rise",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        previousSupply: [
          makeSupplyObs({
            observationId: "w-sp1",
            skillId: "skill-rise",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "w-sp2",
            skillId: "skill-rise",
            quantity: 1,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
          makeSupplyObs({
            observationId: "w-sp3",
            skillId: "skill-rise",
            quantity: 0,
            supplyType: SUPPLY_TYPE.AVAILABLE_WORKFORCE,
            state: "EvalState",
          }),
        ],
        expected: {
          ...expected,
          skillId: "skill-rise",
          trendDirection: "WIDENING",
        },
      };
    }
    default:
      return {
        id: meta.id,
        from,
        to,
        demandCurrent: [],
        demandPrevious: [],
        supply: [],
        previousSupply: [],
        expected,
      };
  }
}

export function evaluateGapCase(input: {
  id: string;
  summary: SkillGapSummary;
  expected: GapEvaluationExpected;
}): { id: string; pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const expected = input.expected;
  const row = expected.skillId
    ? input.summary.skills.find((s) => s.skillId === expected.skillId)
    : input.summary.skills[0];

  if (!row) {
    failures.push("missing skill gap row");
    return { id: input.id, pass: false, failures };
  }

  if (typeof expected.netGap === "number" && row.metrics.netGap !== expected.netGap) {
    failures.push(`netGap expected ${expected.netGap} got ${row.metrics.netGap}`);
  }
  if (
    typeof expected.shortageQuantity === "number" &&
    row.metrics.shortageQuantity !== expected.shortageQuantity
  ) {
    failures.push(
      `shortageQuantity expected ${expected.shortageQuantity} got ${row.metrics.shortageQuantity}`,
    );
  }
  if (expected.severity && row.severity !== expected.severity) {
    failures.push(`severity expected ${expected.severity} got ${row.severity}`);
  }
  if (expected.comparability && row.comparability !== expected.comparability) {
    failures.push(
      `comparability expected ${expected.comparability} got ${row.comparability}`,
    );
  }
  if (expected.demandSupplyRatioNull && row.metrics.demandSupplyRatio !== null) {
    failures.push("demandSupplyRatio should be null");
  }
  if (expected.surplus && !(row.metrics.netGap < 0 && row.severity === "SURPLUS")) {
    failures.push("expected surplus");
  }
  if (expected.trendDirection && row.trend.direction !== expected.trendDirection) {
    failures.push(
      `trend expected ${expected.trendDirection} got ${row.trend.direction}`,
    );
  }

  return { id: input.id, pass: failures.length === 0, failures };
}
