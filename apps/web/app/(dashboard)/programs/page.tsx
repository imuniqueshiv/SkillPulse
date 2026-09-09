"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

type NeedRow = {
  skillId: string;
  canonicalName: string;
  trainingNeed: string;
  capacityStatus: string;
  intervention: string;
};

export default function ProgramsInstitutesPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();
  const [orgId, setOrgId] = useState("");
  const [courseId, setCourseId] = useState("");

  const training = (overview?.training ?? {}) as {
    status?: string;
    topTrainingNeeds?: Array<Record<string, unknown>>;
  };
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const observations = Number(source.observationCount ?? 0);
  const needs: NeedRow[] = (training.topTrainingNeeds ?? []).map((n) => ({
    skillId: String(n.skillId ?? ""),
    canonicalName: String(n.canonicalName ?? ""),
    trainingNeed: String(n.trainingNeed ?? "INSUFFICIENT_DATA"),
    capacityStatus: String(n.capacityStatus ?? "UNKNOWN"),
    intervention: String(n.intervention ?? "—"),
  }));

  const columns = [
    {
      key: "canonicalName",
      label: "Demand skill",
      render: (row: NeedRow) =>
        row.skillId ? (
          <Link
            href={`/skills/${encodeURIComponent(row.skillId)}`}
            className="text-[var(--sp-accent)] underline"
          >
            {row.canonicalName}
          </Link>
        ) : (
          row.canonicalName
        ),
    },
    { key: "trainingNeed", label: "Training alignment" },
    { key: "intervention", label: "Program / action" },
    { key: "capacityStatus", label: "Provider capacity" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Training & Programs"
        subtitle="Demand skill → training alignment → program → provider. Capacity is not invented."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeDemo
        includeInsufficient={training.status === "INSUFFICIENT_DATA"}
      />

      <Card>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: "0.8125rem" }}>
            Course ID
            <input
              aria-label="Course ID"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem", minWidth: "14rem" }}
            />
          </label>
          <Link
            href={courseId.trim() ? `/courses/${encodeURIComponent(courseId.trim())}` : "#"}
            className="text-[var(--sp-accent)] underline text-sm"
            aria-disabled={!courseId.trim()}
          >
            Open program
          </Link>
          <label style={{ fontSize: "0.8125rem" }}>
            Organization ID
            <input
              aria-label="Organization ID"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem", minWidth: "14rem" }}
            />
          </label>
          <Link
            href={orgId.trim() ? `/programs/institutes/${encodeURIComponent(orgId.trim())}` : "#"}
            className="text-[var(--sp-accent)] underline text-sm"
          >
            Open institute
          </Link>
        </div>
      </Card>

      {unauthorized ? (
        <IntelligenceUnauthorized />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : (
        <Card>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Training need from demand</h3>
            <StatusBadge status={training.status} />
            <Badge variant="warning">DEMO DATA</Badge>
          </div>
          {needs.length === 0 ? (
            <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
              Authorized program capacity is not available. SkillPulse does not invent
              training seats or provider capacity.
            </p>
          ) : (
            <DataTable columns={columns} rows={needs} highlightCount={3} />
          )}
        </Card>
      )}
    </div>
  );
}
