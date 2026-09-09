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
    topPriority?: Array<Record<string, unknown>>;
    coverage?: { demandSkills?: number; supplySkills?: number };
  };
  const mix = (overview?.evidenceMix ?? {}) as { supply?: string };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);
  const demoSupply = mix.supply === "DEMO";
  const supplyUnavailable = !demoSupply && Number(gaps.coverage?.supplySkills ?? 0) === 0;

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
    { key: "shortage", label: "Illustrative shortage" },
    { key: "confidence", label: "Confidence" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
      <PageHeader
        title="Skill Gaps"
        subtitle="NCS demand versus workforce supply. Demo supply is not official government statistics."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeDemo={demoSupply}
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
          <Card>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <Badge variant="success">DEMAND AVAILABLE</Badge>
              {demoSupply ? (
                <Badge variant="warning">DEMO SUPPLY</Badge>
              ) : (
                <Badge variant="warning">SUPPLY DATA LIMITED</Badge>
              )}
              <StatusBadge status={gaps.status} />
            </div>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
              {demoSupply
                ? `Demand is available from ${observations || "captured"} NCS observations. Workforce-supply quantities are DEMO / SIMULATED for MVP workflow — illustrative skill gap, not a government shortage determination.`
                : `Demand is available from captured NCS observations. Comparable workforce-supply evidence is currently unavailable.`}
            </p>
          </Card>

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
                  : String(gaps.severeOrHighCount ?? "INSUFFICIENT DATA")
              }
              trend={demoSupply ? "DEMO scenario" : gaps.status}
            />
            <StatCard
              label="Insufficient-data rows"
              value={String(gaps.insufficientDataCount ?? "INSUFFICIENT DATA")}
              trend="Missing supply ≠ zero workers"
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
              {demoSupply ? "Illustrative skill gap (NCS demand vs DEMO supply)" : "Demand-side evidence"}
            </h3>
            {rows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient comparable demand and supply evidence for ranked skill gaps.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <DataTable columns={columns} rows={rows} highlightCount={3} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
