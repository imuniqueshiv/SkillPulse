import type {
  DemandJobObservation,
  ExperienceDemandSummary,
  QualificationDemandSummary,
} from "./contract";
import { ratio } from "./skills-util";

function coverage(known: number, unknown: number, note: string) {
  const total = known + unknown;
  return {
    known,
    unknown,
    coverageRate: total === 0 ? null : ratio(known, total),
    note,
  };
}

function experienceBucket(minYears: number | undefined): string {
  if (minYears === undefined || !Number.isFinite(minYears)) {
    return "UNSPECIFIED_MIN";
  }
  if (minYears < 1) {
    return "0-1";
  }
  if (minYears < 3) {
    return "1-3";
  }
  if (minYears < 5) {
    return "3-5";
  }
  if (minYears < 8) {
    return "5-8";
  }
  return "8+";
}

/**
 * Experience/qualification demand among known values only.
 * Percentages are of identifiable jobs — never of all jobs when coverage is partial.
 */
export function aggregateExperienceDemand(
  observations: readonly DemandJobObservation[],
): ExperienceDemandSummary {
  let known = 0;
  let unknown = 0;
  let freshersAccepted = 0;
  let withMinYears = 0;
  let minSum = 0;
  const buckets = new Map<string, number>();

  for (const obs of observations) {
    if (obs.experience.status === "PARSED") {
      known += 1;
      if (obs.experience.freshersAccepted) {
        freshersAccepted += 1;
      }
      if (
        typeof obs.experience.minYears === "number" &&
        Number.isFinite(obs.experience.minYears)
      ) {
        withMinYears += 1;
        minSum += obs.experience.minYears;
        const label = experienceBucket(obs.experience.minYears);
        buckets.set(label, (buckets.get(label) ?? 0) + 1);
      } else {
        buckets.set("UNSPECIFIED_MIN", (buckets.get("UNSPECIFIED_MIN") ?? 0) + 1);
      }
    } else {
      unknown += 1;
    }
  }

  return {
    coverage: coverage(
      known,
      unknown,
      "Among jobs with identifiable (PARSED) experience requirements — not a percentage of all jobs.",
    ),
    amongKnown: {
      freshersAccepted,
      withMinYears,
      averageMinYears:
        withMinYears === 0 ? null : Number((minSum / withMinYears).toFixed(4)),
      buckets: [...buckets.entries()]
        .map(([label, jobCount]) => ({
          label,
          jobCount,
          shareAmongKnown: ratio(jobCount, known),
        }))
        .sort((a, b) => {
          if (b.jobCount !== a.jobCount) {
            return b.jobCount - a.jobCount;
          }
          return a.label.localeCompare(b.label);
        }),
    },
  };
}

export function aggregateQualificationDemand(
  observations: readonly DemandJobObservation[],
): QualificationDemandSummary {
  let known = 0;
  let unknown = 0;
  let totalParsedMentions = 0;
  const byNormalized = new Map<string, Set<string>>();

  for (const obs of observations) {
    const parsed = obs.qualifications.filter((row) => row.status === "PARSED");
    if (parsed.length === 0) {
      unknown += 1;
      continue;
    }
    known += 1;
    for (const row of parsed) {
      totalParsedMentions += 1;
      const key = (row.normalized ?? row.type ?? "PARSED").trim() || "PARSED";
      let set = byNormalized.get(key);
      if (!set) {
        set = new Set();
        byNormalized.set(key, set);
      }
      set.add(obs.jobId);
    }
  }

  return {
    coverage: coverage(
      known,
      unknown,
      "Among jobs with at least one identifiable (PARSED) qualification — not a percentage of all jobs.",
    ),
    amongKnown: {
      totalParsedMentions,
      byNormalized: [...byNormalized.entries()]
        .map(([normalized, jobIds]) => ({
          normalized,
          jobCount: jobIds.size,
          shareAmongKnown: ratio(jobIds.size, known),
        }))
        .sort((a, b) => {
          if (b.jobCount !== a.jobCount) {
            return b.jobCount - a.jobCount;
          }
          return a.normalized.localeCompare(b.normalized);
        }),
    },
  };
}
