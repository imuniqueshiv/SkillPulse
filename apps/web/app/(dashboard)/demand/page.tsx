"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

type SkillRow = {
  skillId: string;
  canonicalName: string;
  weightedDemand: string;
  jobCount: string;
  trend: string;
};

export default function DemandPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const demand = (overview?.demand ?? {}) as {
    status?: string;
    topSkills?: Array<Record<string, unknown>>;
    qualityCoverage?: Record<string, unknown>;
    occupations?: Array<Record<string, unknown>>;
    geography?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as {
    observationCount?: number;
    dataStatus?: string;
    liveNcsData?: boolean;
    source?: { name?: string };
    lastSnapshot?: { accessMethod?: string };
  };

  const skillRows: SkillRow[] = (demand.topSkills ?? []).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    weightedDemand: String(s.weightedDemand ?? "—"),
    jobCount: String(s.jobCount ?? "—"),
    trend: String(s.trend ?? "INSUFFICIENT_DATA"),
  }));

  const skillColumns = [
    {
      key: "canonicalName",
      label: "Skill",
      render: (row: SkillRow) =>
        row.skillId ? (
          <Link
            href={`/skills/${encodeURIComponent(row.skillId)}`}
            className="text-[var(--sp-accent)] underline"
          >
            {row.canonicalName || row.skillId}
          </Link>
        ) : (
          row.canonicalName
        ),
    },
    { key: "jobCount", label: "Jobs" },
    { key: "weightedDemand", label: "Weighted demand" },
    { key: "trend", label: "Trend" },
  ];

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Labour Demand"
        subtitle="Captured NCS public job-listing observations — not an official NCS API feed."
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <StatCard
              label="NCS observations"
              value={observations > 0 ? String(observations) : "Insufficient data"}
              trend="Captured job cards"
            />
            <StatCard
              label="Skills ranked"
              value={skillRows.length > 0 ? String(skillRows.length) : "Insufficient data"}
              trend={demand.status}
            />
            <StatCard
              label="Quality-analyzed jobs"
              value={analyzed > 0 ? String(analyzed) : "Insufficient data"}
              trend={source.dataStatus}
            />
            <StatCard
              label="Resolved locations"
              value={geoRows.length > 0 ? String(geoRows.length) : "Insufficient data"}
              trend="Single-city cards only"
            />
          </div>

          <Card>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Top skills</h3>
              <StatusBadge status={demand.status} />
            </div>
            {skillRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient taxonomy-matched skills for ranking.
              </p>
            ) : (
              <DataTable columns={skillColumns} rows={skillRows} highlightCount={5} />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Geography</h3>
            {geoRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient resolved location data. Multi-city NCS cards are not assigned a single city.
              </p>
            ) : (
              <DataTable
                columns={[
                  { key: "place", label: "Place" },
                  { key: "jobCount", label: "Jobs" },
                  { key: "weightedDemand", label: "Weighted demand" },
                ]}
                rows={geoRows}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
