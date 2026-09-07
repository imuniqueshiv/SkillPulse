import type { SupplyObservation } from "../gaps/contract";
import { SUPPLY_TYPE } from "../gaps/policy";
import type {
  CapacityAggregateResult,
  InstituteCapacityObservation,
} from "./contract";
import {
  INSTITUTE_CAPACITY_STATUS,
  INSTITUTE_CAPACITY_SUFFICIENCY_RATIO,
  INSTITUTE_CONFIDENCE,
  type InstituteCapacityStatus,
  type InstituteConfidence,
} from "./policy";

/**
 * Map Phase 9 TRAINING_CAPACITY supply observations into institute capacity
 * observations. Other supply types are ignored — never converted.
 */
export function capacityFromSupplyObservations(
  observations: readonly SupplyObservation[],
  opts?: {
    providerId?: string | null;
    programId?: string | null;
  },
): InstituteCapacityObservation[] {
  const out: InstituteCapacityObservation[] = [];
  const seen = new Set<string>();
  for (const obs of observations) {
    if (obs.supplyType !== SUPPLY_TYPE.TRAINING_CAPACITY) continue;
    if (seen.has(obs.observationId)) continue;
    seen.add(obs.observationId);
    out.push({
      observationId: obs.observationId,
      quantity: obs.quantity,
      periodFrom: obs.periodFrom,
      periodTo: obs.periodTo,
      geography: obs.geography,
      providerId: opts?.providerId ?? null,
      programId: opts?.programId ?? null,
      skillId: obs.skillId,
      sourceId: obs.sourceId,
      evidenceId: obs.evidenceId,
      confidence: mapGapConfidence(obs.confidence),
      aggregateGroup: null,
      notes: obs.notes,
    });
  }
  return out;
}

function mapGapConfidence(
  c: string | null | undefined,
): InstituteConfidence | null {
  if (!c) return null;
  if (c === "HIGH" || c === "MEDIUM" || c === "LOW" || c === "INSUFFICIENT_DATA") {
    return c;
  }
  return INSTITUTE_CONFIDENCE.LOW;
}

function periodKey(from: string, to: string): string {
  return `${from}|${to}`;
}

function geographyKey(g: InstituteCapacityObservation["geography"]): string {
  return [
    g.country ?? "",
    g.state ?? "",
    g.district ?? "",
    g.city ?? "",
    g.level,
  ].join("|");
}

/**
 * Aggregate capacity only when observations are genuinely additive.
 * - Same observationId → dedupe
 * - Same aggregateGroup → mutually exclusive; keep max, do not sum
 * - Same provider+program+skill+period+geo → keep one (no double-count)
 * - Distinct programs under same provider with matching period/geo → additive
 * - Provider-level (no program) + program-level for same provider → NOT additive
 */
