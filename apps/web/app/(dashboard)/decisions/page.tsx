"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  PriorityBadge,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

type SignalRow = {
  priority: string;
  category: string;
  target: string;
  confidence: string;
  action: string;
  signalId: string;
  rationale: string;
};

export default function DecisionsPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const decisions = (overview?.decisions ?? {}) as {
    status?: string;
    highPriorityCount?: number;
    topSignals?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);

  const allRows: SignalRow[] = useMemo(
    () =>
      (decisions.topSignals ?? []).map((s) => ({
        priority: String(s.priority ?? ""),
        category: String(s.category ?? ""),
        target: String(
          (s.target as { skillCanonicalName?: string } | undefined)?.skillCanonicalName ??
            (s.target as { skillId?: string } | undefined)?.skillId ??
            "—",
        ),
        confidence: String(s.confidence ?? ""),
        action: String(s.actionType ?? ""),
        signalId: String(s.signalId ?? ""),
        rationale: String(s.rationale ?? ""),
      })),
    [decisions.topSignals],
  );

  const rows = allRows.filter((row) => {
    if (priority && row.priority !== priority) return false;
    if (category && row.category !== category) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Decision Signals"
        subtitle="Investigation signals for review — not autonomous government decisions. NCS demand + DEMO supply scenario."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeDemo
        includeInsufficient={decisions.status === "INSUFFICIENT_DATA"}
      />

      <Card>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: "0.8125rem" }}>
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
          <label style={{ fontSize: "0.8125rem" }}>
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
          {decisions.highPriorityCount != null ? (
            <span style={{ fontSize: "0.8125rem", color: "var(--sp-text-secondary)" }}>
              {decisions.highPriorityCount} high-priority signals in overview
            </span>
          ) : null}
        </div>
      </Card>

      {unauthorized ? (
        <IntelligenceUnauthorized message="You are not authorized to view decision intelligence." />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : rows.length === 0 ? (
        <Card>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
            No sufficient evidence available for this view. Filters do not re-run the
            decision pipeline.
          </p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {rows.map((row) => (
            <Card key={row.signalId || `${row.priority}-${row.target}`}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "0.75rem",
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--sp-text-secondary)", letterSpacing: "0.04em" }}>
                    SIGNAL
                  </div>
                  <div style={{ fontWeight: 600, marginTop: "0.25rem" }}>{row.target}</div>
                  <Badge variant="neutral">{row.category || "—"}</Badge>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--sp-text-secondary)", letterSpacing: "0.04em" }}>
                    PRIORITY
                  </div>
                  <div style={{ marginTop: "0.25rem" }}>
                    <PriorityBadge priority={row.priority} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--sp-text-secondary)", letterSpacing: "0.04em" }}>
                    ACTION
                  </div>
                  <div style={{ marginTop: "0.35rem", fontSize: "0.875rem" }}>{row.action || "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--sp-text-secondary)", letterSpacing: "0.04em" }}>
                    EVIDENCE
                  </div>
                  <div style={{ marginTop: "0.35rem", fontSize: "0.8125rem", color: "var(--sp-text-secondary)" }}>
                    {row.rationale || "INSUFFICIENT DATA"}
                  </div>
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <StatusBadge status={row.confidence} />
                    {row.signalId ? (
                      <Link
                        href={`/decisions/${encodeURIComponent(row.signalId)}`}
                        className="text-[var(--sp-accent)] underline text-sm"
                      >
                        Explain
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
