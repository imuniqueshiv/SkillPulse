"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
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

export default function SkillsIntelligencePage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const demand = (overview?.demand ?? {}) as {
    status?: string;
    topSkills?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);

  const rows: SkillRow[] = (demand.topSkills ?? []).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    weightedDemand: String(s.weightedDemand ?? "—"),
    jobCount: String(s.jobCount ?? "—"),
    trend: String(s.trend ?? "INSUFFICIENT_DATA"),
  }));

  const columns = [
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Skills"
        subtitle="Canonical skills ranked from captured NCS job observations."
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
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <StatusBadge status={demand.status} />
            <span style={{ fontSize: "0.8125rem", color: "var(--sp-text-secondary)" }}>
              Top rows are highest weighted demand. INSUFFICIENT_DATA trend means no
              comparable previous window.
            </span>
          </div>
          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Market demand</h3>
            {rows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient taxonomy-matched skills for ranking.
              </p>
            ) : (
              <DataTable columns={columns} rows={rows} highlightCount={5} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
