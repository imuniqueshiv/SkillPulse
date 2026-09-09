"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import { SkillDemandBars } from "@/components/intelligence/SkillDemandBars";
import {
  EvidenceNote,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function DemandPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const demand = (overview?.demand ?? {}) as {
    status?: string;
    topSkills?: Array<Record<string, unknown>>;
    qualityCoverage?: Record<string, unknown>;
    geography?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as {
    observationCount?: number;
    dataStatus?: string;
  };

  const barRows = (demand.topSkills ?? []).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    jobCount: Number(s.jobCount ?? 0),
    weightedDemand: String(s.weightedDemand ?? "—"),
    trend: String(s.trend ?? "INSUFFICIENT_DATA"),
  }));

  const geoRows = (demand.geography ?? [])
    .filter((g) => g.known)
    .map((g) => ({
      place: [g.city, g.district, g.state].filter(Boolean).join(", ") || "—",
      jobCount: String(g.jobCount ?? "—"),
      weightedDemand: String(g.weightedDemand ?? "—"),
    }));

  const analyzed = Number(demand.qualityCoverage?.analyzed ?? 0);
  const observations = Number(source.observationCount ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
      <PageHeader
        title="Labour Demand"
        subtitle="Skills employers are asking for in captured NCS Maharashtra job listings."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
      />
      {unauthorized ? (
        <IntelligenceUnauthorized />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <StatCard
              label="Jobs analyzed"
              value={observations > 0 ? String(observations) : "Insufficient data"}
              trend="Captured NCS cards"
            />
            <StatCard
              label="Skills identified"
              value={barRows.length > 0 ? String(barRows.length) : "Insufficient data"}
              trend={demand.status}
            />
            <StatCard
              label="Locations"
              value={geoRows.length > 0 ? String(geoRows.length) : "Insufficient data"}
              trend="Resolved single-city cards"
            />
            <StatCard
              label="Data quality"
              value={analyzed > 0 ? String(analyzed) : "Insufficient data"}
              trend={source.dataStatus}
            />
          </div>

          <Card>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Top demand skills</h3>
              <StatusBadge status={demand.status} />
            </div>
            {barRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient taxonomy-matched skills for ranking.
              </p>
            ) : (
              <SkillDemandBars rows={barRows} />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Geography</h3>
            {geoRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient resolved location data. Multi-city NCS cards are not assigned a
                single city.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <DataTable
                  columns={[
                    { key: "place", label: "Place" },
                    { key: "jobCount", label: "Jobs" },
                    { key: "weightedDemand", label: "Weighted demand" },
                  ]}
                  rows={geoRows}
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
