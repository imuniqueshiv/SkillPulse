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

export default function SkillsIntelligencePage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const demand = (overview?.demand ?? {}) as {
    status?: string;
    topSkills?: Array<Record<string, unknown>>;
    geography?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);

  const rows = (demand.topSkills ?? []).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    weightedDemand: String(s.weightedDemand ?? "—"),
    jobCount: Number(s.jobCount ?? 0),
    trend: String(s.trend ?? "INSUFFICIENT_DATA"),
  }));
  const locations = (demand.geography ?? []).filter((g) => g.known).length;
  const top = rows[0];

  const tableRows = rows.map((r) => ({
    ...r,
    jobs: String(r.jobCount),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
      <PageHeader
        title="Skills"
        subtitle="These are the skills employers are asking for — extracted from captured NCS job observations."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeInsufficient={demand.status === "INSUFFICIENT_DATA"}
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
              trend="Captured NCS observations"
            />
            <StatCard
              label="Skills identified"
              value={rows.length > 0 ? String(rows.length) : "Insufficient data"}
              trend={demand.status}
            />
            <StatCard
              label="Top skill"
              value={top?.canonicalName ?? "Insufficient data"}
              trend={top ? `${top.jobCount} jobs` : undefined}
            />
            <StatCard
              label="Locations covered"
              value={locations > 0 ? String(locations) : "Insufficient data"}
              trend="Resolved geography"
            />
          </div>

          <Card>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Top in-demand skills</h3>
              <StatusBadge status={demand.status} />
            </div>
            {rows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient taxonomy-matched skills for ranking.
              </p>
            ) : (
              <SkillDemandBars rows={rows} />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Skill detail</h3>
            <div className="overflow-x-auto">
              <DataTable
                highlightCount={5}
                columns={[
                  { key: "canonicalName", label: "Skill" },
                  { key: "jobs", label: "Jobs" },
                  { key: "weightedDemand", label: "Demand" },
                  { key: "trend", label: "Trend" },
                ]}
                rows={tableRows}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
