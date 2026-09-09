"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchIntelligenceOverview,
  IntelligenceApiError,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  LimitationsPanel,
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
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await resolveAccessToken(getToken);
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchIntelligenceOverview(token, { limit: 20 });
        setOverview(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(
          err instanceof IntelligenceApiError
            ? err.message
            : "Unable to load intelligence.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, isLoaded]);

  const demand = (overview?.demand ?? {}) as {
    status?: string;
    topSkills?: Array<Record<string, unknown>>;
    qualityCoverage?: Record<string, unknown>;
    occupations?: Array<Record<string, unknown>>;
    sectors?: Array<Record<string, unknown>>;
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
    { key: "weightedDemand", label: "Weighted demand" },
    { key: "jobCount", label: "Jobs" },
    { key: "trend", label: "Trend" },
  ];

  const occRows = (demand.occupations ?? []).map((o) => ({
    name: String(o.name ?? "UNCLASSIFIED"),
    jobCount: String(o.jobCount ?? "—"),
    weightedDemand: String(o.weightedDemand ?? "—"),
  }));
  const sectorRows = (demand.sectors ?? []).map((s) => ({
    name: String(s.name ?? "UNCLASSIFIED"),
    jobCount: String(s.jobCount ?? "—"),
    weightedDemand: String(s.weightedDemand ?? "—"),
  }));
  const geoRows = (demand.geography ?? [])
    .filter((g) => g.known)
    .map((g) => ({
      place: [g.city, g.district, g.state].filter(Boolean).join(", ") || "—",
      jobCount: String(g.jobCount ?? "—"),
      weightedDemand: String(g.weightedDemand ?? "—"),
    }));

  const analyzed = Number(demand.qualityCoverage?.analyzed ?? 0);
  const caution = Number(demand.qualityCoverage?.caution ?? 0);
  const observations = Number(source.observationCount ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Labour Demand"
        subtitle="Phase 8 demand from captured NCS public job-listing observations — not an official NCS API feed."
      />
      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : !overview ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <Card>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge status={demand.status} />
              <StatusBadge status={source.dataStatus} />
              <span style={{ fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
                {source.source?.name ?? "National Career Service"} · captured public listings
                {source.liveNcsData ? "" : " · not live API"}
                {source.lastSnapshot?.accessMethod
                  ? ` · ${source.lastSnapshot.accessMethod}`
                  : ""}
              </span>
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatCard
              label="NCS observations"
              value={observations > 0 ? String(observations) : "Insufficient data"}
              trend="Captured job cards only"
            />
            <StatCard
              label="Quality-analyzed jobs"
              value={analyzed > 0 ? String(analyzed) : "Insufficient data"}
              trend={caution > 0 ? `${caution} caution-eligible` : demand.status}
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top skills (Phase 8)</h3>
            {skillRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient taxonomy-matched skills for ranking.
              </p>
            ) : (
              <DataTable columns={skillColumns} rows={skillRows} />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Occupations</h3>
            {occRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient classified occupation data.
              </p>
            ) : (
              <DataTable
                columns={[
                  { key: "name", label: "Occupation" },
                  { key: "jobCount", label: "Jobs" },
                  { key: "weightedDemand", label: "Weighted demand" },
                ]}
                rows={occRows}
              />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Sectors</h3>
            {sectorRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient classified sector data.
              </p>
            ) : (
              <DataTable
                columns={[
                  { key: "name", label: "Sector" },
                  { key: "jobCount", label: "Jobs" },
                  { key: "weightedDemand", label: "Weighted demand" },
                ]}
                rows={sectorRows}
              />
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Geography</h3>
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

          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
