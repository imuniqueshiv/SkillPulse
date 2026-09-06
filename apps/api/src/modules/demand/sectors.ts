import type { DemandJobObservation, SectorDemandRow } from "./contract";
import { classifyTrend } from "./trends";
import { compareDemandRows, ratio } from "./skills-util";

type GeoAcc = {
  key: string;
  state: string | null;
  city: string | null;
  jobIds: Set<string>;
  weightedDemand: number;
};

type Acc = {
  key: string;
  sectorId: string | null;
  code: string | null;
  name: string;
  status: "CLASSIFIED" | "UNCLASSIFIED";
  jobIds: Set<string>;
  weightedDemand: number;
  recentWeightedDemand: number;
  previousWeightedDemand: number;
  previousJobIds: Set<string>;
  geography: Map<string, GeoAcc>;
};

function sectorKey(obs: DemandJobObservation): string {
  if (obs.sector.status === "CLASSIFIED" && obs.sector.sectorId) {
    return `id:${obs.sector.sectorId}`;
  }
  return "UNCLASSIFIED";
}

function geoKey(obs: DemandJobObservation): string {
  if (!obs.location.known) {
    return "UNKNOWN";
  }
  return [
    obs.location.country ?? "",
    obs.location.state ?? "",
    obs.location.city ?? "",
  ].join("|");
}

export function aggregateSectorDemand(input: {
  current: readonly DemandJobObservation[];
  previous: readonly DemandJobObservation[];
  weightedEligibleJobs: number;
  rankLimit: number;
}): SectorDemandRow[] {
  const map = new Map<string, Acc>();

  for (const obs of input.current) {
    const key = sectorKey(obs);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        sectorId: obs.sector.sectorId,
        code: obs.sector.code,
        name:
          obs.sector.status === "CLASSIFIED"
            ? obs.sector.name ?? obs.sector.code ?? "CLASSIFIED"
            : "UNCLASSIFIED",
        status: obs.sector.status,
        jobIds: new Set(),
        weightedDemand: 0,
        recentWeightedDemand: 0,
        previousWeightedDemand: 0,
        previousJobIds: new Set(),
        geography: new Map(),
      };
      map.set(key, row);
    }
    row.jobIds.add(obs.jobId);
    row.weightedDemand += obs.qualityWeight;
    row.recentWeightedDemand += obs.qualityWeight;

    const gKey = geoKey(obs);
    let geo = row.geography.get(gKey);
    if (!geo) {
      geo = {
        key: gKey,
        state: obs.location.state,
        city: obs.location.city,
        jobIds: new Set(),
        weightedDemand: 0,
      };
      row.geography.set(gKey, geo);
    }
    geo.jobIds.add(obs.jobId);
    geo.weightedDemand += obs.qualityWeight;
  }

  for (const obs of input.previous) {
    const key = sectorKey(obs);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        sectorId: obs.sector.sectorId,
        code: obs.sector.code,
        name:
          obs.sector.status === "CLASSIFIED"
            ? obs.sector.name ?? obs.sector.code ?? "CLASSIFIED"
            : "UNCLASSIFIED",
        status: obs.sector.status,
        jobIds: new Set(),
        weightedDemand: 0,
        recentWeightedDemand: 0,
        previousWeightedDemand: 0,
        previousJobIds: new Set(),
        geography: new Map(),
      };
      map.set(key, row);
    }
    row.previousWeightedDemand += obs.qualityWeight;
    row.previousJobIds.add(obs.jobId);
  }

  const total = [...map.values()].reduce((sum, row) => sum + row.weightedDemand, 0);

  const rows: SectorDemandRow[] = [...map.values()].map((row) => ({
    sectorId: row.sectorId,
    code: row.code,
    name: row.name,
    status: row.status,
    jobCount: row.jobIds.size,
    weightedDemand: Number(row.weightedDemand.toFixed(6)),
    jobPenetration: ratio(row.weightedDemand, input.weightedEligibleJobs),
    sectorDemandShare: ratio(row.weightedDemand, total),
    recentWeightedDemand: Number(row.recentWeightedDemand.toFixed(6)),
    trend: classifyTrend({
      current: row.weightedDemand,
      previous: row.previousWeightedDemand,
      currentSample: row.jobIds.size,
      previousSample: row.previousJobIds.size,
    }),
    geography: [...row.geography.values()]
      .map((geo) => ({
        key: geo.key,
        state: geo.state,
        city: geo.city,
        jobCount: geo.jobIds.size,
        weightedDemand: Number(geo.weightedDemand.toFixed(6)),
      }))
      .sort((a, b) => {
        if (b.weightedDemand !== a.weightedDemand) {
          return b.weightedDemand - a.weightedDemand;
        }
        return a.key.localeCompare(b.key);
      }),
  }));

  rows.sort(compareDemandRows);
  return rows.slice(0, input.rankLimit);
}
