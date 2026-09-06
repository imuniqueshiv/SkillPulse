import type { DemandJobObservation, GeographyDemandRow } from "./contract";
import { classifyTrend } from "./trends";
import { compareDemandRows, ratio } from "./skills-util";

type Acc = {
  key: string;
  locationId: string | null;
  country: string | null;
  state: string | null;
  district: string | null;
  city: string | null;
  known: boolean;
  jobIds: Set<string>;
  weightedDemand: number;
  recentWeightedDemand: number;
  previousWeightedDemand: number;
  previousJobIds: Set<string>;
};

function locationBucket(obs: DemandJobObservation): Acc["key"] {
  if (!obs.location.known) {
    return "UNKNOWN";
  }
  if (obs.location.locationId) {
    return `id:${obs.location.locationId}`;
  }
  return [
    obs.location.country ?? "",
    obs.location.state ?? "",
    obs.location.district ?? "",
    obs.location.city ?? "",
  ].join("|");
}

export function aggregateGeographyDemand(input: {
  current: readonly DemandJobObservation[];
  previous: readonly DemandJobObservation[];
  weightedEligibleJobs: number;
  rankLimit: number;
}): GeographyDemandRow[] {
  const map = new Map<string, Acc>();

  for (const obs of input.current) {
    const key = locationBucket(obs);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        locationId: obs.location.locationId,
        country: obs.location.country,
        state: obs.location.state,
        district: obs.location.district,
        city: obs.location.city,
        known: obs.location.known,
        jobIds: new Set(),
        weightedDemand: 0,
        recentWeightedDemand: 0,
        previousWeightedDemand: 0,
        previousJobIds: new Set(),
      };
      map.set(key, row);
    }
    row.jobIds.add(obs.jobId);
    row.weightedDemand += obs.qualityWeight;
    row.recentWeightedDemand += obs.qualityWeight;
  }

  for (const obs of input.previous) {
    const key = locationBucket(obs);
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        locationId: obs.location.locationId,
        country: obs.location.country,
        state: obs.location.state,
        district: obs.location.district,
        city: obs.location.city,
        known: obs.location.known,
        jobIds: new Set(),
        weightedDemand: 0,
        recentWeightedDemand: 0,
        previousWeightedDemand: 0,
        previousJobIds: new Set(),
      };
      map.set(key, row);
    }
    row.previousWeightedDemand += obs.qualityWeight;
    row.previousJobIds.add(obs.jobId);
  }

  const total = [...map.values()].reduce((sum, row) => sum + row.weightedDemand, 0);

  const rows: GeographyDemandRow[] = [...map.values()].map((row) => ({
    key: row.key,
    locationId: row.locationId,
    country: row.country,
    state: row.state,
    district: row.district,
    city: row.city,
    known: row.known,
    jobCount: row.jobIds.size,
    weightedDemand: Number(row.weightedDemand.toFixed(6)),
    jobPenetration: ratio(row.weightedDemand, input.weightedEligibleJobs),
    geographyDemandShare: ratio(row.weightedDemand, total),
    recentWeightedDemand: Number(row.recentWeightedDemand.toFixed(6)),
    trend: classifyTrend({
      current: row.weightedDemand,
      previous: row.previousWeightedDemand,
      currentSample: row.jobIds.size,
      previousSample: row.previousJobIds.size,
    }),
  }));

  rows.sort((a, b) =>
    compareDemandRows(
      { weightedDemand: a.weightedDemand, jobCount: a.jobCount, name: a.key },
      { weightedDemand: b.weightedDemand, jobCount: b.jobCount, name: b.key },
    ),
  );
  return rows.slice(0, input.rankLimit);
}
