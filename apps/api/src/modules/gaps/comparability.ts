import type { GapComparability, SupplyType } from "./policy";
import {
  GAP_COMPARABILITY,
  SUPPLY_COMPARABILITY_DEFAULT,
} from "./policy";
import type { GapGeographyRef } from "./contract";

/**
 * Resolve comparability for a supply type against Phase 8 job demand.
 * Geography scopes must match for DIRECT; mismatched scopes → UNKNOWN.
 */
export function resolveComparability(input: {
  supplyType: SupplyType;
  demandGeography: GapGeographyRef | null;
  supplyGeography: GapGeographyRef;
}): GapComparability {
  const base = SUPPLY_COMPARABILITY_DEFAULT[input.supplyType] as GapComparability;

  if (base === GAP_COMPARABILITY.UNKNOWN) {
    return GAP_COMPARABILITY.UNKNOWN;
  }

  if (!geographyScopesCompatible(input.demandGeography, input.supplyGeography)) {
    return GAP_COMPARABILITY.UNKNOWN;
  }

  return base;
}

/**
 * Demand and supply must share the same geographic scope for comparison.
 * Unknown vs known is not directly comparable.
 * State demand vs city supply is not directly comparable.
 */
export function geographyScopesCompatible(
  demand: GapGeographyRef | null,
  supply: GapGeographyRef,
): boolean {
  if (!demand) {
    // No demand geo filter: allow comparison but PROXY/UNKNOWN still apply by type.
    return true;
  }
  if (!demand.known || !supply.known) {
    // Both unknown → compatible at UNKNOWN geo level.
    return !demand.known && !supply.known;
  }
  if (demand.level !== supply.level) {
    return false;
  }
  if (demand.country && supply.country && demand.country !== supply.country) {
    return false;
  }
  if (demand.state && supply.state && demand.state !== supply.state) {
    return false;
  }
  if (demand.district && supply.district && demand.district !== supply.district) {
    return false;
  }
  if (demand.city && supply.city && demand.city !== supply.city) {
    return false;
  }
  if (demand.locationId && supply.locationId) {
    return demand.locationId === supply.locationId;
  }
  return true;
}

export function inferGeographyLevel(
  geography: Omit<GapGeographyRef, "level" | "known"> & { known?: boolean },
): GapGeographyRef {
  const known = Boolean(
    geography.known ??
      (geography.locationId ||
        geography.country ||
        geography.state ||
        geography.district ||
        geography.city),
  );
  let level: GapGeographyRef["level"] = "UNKNOWN";
  if (geography.city) {
    level = "CITY";
  } else if (geography.district) {
    level = "DISTRICT";
  } else if (geography.state) {
    level = "STATE";
  } else if (geography.country) {
    level = "COUNTRY";
  }
  return {
    locationId: geography.locationId,
    country: geography.country,
    state: geography.state,
    district: geography.district,
    city: geography.city,
    known,
    level: known ? level : "UNKNOWN",
  };
}
