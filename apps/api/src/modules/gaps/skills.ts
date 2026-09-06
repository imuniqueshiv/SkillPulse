import type { DemandPeriod } from "../demand/contract";
import { DEMAND_METHODOLOGY_VERSION } from "../demand/policy";
import { computeGapMetrics } from "./compare";
import { classifyConfidence } from "./confidence";
import type {
  GapDemandSignal,
  GapGeographyRef,
  SkillGapRow,
  SupplySkillAggregate,
} from "./contract";
import { GAP_METHODOLOGY_VERSION } from "./policy";
import { compareGapRows, computePriorityScore } from "./priority";
import { classifySeverity } from "./severity";
import { classifyGapTrend } from "./trends";

export function computeSkillGaps(input: {
  demand: readonly GapDemandSignal[];
  supply: readonly SupplySkillAggregate[];
  previousDemand?: readonly GapDemandSignal[];
  previousSupply?: readonly SupplySkillAggregate[];
  period: DemandPeriod;
  demandGeography: GapGeographyRef | null;
  rankLimit: number;
}): SkillGapRow[] {
  const demandBySkill = new Map(input.demand.map((d) => [d.skillId, d]));
  const prevDemandBySkill = new Map(
    (input.previousDemand ?? []).map((d) => [d.skillId, d]),
  );
  const prevSupplyByKey = new Map(
    (input.previousSupply ?? []).map((s) => [
      `${s.skillId}|${s.supplyType}`,
      s,
    ]),
  );

  const draft: Omit<SkillGapRow, "priority">[] = [];

  for (const supply of input.supply) {
    const demand = demandBySkill.get(supply.skillId);
    const demandQuantity = demand?.demandQuantity ?? 0;
    const demandSample = demand?.jobCount ?? 0;
    const metrics = computeGapMetrics(demandQuantity, supply.quantity);
    const severity = classifySeverity({
      metrics,
      demandSample,
      supplySample: supply.observationCount,
      comparability: supply.comparability,
    });
    const cautionShare =
      demand && demand.includedJobs + demand.cautionJobs > 0
        ? demand.cautionJobs / (demand.includedJobs + demand.cautionJobs)
        : 0;
    const confidence = classifyConfidence({
      demandSample,
      supplySample: supply.observationCount,
      comparability: supply.comparability,
      severity,
      supplyConfidence: null,
      demandCautionShare: cautionShare,
    });

    const prevDemand = prevDemandBySkill.get(supply.skillId);
    const prevSupply = prevSupplyByKey.get(`${supply.skillId}|${supply.supplyType}`);
    const prevMetrics = computeGapMetrics(
      prevDemand?.demandQuantity ?? 0,
      prevSupply?.quantity ?? 0,
    );
    const trend = classifyGapTrend({
      currentShortage: metrics.shortageQuantity,
      previousShortage: prevMetrics.shortageQuantity,
      currentSample: demandSample,
      previousSample: prevDemand?.jobCount ?? 0,
    });

    const notes: string[] = [];
    if (supply.comparability === "PROXY") {
      notes.push(
        "PROXY supply — numerical gap is not a directly measured workforce shortage.",
      );
    }
    if (supply.comparability === "UNKNOWN") {
      notes.push(
        "UNKNOWN comparability — do not present as a verified labour shortage.",
      );
    }
    if (!demand) {
      notes.push("No Phase 8 demand signal for this skill in the selected period.");
    }
    if (metrics.zeroSupply) {
      notes.push("Zero supply quantity for this skill/type (ratio left null).");
    }
    if (metrics.bothZero) {
      notes.push("Both demand and supply are zero — not a balanced labour market claim.");
    }

    draft.push({
      skillId: supply.skillId,
      canonicalName: supply.canonicalName,
      name: demand?.name ?? supply.canonicalName,
      supplyType: supply.supplyType,
      comparability: supply.comparability,
      metrics,
      severity,
      confidence,
      trend,
      geography: supply.geography,
      period: input.period,
      demandVersion: DEMAND_METHODOLOGY_VERSION,
      gapVersion: GAP_METHODOLOGY_VERSION,
      demandJobCount: demandSample,
      supplyObservationCount: supply.observationCount,
      occupationId: supply.occupationId,
      sectorId: supply.sectorId,
      evidence: {
        demandIncludedJobs: demand?.includedJobs ?? 0,
        demandCautionJobs: demand?.cautionJobs ?? 0,
        supplyObservationIds: supply.observationIds,
        supplySourceIds: supply.sourceIds,
      },
      notes,
    });
  }

  // Demand-only skills (no supply observation) — explicit UNKNOWN supply absence
  for (const demand of input.demand) {
    const hasSupply = input.supply.some((s) => s.skillId === demand.skillId);
    if (hasSupply) {
      continue;
    }
    const metrics = computeGapMetrics(demand.demandQuantity, 0);
    const severity = classifySeverity({
      metrics,
      demandSample: demand.jobCount,
      supplySample: 0,
      comparability: "UNKNOWN",
    });
    const confidence = classifyConfidence({
      demandSample: demand.jobCount,
      supplySample: 0,
      comparability: "UNKNOWN",
      severity,
      supplyConfidence: null,
      demandCautionShare:
        demand.includedJobs + demand.cautionJobs > 0
          ? demand.cautionJobs / (demand.includedJobs + demand.cautionJobs)
          : 0,
    });
    const prevDemand = prevDemandBySkill.get(demand.skillId);
    const prevMetrics = computeGapMetrics(prevDemand?.demandQuantity ?? 0, 0);
    draft.push({
      skillId: demand.skillId,
      canonicalName: demand.canonicalName,
      name: demand.name,
      supplyType: "OTHER",
      comparability: "UNKNOWN",
      metrics,
      severity,
      confidence,
      trend: classifyGapTrend({
        currentShortage: metrics.shortageQuantity,
        previousShortage: prevMetrics.shortageQuantity,
        currentSample: demand.jobCount,
        previousSample: prevDemand?.jobCount ?? 0,
      }),
      geography: input.demandGeography ?? {
        locationId: null,
        country: null,
        state: null,
        district: null,
        city: null,
        known: false,
        level: "UNKNOWN",
      },
      period: input.period,
      demandVersion: DEMAND_METHODOLOGY_VERSION,
      gapVersion: GAP_METHODOLOGY_VERSION,
      demandJobCount: demand.jobCount,
      supplyObservationCount: 0,
      occupationId: null,
      sectorId: null,
      evidence: {
        demandIncludedJobs: demand.includedJobs,
        demandCautionJobs: demand.cautionJobs,
        supplyObservationIds: [],
        supplySourceIds: [],
      },
      notes: [
        "No supply observation for this skill — shortage vs unknown supply, not verified workforce gap.",
      ],
    });
  }

  const maxShortage = Math.max(0, ...draft.map((r) => r.metrics.shortageQuantity));
  const maxDemand = Math.max(0, ...draft.map((r) => r.metrics.demandQuantity));

  const rows: SkillGapRow[] = draft.map((row) => ({
    ...row,
    priority: computePriorityScore({
      shortageQuantity: row.metrics.shortageQuantity,
      demandQuantity: row.metrics.demandQuantity,
      severity: row.severity,
      confidence: row.confidence,
      trend: row.trend.direction,
      maxShortage,
      maxDemand,
    }),
  }));

  rows.sort(compareGapRows);
  return rows.slice(0, input.rankLimit);
}