export function aggregateCapacity(
  observations: readonly InstituteCapacityObservation[],
  filter?: {
    providerId?: string | null;
    programId?: string | null;
    skillId?: string | null;
  },
  shortageQuantity?: number,
): CapacityAggregateResult {
  let filtered = [...observations];
  if (filter?.providerId) {
    filtered = filtered.filter((o) => o.providerId === filter.providerId);
  }
  if (filter?.programId) {
    filtered = filtered.filter((o) => o.programId === filter.programId);
  }
  if (filter?.skillId) {
    filtered = filtered.filter(
      (o) => o.skillId === filter.skillId || o.skillId === null,
    );
  }

  if (filtered.length === 0) {
    return {
      quantity: null,
      status: INSTITUTE_CAPACITY_STATUS.UNKNOWN,
      observationCount: 0,
      observationIds: [],
      additive: false,
      notes: ["No TRAINING_CAPACITY observations in scope — UNKNOWN, not zero."],
    };
  }

  // Dedupe by observationId
  const byId = new Map<string, InstituteCapacityObservation>();
  for (const o of filtered) {
    if (!byId.has(o.observationId)) byId.set(o.observationId, o);
  }
  const unique = [...byId.values()];

  // Mutually exclusive groups: keep max quantity per aggregateGroup
  const groupMax = new Map<string, InstituteCapacityObservation>();
  const ungrouped: InstituteCapacityObservation[] = [];
  for (const o of unique) {
    if (o.aggregateGroup) {
      const prev = groupMax.get(o.aggregateGroup);
      if (!prev || o.quantity > prev.quantity) {
        groupMax.set(o.aggregateGroup, o);
      }
    } else {
      ungrouped.push(o);
    }
  }
  const afterGroups = [...groupMax.values(), ...ungrouped];

  // Scope collision key: provider|program|skill|period|geo
  const scopeMap = new Map<string, InstituteCapacityObservation>();
  for (const o of afterGroups) {
    const key = [
      o.providerId ?? "",
      o.programId ?? "",
      o.skillId ?? "",
      periodKey(o.periodFrom, o.periodTo),
      geographyKey(o.geography),
    ].join("::");
    const prev = scopeMap.get(key);
    if (!prev || o.quantity > prev.quantity) {
      scopeMap.set(key, o);
    }
  }
  const scoped = [...scopeMap.values()];

  // Detect provider-level vs program-level overlap for same provider+period+geo
  const providerLevel = scoped.filter((o) => o.programId === null && o.providerId);
  const programLevel = scoped.filter((o) => o.programId !== null);
  const notes: string[] = [];
  let candidates = scoped;

  if (providerLevel.length > 0 && programLevel.length > 0) {
    // Overlapping scopes — do not sum; prefer program-level detail when filtering program,
    // otherwise keep separate and report non-additive.
    const providerIdsWithBoth = new Set(
      providerLevel
        .filter((p) =>
          programLevel.some(
            (pr) =>
              pr.providerId === p.providerId &&
              periodKey(pr.periodFrom, pr.periodTo) ===
                periodKey(p.periodFrom, p.periodTo) &&
              geographyKey(pr.geography) === geographyKey(p.geography),
          ),
        )
        .map((p) => p.providerId),
    );
    if (providerIdsWithBoth.size > 0) {
      notes.push(
        "Provider-level and program-level capacity overlap — not summed; using program-level where present.",
      );
      candidates = [
        ...programLevel.filter((p) => providerIdsWithBoth.has(p.providerId)),
        ...scoped.filter(
          (o) =>
            !o.providerId ||
            !providerIdsWithBoth.has(o.providerId) ||
            (o.programId === null && !providerIdsWithBoth.has(o.providerId)),
        ),
      ];
      // Unique again
      const m = new Map(candidates.map((c) => [c.observationId, c]));
      candidates = [...m.values()];
    }
  }

  // Check period/geo homogeneity for additivity
  const periods = new Set(
    candidates.map((c) => periodKey(c.periodFrom, c.periodTo)),
  );
  const geos = new Set(candidates.map((c) => geographyKey(c.geography)));
  let additive = periods.size === 1 && geos.size === 1;
  if (!additive) {
    notes.push(
      "Capacity observations differ in period or geography — not treated as additive sum.",
    );
    // Use max of compatible single-scope rather than inventing a sum
    const best = candidates.reduce((a, b) => (a.quantity >= b.quantity ? a : b));
    return finalizeCapacity(
      best.quantity,
      [best],
      false,
      notes,
      shortageQuantity,
    );
  }

  // Distinct programs → additive; same program already collapsed
  const quantity = candidates.reduce((sum, c) => sum + Math.max(0, c.quantity), 0);
  if (candidates.length > 1) {
    notes.push("Additive capacity across compatible observations.");
  }
  return finalizeCapacity(quantity, candidates, additive, notes, shortageQuantity);
}

function finalizeCapacity(
  quantity: number,
  observations: InstituteCapacityObservation[],
  additive: boolean,
  notes: string[],
  shortageQuantity?: number,
): CapacityAggregateResult {
  const status = classifyInstituteCapacity({
    quantity,
    hasObservations: true,
    shortageQuantity,
  });
  return {
    quantity,
    status,
    observationCount: observations.length,
    observationIds: observations.map((o) => o.observationId).sort(),
    additive,
    notes,
  };
}

export function classifyInstituteCapacity(input: {
  quantity: number | null | undefined;
  hasObservations: boolean;
  shortageQuantity?: number;
}): InstituteCapacityStatus {
  if (
    !input.hasObservations ||
    input.quantity === null ||
    input.quantity === undefined
  ) {
    return INSTITUTE_CAPACITY_STATUS.UNKNOWN;
  }
  const q = Math.max(0, input.quantity);
  if (q <= 0) return INSTITUTE_CAPACITY_STATUS.UNAVAILABLE;
  if (
    input.shortageQuantity === undefined ||
    input.shortageQuantity === null ||
    input.shortageQuantity <= 0
  ) {
    return INSTITUTE_CAPACITY_STATUS.AVAILABLE;
  }
  if (q >= input.shortageQuantity * INSTITUTE_CAPACITY_SUFFICIENCY_RATIO) {
    return INSTITUTE_CAPACITY_STATUS.AVAILABLE;
  }
  return INSTITUTE_CAPACITY_STATUS.INSUFFICIENT;
}

export function emptyCapacity(
  note = "No TRAINING_CAPACITY observations — UNKNOWN, not zero.",
): CapacityAggregateResult {
  return {
    quantity: null,
    status: INSTITUTE_CAPACITY_STATUS.UNKNOWN,
    observationCount: 0,
    observationIds: [],
    additive: false,
    notes: [note],
  };
}
