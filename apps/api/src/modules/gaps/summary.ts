import type { DemandFilters, DemandGeographyFilter } from "../demand/contract";
import {
  previousPeriodOfEqualDuration,
  toDemandPeriod,
} from "../demand/period";
import { summarizeDemand, summarizeDemandFromObservations } from "../demand/summary";
import { DEMAND_METHODOLOGY_VERSION } from "../demand/policy";
import { AppError } from "../../utils/errors";
import { inferGeographyLevel } from "./comparability";
import type {
  GapGeographyRef,
  OccupationGapRow,
  SectorGapRow,
  GeographyGapRow,
  SkillGapSummary,
  SupplyObservation,
} from "./contract";
import { adaptDemandSummary, adaptDemandSkills } from "./demand-adapter";
import {
  DEFAULT_GAP_RANK_LIMIT,
  GAP_METHODOLOGY_VERSION,
  GAP_MIN_DEMAND_SAMPLE,
  GAP_MIN_SUPPLY_SAMPLE,
  GAP_SEVERITY_THRESHOLD,
  GAP_TREND_THRESHOLD,
  MAX_GAP_RANK_LIMIT,
  type SupplyType,
} from "./policy";
import { computeSkillGaps } from "./skills";
import { aggregateSupplyBySkill, normalizeSupplyObservations } from "./supply";
import { computeGapMetrics } from "./compare";
import { classifySeverity } from "./severity";
import { classifyConfidence } from "./confidence";

export type SummarizeSkillGapsInput = {
  from: Date;
  to: Date;
  /** Phase 8 demand filters (geography/source/etc.). */
  demand?: Omit<DemandFilters, "from" | "to">;
  /** Explicit supply observations (required for volume supply). */
  supplyObservations: readonly SupplyObservation[];
  /** Optional previous-period supply for trends. */
  previousSupplyObservations?: readonly SupplyObservation[];
  supplyType?: SupplyType;
  rankLimit?: number;
  /**
   * When set, skip DB demand and use in-memory Phase 8 observation summary path.
   * Used by evaluation/tests.
   */
  demandSummaryOverride?: Awaited<ReturnType<typeof summarizeDemand>>;
};

/**
 * Phase 9 skill gap summary: Phase 8 demand + supply → gap-v1.
 * Dynamic computation — does not persist SkillGap rows; does not mutate demand.
 */
