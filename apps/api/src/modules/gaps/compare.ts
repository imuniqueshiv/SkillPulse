import type { GapMetricBundle } from "./contract";

function round6(value: number): number {
  return Number(value.toFixed(6));
}

/**
 * Core gap-v1 equations with safe zero handling (never NaN/Infinity).
 */
export function computeGapMetrics(
  demandQuantity: number,
  supplyQuantity: number,
): GapMetricBundle {
  const demand = Number.isFinite(demandQuantity) ? Math.max(0, demandQuantity) : 0;
  const supply = Number.isFinite(supplyQuantity) ? Math.max(0, supplyQuantity) : 0;
  const netGap = round6(demand - supply);
  const shortageQuantity = round6(Math.max(netGap, 0));
  const zeroSupply = supply === 0;
  const zeroDemand = demand === 0;
  const bothZero = zeroDemand && zeroSupply;

  let demandSupplyRatio: number | null = null;
  if (!zeroSupply) {
    demandSupplyRatio = round6(demand / supply);
  }

  let supplyCoverageRatio: number | null = null;
  if (!zeroDemand) {
    supplyCoverageRatio = round6(supply / demand);
  }

  let gapPercentage: number | null = null;
  if (!zeroDemand) {
    gapPercentage = round6((shortageQuantity / demand) * 100);
  }

  return {
    demandQuantity: round6(demand),
    supplyQuantity: round6(supply),
    netGap,
    shortageQuantity,
    demandSupplyRatio,
    supplyCoverageRatio,
    gapPercentage,
    zeroSupply,
    zeroDemand,
    bothZero,
  };
}
