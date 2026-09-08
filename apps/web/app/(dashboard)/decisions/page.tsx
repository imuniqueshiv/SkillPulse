"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import {
  fetchDecisionSignals,
  IntelligenceApiError,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  LimitationsPanel,
  PriorityBadge,
} from "@/components/intelligence/IntelligenceStates";

type SignalRow = {
  priority: string;
  category: string;
  target: string;
  confidence: string;
  action: string;
  signalId: string;
};

export default function DecisionsPage() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const token = await getToken();
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchDecisionSignals(token, {
          limit: 20,
          priority: priority || undefined,
          category: category || undefined,
        });
        setRows(
          (result.data.signals ?? []).map((s) => ({
            priority: String(s.priority ?? ""),
            category: String(s.category ?? ""),
            target: String(
              (s.target as { skillCanonicalName?: string } | undefined)
                ?.skillCanonicalName ??
                (s.target as { skillId?: string } | undefined)?.skillId ??
                "—",
            ),
            confidence: String(s.confidence ?? ""),
            action: String(s.actionType ?? ""),
            signalId: String(s.signalId ?? ""),
          })),
        );
        setMeta(result.meta);
      } catch (err) {
        if (err instanceof IntelligenceApiError && err.status === 403) {
          setUnauthorized(true);
        } else {
          setError("Unable to load intelligence.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, isLoaded, priority, category]);

  const columns = useMemo(
    () => [
      {
        key: "priority",
        label: "Priority",
        render: (row: SignalRow) => <PriorityBadge priority={row.priority} />,
      },
      { key: "category", label: "Category" },
      { key: "target", label: "Target" },
      {
        key: "confidence",
        label: "Confidence",
        render: (row: SignalRow) => <Badge variant="neutral">{row.confidence}</Badge>,
      },
      { key: "action", label: "Action" },
      {
        key: "signalId",
        label: "Detail",
        render: (row: SignalRow) =>
          row.signalId ? (
            <Link
              href={`/decisions/${encodeURIComponent(row.signalId)}`}
              className="text-[var(--sp-accent)] underline"
            >
              Explain
            </Link>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Decision Signals"
        subtitle="Phase 13 decision-support signals for investigation and review — not autonomous policy actions."
      />

      <Card>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.875rem" }}>
            Priority
            <select
              aria-label="Filter by priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem" }}
            >
              <option value="">All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
              <option value="INSUFFICIENT_DATA">INSUFFICIENT_DATA</option>
            </select>
          </label>
          <label style={{ fontSize: "0.875rem" }}>
            Category
            <select
              aria-label="Filter by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem" }}
            >
              <option value="">All</option>
              <option value="SKILL_SHORTAGE">SKILL_SHORTAGE</option>
              <option value="TRAINING_CAPACITY">TRAINING_CAPACITY</option>
              <option value="CURRICULUM_ALIGNMENT">CURRICULUM_ALIGNMENT</option>
              <option value="EMPLOYMENT_OUTCOME">EMPLOYMENT_OUTCOME</option>
              <option value="DATA_QUALITY">DATA_QUALITY</option>
              <option value="PROGRAM_REVIEW">PROGRAM_REVIEW</option>
            </select>
          </label>
        </div>
      </Card>

      {loading ? (
        <IntelligenceLoading />
      ) : unauthorized ? (
        <IntelligenceUnauthorized message="You are not authorized to view decision intelligence." />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : rows.length === 0 ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <DataTable columns={columns} rows={rows} />
          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