export async function summarizeSkillGaps(
  input: SummarizeSkillGapsInput,
): Promise<SkillGapSummary> {
  if (!(input.from instanceof Date) || Number.isNaN(input.from.getTime())) {
    throw new AppError(400, "from must be a valid instant");
  }
  if (!(input.to instanceof Date) || Number.isNaN(input.to.getTime())) {
    throw new AppError(400, "to must be a valid instant");
  }
  if (!(input.to.getTime() > input.from.getTime())) {
    throw new AppError(400, "to must be after from");
  }

  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_GAP_RANK_LIMIT),
    MAX_GAP_RANK_LIMIT,
  );
  const previous = previousPeriodOfEqualDuration(input.from, input.to);
  const demandGeography = geographyFromFilter(input.demand?.geography ?? null);

  const demandSummary =
    input.demandSummaryOverride ??
    (await summarizeDemand({
      from: input.from,
      to: input.to,
      ...input.demand,
      rankLimit,
    }));

  const previousDemandSummary = input.demandSummaryOverride
    ? null
    : await summarizeDemand({
        from: previous.from,
        to: previous.to,
        ...input.demand,
        rankLimit,
      });

  const adapted = adaptDemandSummary(demandSummary);
  const previousAdapted = previousDemandSummary
    ? adaptDemandSummary(previousDemandSummary)
    : { signals: [] };

  const { unresolvedCount } = normalizeSupplyObservations([
    ...input.supplyObservations,
  ]);

  const supply = aggregateSupplyBySkill({
    observations: input.supplyObservations,
    supplyType: input.supplyType,
    demandGeography,
  });
  const previousSupply = aggregateSupplyBySkill({
    observations: input.previousSupplyObservations ?? [],
    supplyType: input.supplyType,
    demandGeography,
  });

  const skills = computeSkillGaps({
    demand: adapted.signals,
    supply,
    previousDemand: previousAdapted.signals,
    previousSupply,
    period: toDemandPeriod(input.from, input.to),
    demandGeography,
    rankLimit,
  });

  const demandSkillIds = new Set(adapted.signals.map((s) => s.skillId));
  const supplySkillIds = new Set(supply.map((s) => s.skillId));
  let matched = 0;
  for (const id of demandSkillIds) {
    if (supplySkillIds.has(id)) {
      matched += 1;
    }
  }

  const occupations = aggregateOccupationGaps(skills, rankLimit);
  const sectors = aggregateSectorGaps(skills, rankLimit);
  const geography = aggregateGeographyGaps(skills, rankLimit);

  const buckets = {
    shortages: 0,
    balanced: 0,
    surplus: 0,
    insufficientData: 0,
    severe: 0,
    high: 0,
    direct: 0,
    proxy: 0,
    unknownComparability: 0,
    widening: 0,
    narrowing: 0,
    stable: 0,
  };

  for (const row of skills) {
    if (row.severity === "SURPLUS") {
      buckets.surplus += 1;
    } else if (row.severity === "BALANCED") {
      buckets.balanced += 1;
    } else if (row.severity === "INSUFFICIENT_DATA") {
      buckets.insufficientData += 1;
    } else {
      buckets.shortages += 1;
    }
    if (row.severity === "SEVERE") {
      buckets.severe += 1;
    }
    if (row.severity === "HIGH") {
      buckets.high += 1;
    }
    if (row.comparability === "DIRECT") {
      buckets.direct += 1;
    } else if (row.comparability === "PROXY") {
      buckets.proxy += 1;
    } else {
      buckets.unknownComparability += 1;
    }
    if (row.trend.direction === "WIDENING") {
      buckets.widening += 1;
    } else if (row.trend.direction === "NARROWING") {
      buckets.narrowing += 1;
    } else if (row.trend.direction === "STABLE") {
      buckets.stable += 1;
    }
  }

  return {
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: adapted.demandVersion || DEMAND_METHODOLOGY_VERSION,
    period: toDemandPeriod(input.from, input.to),
    previousPeriod: toDemandPeriod(previous.from, previous.to),
    filters: {
      geography: input.demand?.geography ?? null,
      supplyType: input.supplyType ?? null,
    },
    policy: {
      minDemandSample: GAP_MIN_DEMAND_SAMPLE,
      minSupplySample: GAP_MIN_SUPPLY_SAMPLE,
      severityThresholds: { ...GAP_SEVERITY_THRESHOLD },
      trendThresholds: { ...GAP_TREND_THRESHOLD },
    },
    coverage: {
      demandSkills: demandSkillIds.size,
      supplySkills: supplySkillIds.size,
      matchedSkills: matched,
      demandOnlySkills: [...demandSkillIds].filter((id) => !supplySkillIds.has(id))
        .length,
      supplyOnlySkills: [...supplySkillIds].filter((id) => !demandSkillIds.has(id))
        .length,
      unresolvedSupplyObservations: unresolvedCount,
    },
    skills,
    occupations,
    sectors,
    geography,
    buckets,
    topPriority: skills
      .filter((s) => s.metrics.shortageQuantity > 0 && s.severity !== "INSUFFICIENT_DATA")
      .slice(0, Math.min(10, rankLimit)),
    limitations: [
      "No real labour-supply volume registry exists in SkillPulse MVP.",
      "Supply observations are caller-provided (often SYNTHETIC EVALUATION DATA).",
      "TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE ≠ EMPLOYED.",
      "A numerical gap is not automatically a verified labour shortage.",
      "Interpretation depends on comparability, coverage, quality, and data availability.",
      "Phase 9 does not produce recommendations, curriculum advice, or forecasts.",
    ],
    notes: [
      ...demandSummary.notes.slice(0, 3),
      "gap-v1 consumes Phase 8 demand-v1 without recomputing demand.",
    ],
  };
}

/**
 * Pure in-memory path for evaluation/tests using Phase 8 observation summarizer.
 */
