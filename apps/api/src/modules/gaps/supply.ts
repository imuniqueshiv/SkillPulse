import { AppError } from "../../utils/errors";
import { inferGeographyLevel, resolveComparability } from "./comparability";
import type {
  GapGeographyRef,
  SupplyObservation,
  SupplySkillAggregate,
} from "./contract";
import {
  MAX_SUPPLY_OBSERVATIONS,
  SUPPLY_TYPE,
  type SupplyType,
} from "./policy";

const SUPPLY_TYPE_SET = new Set<string>(Object.values(SUPPLY_TYPE));

/**
 * Validate and normalize supply observations.
 * Dedupes by observationId. Does not mix supplyTypes.
 * Unresolved skills (null skillId) are excluded from skill aggregates but counted.
 */
export function normalizeSupplyObservations(
  observations: readonly SupplyObservation[],
): {
  resolved: SupplyObservation[];
  unresolvedCount: number;
  duplicatesDropped: number;
} {
  if (!Array.isArray(observations)) {
    throw new AppError(400, "supplyObservations must be an array");
  }
  if (observations.length > MAX_SUPPLY_OBSERVATIONS) {
    throw new AppError(
      400,
      `supplyObservations exceeds max ${MAX_SUPPLY_OBSERVATIONS}`,
    );
  }

  const seen = new Set<string>();
  const resolved: SupplyObservation[] = [];
  let unresolvedCount = 0;
  let duplicatesDropped = 0;

  for (const raw of observations) {
    const observationId = raw.observationId?.trim();
    if (!observationId) {
      throw new AppError(400, "supply observationId is required");
    }
    if (seen.has(observationId)) {
      duplicatesDropped += 1;
      continue;
    }
    seen.add(observationId);

    if (!SUPPLY_TYPE_SET.has(raw.supplyType)) {
      throw new AppError(400, `unsupported supplyType: ${String(raw.supplyType)}`);
    }
    if (!Number.isFinite(raw.quantity) || raw.quantity < 0) {
      throw new AppError(400, "supply quantity must be a non-negative finite number");
    }

    const geography = inferGeographyLevel(raw.geography);
    const skillId = raw.skillId?.trim() || null;
    const row: SupplyObservation = {
      ...raw,
      observationId,
      skillId,
      canonicalName: raw.canonicalName?.trim() || null,
      resolved: Boolean(skillId) && raw.resolved !== false,
      geography,
      quantity: raw.quantity,
    };

    if (!row.resolved || !skillId) {
      unresolvedCount += 1;
      continue;
    }
    resolved.push(row);
  }

  resolved.sort((a, b) => {
    const skillCmp = (a.skillId ?? "").localeCompare(b.skillId ?? "");
    if (skillCmp !== 0) {
      return skillCmp;
    }
    if (a.supplyType !== b.supplyType) {
      return a.supplyType.localeCompare(b.supplyType);
    }
    return a.observationId.localeCompare(b.observationId);
  });

  return { resolved, unresolvedCount, duplicatesDropped };
}

/**
 * Aggregate supply by skillId + supplyType (+ optional geography key).
 * Never sums across different supplyTypes.
 */
export function aggregateSupplyBySkill(input: {
  observations: readonly SupplyObservation[];
  supplyType?: SupplyType;
  geographyFilter?: GapGeographyRef | null;
  demandGeography?: GapGeographyRef | null;
}): SupplySkillAggregate[] {
  const { resolved } = normalizeSupplyObservations([...input.observations]);
  const map = new Map<string, SupplySkillAggregate>();

  for (const obs of resolved) {
    if (input.supplyType && obs.supplyType !== input.supplyType) {
      continue;
    }
    if (input.geographyFilter && !geoMatches(obs.geography, input.geographyFilter)) {
      continue;
    }

    const geoKey = geographyKey(obs.geography);
    const key = `${obs.skillId}|${obs.supplyType}|${geoKey}`;
    let row = map.get(key);
    if (!row) {
      row = {
        skillId: obs.skillId!,
        canonicalName: obs.canonicalName ?? obs.skillId!,
        supplyType: obs.supplyType,
        quantity: 0,
        observationCount: 0,
        observationIds: [],
        sourceIds: [],
        geography: obs.geography,
        occupationId: obs.occupationId,
        sectorId: obs.sectorId,
        comparability: resolveComparability({
          supplyType: obs.supplyType,
          demandGeography: input.demandGeography ?? null,
          supplyGeography: obs.geography,
        }),
      };
      map.set(key, row);
    }
    row.quantity += obs.quantity;
    row.observationCount += 1;
    row.observationIds.push(obs.observationId);
    if (obs.sourceId && !row.sourceIds.includes(obs.sourceId)) {
      row.sourceIds.push(obs.sourceId);
    }
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      quantity: Number(row.quantity.toFixed(6)),
      observationIds: [...row.observationIds].sort((a, b) => a.localeCompare(b)),
      sourceIds: [...row.sourceIds].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      if (b.quantity !== a.quantity) {
        return b.quantity - a.quantity;
      }
      return a.canonicalName.localeCompare(b.canonicalName);
    });
}

function geographyKey(geo: GapGeographyRef): string {
  if (!geo.known) {
    return "UNKNOWN";
  }
  if (geo.locationId) {
    return `id:${geo.locationId}`;
  }
  return [geo.country ?? "", geo.state ?? "", geo.district ?? "", geo.city ?? ""].join(
    "|",
  );
}

function geoMatches(obs: GapGeographyRef, filter: GapGeographyRef): boolean {
  if (filter.locationId) {
    return obs.locationId === filter.locationId;
  }
  if (!filter.known) {
    return !obs.known;
  }
  if (!obs.known) {
    return false;
  }
  if (filter.country && obs.country !== filter.country) {
    return false;
  }
  if (filter.state && obs.state !== filter.state) {
    return false;
  }
  if (filter.district && obs.district !== filter.district) {
    return false;
  }
  if (filter.city && obs.city !== filter.city) {
    return false;
  }
  return true;
}
