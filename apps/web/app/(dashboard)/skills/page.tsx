"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
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

export default function SkillsIntelligencePage() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SkillRow[]>([]);
  const [gapRows, setGapRows] = useState<SkillRow[]>([]);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);
  const [status, setStatus] = useState<string | undefined>();

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
        const demand = result.data.demand as {
          status?: string;
          topSkills?: Array<Record<string, unknown>>;
        };
        const gaps = result.data.gaps as {
          topPriority?: Array<Record<string, unknown>>;
        };
        setStatus(demand?.status);
        setRows(
          (demand?.topSkills ?? []).map((s) => ({
            skillId: String(s.skillId ?? ""),
            canonicalName: String(s.canonicalName ?? ""),
            weightedDemand: String(s.weightedDemand ?? "—"),
            jobCount: String(s.jobCount ?? "—"),
            trend: String(s.trend ?? "—"),
          })),
        );
        setGapRows(
          (gaps?.topPriority ?? []).map((s) => ({
            skillId: String(s.skillId ?? ""),
            canonicalName: String(s.canonicalName ?? ""),
            weightedDemand: String(s.shortageQuantity ?? "—"),
            jobCount: String(s.severity ?? "—"),
            trend: String(s.confidence ?? "—"),
          })),
        );
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

  const columns = [
    {
      key: "canonicalName",
      label: "Canonical skill",
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

  const gapColumns = [
    {
      key: "canonicalName",
      label: "Canonical skill",
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
    { key: "jobCount", label: "Severity" },
    { key: "weightedDemand", label: "Shortage qty" },
    { key: "trend", label: "Confidence" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Skill Intelligence"
        subtitle="Canonical skills from Phase 8 demand on captured NCS observations. Display names are not identity keys. Gap rows may use DEMO/insufficient supply."
      />
      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : rows.length === 0 && gapRows.length === 0 ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <StatusBadge status={status} />
          </div>
          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Market demand highlights</h3>
            <DataTable columns={columns} rows={rows} />
          </Card>
          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Priority skill gaps</h3>
            {gapRows.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                No sufficient evidence available for this view.
              </p>
            ) : (
              <DataTable columns={gapColumns} rows={gapRows} />
            )}
          </Card>
          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
