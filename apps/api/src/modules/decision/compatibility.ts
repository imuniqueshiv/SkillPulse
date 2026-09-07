import type { DemandPeriod } from "../demand/contract";
import type { GapGeographyRef } from "../gaps/contract";

/**
 * Temporal compatibility: periods must share the same from/to ISO strings.
 * Incompatible periods → do not synthesize cross-phase conclusions.
 */
export function periodsCompatible(
  a: DemandPeriod | null | undefined,
  b: DemandPeriod | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.from === b.from && a.to === b.to;
}

export function allPeriodsCompatible(
  periods: Array<DemandPeriod | null | undefined>,
): boolean {
  const known = periods.filter((p): p is DemandPeriod => !!p?.from && !!p?.to);
  if (known.length <= 1) return true;
  const first = known[0]!;
  return known.every((p) => periodsCompatible(first, p));
}

/**
 * Geographic compatibility: same known level and matching fields for that level.
 * UNKNOWN or unknown geography does not invent matches.
 */
export function geographyCompatible(
  a: GapGeographyRef | null | undefined,
  b: GapGeographyRef | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (!a.known || !b.known) return false;
  if (a.level === "UNKNOWN" || b.level === "UNKNOWN") return false;
  if (a.level !== b.level) return false;
  if (a.country !== b.country) return false;
  if (a.level === "COUNTRY") return true;
  if (a.state !== b.state) return false;
  if (a.level === "STATE") return true;
  if (a.district !== b.district) return false;
  if (a.level === "DISTRICT") return true;
  return a.city === b.city;
}

export function geographyKey(g: GapGeographyRef | null | undefined): string {
  if (!g || !g.known) return "UNKNOWN";
  return [g.level, g.country ?? "", g.state ?? "", g.district ?? "", g.city ?? ""].join("|");
}