export function summarizeSkillGapsFromParts(input: {
  from: Date;
  to: Date;
  demandCurrent: Parameters<typeof summarizeDemandFromObservations>[0]["current"];
  demandPrevious: Parameters<typeof summarizeDemandFromObservations>[0]["previous"];
  weightedEligibleJobs: number;
  supplyObservations: readonly SupplyObservation[];
  previousSupplyObservations?: readonly SupplyObservation[];
  supplyType?: SupplyType;
  geography?: DemandGeographyFilter | null;
  rankLimit?: number;
}): SkillGapSummary {
  const demandSummary = summarizeDemandFromObservations({
    current: input.demandCurrent,
    previous: input.demandPrevious,
    from: input.from,
    to: input.to,
    weightedEligibleJobs: input.weightedEligibleJobs,
    rankLimit: input.rankLimit ?? DEFAULT_GAP_RANK_LIMIT,
  });

  // Synchronous path: reuse summarizeSkillGaps with override via async wrapper avoided —
  // call core assembly inline.
  const rankLimit = Math.min(
    Math.max(1, input.rankLimit ?? DEFAULT_GAP_RANK_LIMIT),
    MAX_GAP_RANK_LIMIT,
  );
  const previous = previousPeriodOfEqualDuration(input.from, input.to);
  const demandGeography = geographyFromFilter(input.geography ?? null);
  const adapted = adaptDemandSummary(demandSummary);
  const previousAdapted = adaptDemandSkills(
    summarizeDemandFromObservations({
      current: input.demandPrevious,
      previous: [],
      from: previous.from,
      to: previous.to,
      weightedEligibleJobs: input.demandPrevious.reduce(
        (s, o) => s + o.qualityWeight,
        0,
      ),
      rankLimit,
    }).skills,
  );

  const { unresolvedCount } = normalizeSupplyObservations([
    ...input.supplyObservations,
  ]);
  const supply = aggregateSupplyBySkill({
    observations: input.supplyObservations,
    supplyType: input.supplyType,
    demandGeography,
  });
  const previousSupply = aggregateSupplyBySkill({
    observations: input.previousSupplyObservations ?? [],
    supplyType: input.supplyType,
    demandGeography,
  });

  const skills = computeSkillGaps({
    demand: adapted.signals,
    supply,
    previousDemand: previousAdapted,
    previousSupply,
    period: toDemandPeriod(input.from, input.to),
    demandGeography,
    rankLimit,
  });

  const demandSkillIds = new Set(adapted.signals.map((s) => s.skillId));
  const supplySkillIds = new Set(supply.map((s) => s.skillId));
  let matched = 0;
  for (const id of demandSkillIds) {
    if (supplySkillIds.has(id)) {
      matched += 1;
    }
  }

  const buckets = {
    shortages: 0,
    balanced: 0,
    surplus: 0,
    insufficientData: 0,
    severe: 0,
    high: 0,
    direct: 0,
    proxy: 0,
    unknownComparability: 0,
    widening: 0,
    narrowing: 0,
    stable: 0,
  };
  for (const row of skills) {
    if (row.severity === "SURPLUS") buckets.surplus += 1;
    else if (row.severity === "BALANCED") buckets.balanced += 1;
    else if (row.severity === "INSUFFICIENT_DATA") buckets.insufficientData += 1;
    else buckets.shortages += 1;
    if (row.severity === "SEVERE") buckets.severe += 1;
    if (row.severity === "HIGH") buckets.high += 1;
    if (row.comparability === "DIRECT") buckets.direct += 1;
    else if (row.comparability === "PROXY") buckets.proxy += 1;
    else buckets.unknownComparability += 1;
    if (row.trend.direction === "WIDENING") buckets.widening += 1;
    else if (row.trend.direction === "NARROWING") buckets.narrowing += 1;
    else if (row.trend.direction === "STABLE") buckets.stable += 1;
  }

  return {
    gapVersion: GAP_METHODOLOGY_VERSION,
    demandVersion: DEMAND_METHODOLOGY_VERSION,
    period: toDemandPeriod(input.from, input.to),
    previousPeriod: toDemandPeriod(previous.from, previous.to),
    filters: {
      geography: input.geography ?? null,
      supplyType: input.supplyType ?? null,
    },
    policy: {
      minDemandSample: GAP_MIN_DEMAND_SAMPLE,
      minSupplySample: GAP_MIN_SUPPLY_SAMPLE,
      severityThresholds: { ...GAP_SEVERITY_THRESHOLD },
      trendThresholds: { ...GAP_TREND_THRESHOLD },
    },
    coverage: {
      demandSkills: demandSkillIds.size,
      supplySkills: supplySkillIds.size,
      matchedSkills: matched,
      demandOnlySkills: [...demandSkillIds].filter((id) => !supplySkillIds.has(id))
        .length,
      supplyOnlySkills: [...supplySkillIds].filter((id) => !demandSkillIds.has(id))
        .length,
      unresolvedSupplyObservations: unresolvedCount,
    },
    skills,
    occupations: aggregateOccupationGaps(skills, rankLimit),
    sectors: aggregateSectorGaps(skills, rankLimit),
    geography: aggregateGeographyGaps(skills, rankLimit),
    buckets,
    topPriority: skills
      .filter((s) => s.metrics.shortageQuantity > 0 && s.severity !== "INSUFFICIENT_DATA")
      .slice(0, Math.min(10, rankLimit)),
    limitations: [
      "In-memory gap summary (evaluation/tests).",
      "NOT official labour-market statistics.",
      "TRAINING_CAPACITY ≠ TRAINED ≠ CERTIFIED ≠ AVAILABLE_WORKFORCE.",
    ],
    notes: ["gap-v1 evaluation path"],
  };
}

