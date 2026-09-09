import { getPrisma } from "../../config/database";
import type { EmploymentOutcomeObservation } from "../employment/contract";
import type { SupplyObservation } from "../gaps/contract";

const DEMO_KIND_SUPPLY = "SUPPLY_OBSERVATION";
const DEMO_KIND_OUTCOME = "EMPLOYMENT_OUTCOME";
const CACHE_TTL_MS = 45_000;

type DemoBundle = {
  supply: SupplyObservation[];
  employment: EmploymentOutcomeObservation[];
};

let cache: { at: number; value: DemoBundle } | null = null;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

/**
 * Load persisted DEMO/SIMULATED observations from Evidence.metadata.
 * Does not invent records at request time. Does not touch NCS Jobs.
 */
export async function loadPersistedDemoObservations(): Promise<DemoBundle> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }

  const prisma = getPrisma();
  const rows = await prisma.evidence.findMany({
    where: {
      source: { isDemo: true, code: "sp.source.demo-mvp" },
    },
    select: { metadata: true },
    take: 200,
  });

  const supply: SupplyObservation[] = [];
  const employment: EmploymentOutcomeObservation[] = [];

  for (const row of rows) {
    const meta = asRecord(row.metadata);
    if (!meta) continue;
    const kind = String(meta.demoKind ?? "");
    const payload = asRecord(meta.payload);
    if (!payload) continue;

    if (kind === DEMO_KIND_SUPPLY) {
      supply.push(payload as unknown as SupplyObservation);
    } else if (kind === DEMO_KIND_OUTCOME) {
      employment.push(payload as unknown as EmploymentOutcomeObservation);
    }
  }

  const value = { supply, employment };
  cache = { at: Date.now(), value };
  return value;
}
