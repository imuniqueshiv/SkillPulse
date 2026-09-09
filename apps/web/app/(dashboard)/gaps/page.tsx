"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  formatMetric,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

type GapRow = {
  skillId: string;
  canonicalName: string;
  severity: string;
  shortage: string;
  confidence: string;
};

export default function SkillGapsPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const gaps = (overview?.gaps ?? {}) as {
    status?: string;
    severeOrHighCount?: number;
    insufficientDataCount?: number;
    shortagesCount?: number;
    topPriority?: Array<Record<string, unknown>>;
    coverage?: { demandSkills?: number; supplySkills?: number };
  };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);
  const supplyUnavailable =
    Number(gaps.coverage?.supplySkills ?? 0) === 0 ||
    Number(gaps.insufficientDataCount ?? 0) > 0;

  const demandRows = (
    ((overview?.demand as { topSkills?: Array<Record<string, unknown>> } | undefined)
      ?.topSkills ?? [])
  ).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    jobCount: String(s.jobCount ?? "—"),
    weightedDemand: String(s.weightedDemand ?? "—"),
  }));

  const rows: GapRow[] = (gaps.topPriority ?? []).map((s) => ({
    skillId: String(s.skillId ?? ""),
    canonicalName: String(s.canonicalName ?? ""),
    severity: String(s.severity ?? "INSUFFICIENT_DATA"),
    shortage: String(s.shortageQuantity ?? "—"),
    confidence: String(s.confidence ?? "INSUFFICIENT_DATA"),
  }));

  const columns = [
    {
      key: "canonicalName",
      label: "Skill",
      render: (row: GapRow) =>
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
    { key: "severity", label: "Severity" },
    { key: "shortage", label: "Shortage quantity" },
    { key: "confidence", label: "Confidence" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Skill Gaps"
        subtitle="Demand versus workforce supply. Missing supply is not treated as zero."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeInsufficient={supplyUnavailable}
      />
      {unauthorized ? (
        <IntelligenceUnauthorized />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : (
        <>
          {supplyUnavailable ? (
            <Card>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <Badge variant="warning">WORKFORCE SUPPLY UNAVAILABLE</Badge>
                <StatusBadge status={gaps.status} />
              </div>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
                Demand is available from {observations || "captured"} NCS observations, but
                comparable workforce-supply evidence has not been provided. SkillPulse does
                not invent a gap from demand alone.
              </p>
            </Card>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <StatCard
              label="Severe / high gaps"
              value={
                supplyUnavailable
                  ? "INSUFFICIENT DATA"
                  : formatMetric(gaps.status, gaps.severeOrHighCount)
              }
              trend={gaps.status}
            />
            <StatCard
              label="Insufficient-data rows"
              value={formatMetric("AVAILABLE", gaps.insufficientDataCount)}
              trend="Missing supply ≠ zero"
            />
          </div>

          {rows.length > 0 ? (
            <Card>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Priority gap skills</h3>
              <DataTable columns={columns} rows={rows} highlightCount={3} />
            </Card>
          ) : (
            <Card>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Demand-side evidence</h3>
              {demandRows.length === 0 ? (
                <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                  Insufficient comparable demand and supply evidence for ranked skill gaps.
                </p>
              ) : (
                <DataTable
                  columns={[
                    {
                      key: "canonicalName",
                      label: "Skill",
                      render: (row: (typeof demandRows)[0]) =>
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
                  ]}
                  rows={demandRows}
                  highlightCount={5}
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