function geographyFromFilter(
  filter: DemandGeographyFilter | null,
): GapGeographyRef | null {
  if (!filter) {
    return null;
  }
  return inferGeographyLevel({
    locationId: filter.locationId ?? null,
    country: filter.country ?? null,
    state: filter.state ?? null,
    district: filter.district ?? null,
    city: filter.city ?? null,
  });
}

function aggregateOccupationGaps(
  skills: SkillGapSummary["skills"],
  rankLimit: number,
): OccupationGapRow[] {
  const map = new Map<
    string,
    {
      occupationId: string;
      name: string;
      supplyType: SupplyType;
      demand: number;
      supply: number;
      skillIds: Set<string>;
      comparability: OccupationGapRow["comparability"];
      demandSample: number;
      supplySample: number;
    }
  >();

  for (const row of skills) {
    if (!row.occupationId) {
      continue;
    }
    const key = `${row.occupationId}|${row.supplyType}`;
    let acc = map.get(key);
    if (!acc) {
      acc = {
        occupationId: row.occupationId,
        name: row.occupationId,
        supplyType: row.supplyType,
        demand: 0,
        supply: 0,
        skillIds: new Set(),
        comparability: row.comparability,
        demandSample: 0,
        supplySample: 0,
      };
      map.set(key, acc);
    }
    acc.demand += row.metrics.demandQuantity;
    acc.supply += row.metrics.supplyQuantity;
    acc.skillIds.add(row.skillId);
    acc.demandSample += row.demandJobCount;
    acc.supplySample += row.supplyObservationCount;
  }

  return [...map.values()]
    .map((acc) => {
      const metrics = computeGapMetrics(acc.demand, acc.supply);
      const severity = classifySeverity({
        metrics,
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
      });
      const confidence = classifyConfidence({
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
        severity,
        supplyConfidence: null,
        demandCautionShare: 0,
      });
      return {
        occupationId: acc.occupationId,
        name: acc.name,
        supplyType: acc.supplyType,
        comparability: acc.comparability,
        metrics,
        severity,
        confidence,
        skillIds: [...acc.skillIds].sort((a, b) => a.localeCompare(b)),
      };
    })
    .sort((a, b) => {
      if (b.metrics.shortageQuantity !== a.metrics.shortageQuantity) {
        return b.metrics.shortageQuantity - a.metrics.shortageQuantity;
      }
      return a.occupationId.localeCompare(b.occupationId);
    })
    .slice(0, rankLimit);
}

