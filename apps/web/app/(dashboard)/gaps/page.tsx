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
  formatMetric,
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  LimitationsPanel,
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

  const gaps = (overview?.gaps ?? {}) as {
    status?: string;
    severeOrHighCount?: number;
    insufficientDataCount?: number;
    shortagesCount?: number;
    topPriority?: Array<Record<string, unknown>>;
    coverage?: Record<string, unknown>;
  };

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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Skill Gaps"
        subtitle="Phase 9 demand-vs-supply comparison. Workforce supply is not invented — missing supply is INSUFFICIENT_DATA, not zero."
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
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
              Demand side uses real NCS job observations. Supply/training capacity without an
              authorized source is demo or insufficient — never treated as official government
              workforce statistics.
            </p>
          </Card>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatCard
              label="Severe / high gaps"
              value={formatMetric(gaps.status, gaps.severeOrHighCount)}
              trend={gaps.status}
            />
            <StatCard
              label="Insufficient-data rows"
              value={formatMetric(gaps.status, gaps.insufficientDataCount)}
              trend="Missing supply is not treated as zero"
            />
          </div>
          <StatusBadge status={gaps.status} />
          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Priority gap skills</h3>
            {rows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                Insufficient comparable demand and supply evidence for ranked skill gaps.
              </p>
            ) : (
              <DataTable columns={columns} rows={rows} />
            )}
          </Card>
          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
