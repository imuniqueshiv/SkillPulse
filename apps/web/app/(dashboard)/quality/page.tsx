"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  formatMetric,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function QualityPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();
  const data = (overview?.dataQuality ?? null) as {
    status?: string;
    totalAssessments?: number;
    eligibility?: Record<string, number>;
    freshness?: Record<string, number>;
  } | null;
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);
  const freshness = data?.freshness ?? {};
  const eligibility = data?.eligibility ?? {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Data Quality"
        subtitle="Phase 7 quality assessments for analytical trust."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeInsufficient={data?.status === "INSUFFICIENT_DATA"}
      />
      {unauthorized ? (
        <IntelligenceUnauthorized message="You are not authorized to view data quality intelligence." />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : (
        <>
          <StatusBadge status={data?.status} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <StatCard
              label="PROCESSED assessments"
              value={formatMetric(data?.status, data?.totalAssessments)}
              trend="Quality-v1"
            />
            <StatCard
              label="Fresh"
              value={formatMetric(data?.status, freshness.FRESH ?? 0)}
              trend={`Aging ${freshness.AGING ?? 0}`}
            />
            <StatCard
              label="Stale"
              value={formatMetric(data?.status, freshness.STALE ?? 0)}
              trend={`Unknown ${freshness.UNKNOWN ?? 0}`}
            />
            <StatCard
              label="EXCLUDE"
              value={formatMetric(data?.status, eligibility.EXCLUDE ?? 0)}
              trend={`INCLUDE ${eligibility.INCLUDE ?? 0}`}
            />
          </div>
          <Card>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Interpretation</h3>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                fontSize: "0.8125rem",
                color: "var(--sp-text-secondary)",
              }}
            >
              <li>Stale freshness and EXCLUDE eligibility reduce demand-backed trust.</li>
              <li>Employment evidence is incomplete when Phase 12 observations are absent.</li>
              <li>Quality counts PROCESSED assessments only — not market demand.</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