function aggregateSectorGaps(
  skills: SkillGapSummary["skills"],
  rankLimit: number,
): SectorGapRow[] {
  const map = new Map<
    string,
    {
      sectorId: string;
      name: string;
      supplyType: SupplyType;
      demand: number;
      supply: number;
      skillIds: Set<string>;
      comparability: SectorGapRow["comparability"];
      demandSample: number;
      supplySample: number;
    }
  >();

  for (const row of skills) {
    if (!row.sectorId) {
      continue;
    }
    const key = `${row.sectorId}|${row.supplyType}`;
    let acc = map.get(key);
    if (!acc) {
      acc = {
        sectorId: row.sectorId,
        name: row.sectorId,
        supplyType: row.supplyType,
        demand: 0,
        supply: 0,
        skillIds: new Set(),
        comparability: row.comparability,
        demandSample: 0,
        supplySample: 0,
      };
      map.set(key, acc);
    }
    acc.demand += row.metrics.demandQuantity;
    acc.supply += row.metrics.supplyQuantity;
    acc.skillIds.add(row.skillId);
    acc.demandSample += row.demandJobCount;
    acc.supplySample += row.supplyObservationCount;
  }

  return [...map.values()]
    .map((acc) => {
      const metrics = computeGapMetrics(acc.demand, acc.supply);
      const severity = classifySeverity({
        metrics,
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
      });
      const confidence = classifyConfidence({
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
        severity,
        supplyConfidence: null,
        demandCautionShare: 0,
      });
      return {
        sectorId: acc.sectorId,
        name: acc.name,
        supplyType: acc.supplyType,
        comparability: acc.comparability,
        metrics,
        severity,
        confidence,
        skillIds: [...acc.skillIds].sort((a, b) => a.localeCompare(b)),
      };
    })
    .sort((a, b) => {
      if (b.metrics.shortageQuantity !== a.metrics.shortageQuantity) {
        return b.metrics.shortageQuantity - a.metrics.shortageQuantity;
      }
      return a.sectorId.localeCompare(b.sectorId);
    })
    .slice(0, rankLimit);
}

function aggregateGeographyGaps(
  skills: SkillGapSummary["skills"],
  rankLimit: number,
): GeographyGapRow[] {
  const map = new Map<
    string,
    {
      key: string;
      geography: GapGeographyRef;
      supplyType: SupplyType;
      demand: number;
      supply: number;
      skillIds: Set<string>;
      comparability: GeographyGapRow["comparability"];
      demandSample: number;
      supplySample: number;
    }
  >();

  for (const row of skills) {
    const key = [
      row.geography.level,
      row.geography.state ?? "",
      row.geography.district ?? "",
      row.geography.city ?? "",
      row.supplyType,
    ].join("|");
    let acc = map.get(key);
    if (!acc) {
      acc = {
        key,
        geography: row.geography,
        supplyType: row.supplyType,
        demand: 0,
        supply: 0,
        skillIds: new Set(),
        comparability: row.comparability,
        demandSample: 0,
        supplySample: 0,
      };
      map.set(key, acc);
    }
    acc.demand += row.metrics.demandQuantity;
    acc.supply += row.metrics.supplyQuantity;
    acc.skillIds.add(row.skillId);
    acc.demandSample += row.demandJobCount;
    acc.supplySample += row.supplyObservationCount;
  }

  return [...map.values()]
    .map((acc) => {
      const metrics = computeGapMetrics(acc.demand, acc.supply);
      const severity = classifySeverity({
        metrics,
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
      });
      const confidence = classifyConfidence({
        demandSample: acc.demandSample,
        supplySample: acc.supplySample,
        comparability: acc.comparability,
        severity,
        supplyConfidence: null,
        demandCautionShare: 0,
      });
      return {
        key: acc.key,
        geography: acc.geography,
        supplyType: acc.supplyType,
        comparability: acc.comparability,
        metrics,
        severity,
        confidence,
        skillCount: acc.skillIds.size,
      };
    })
    .sort((a, b) => {
      if (b.metrics.shortageQuantity !== a.metrics.shortageQuantity) {
        return b.metrics.shortageQuantity - a.metrics.shortageQuantity;
      }
      return a.key.localeCompare(b.key);
    })
    .slice(0, rankLimit);
}
