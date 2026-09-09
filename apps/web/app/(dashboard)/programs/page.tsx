"use client";

import Link from "next/link";
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

type ProgramRow = {
  courseId: string;
  courseName: string;
  provider: string;
  skills: string;
  evidence: string;
};

export default function ProgramsInstitutesPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();

  const training = (overview?.training ?? {}) as {
    status?: string;
    topTrainingNeeds?: Array<Record<string, unknown>>;
    programs?: Array<Record<string, unknown>>;
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
  const programs: ProgramRow[] = (training.programs ?? []).map((p) => ({
    courseId: String(p.courseId ?? ""),
    courseName: String(p.courseName ?? "—"),
    provider: String(p.organizationName ?? "—"),
    skills: Array.isArray(p.skills) ? p.skills.map(String).join(", ") : "—",
    evidence: p.isDemo ? "DEMO DATA" : "UNVERIFIED",
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", minWidth: 0 }}>
      <PageHeader
        title="Training & Programs"
        subtitle="High-demand skill → training need → program alignment. Capacity is not invented."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={observations || undefined}
        includeDemo
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
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Training need from demand</h3>
              <StatusBadge status={training.status} />
              <Badge variant="warning">DEMO TRAINING DATA</Badge>
            </div>
            {needs.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Authorized program capacity is not available. SkillPulse does not invent
                training seats.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <DataTable
                  highlightCount={3}
                  columns={[
                    {
                      key: "canonicalName",
                      label: "High-demand skill",
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
                    { key: "trainingNeed", label: "Training need" },
                    { key: "intervention", label: "Program alignment" },
                    { key: "capacityStatus", label: "Capacity" },
                  ]}
                  rows={needs}
                />
              </div>
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Demo programs</h3>
            {programs.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                No demo programs seeded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <DataTable
                  columns={[
                    {
                      key: "courseName",
                      label: "Program",
                      render: (row: ProgramRow) =>
                        row.courseId ? (
                          <Link
                            href={`/courses/${encodeURIComponent(row.courseId)}`}
                            className="text-[var(--sp-accent)] underline"
                          >
                            {row.courseName}
                          </Link>
                        ) : (
                          row.courseName
                        ),
                    },
                    { key: "provider", label: "Provider" },
                    { key: "skills", label: "Skills covered" },
                    { key: "evidence", label: "Evidence status" },
                  ]}
                  rows={programs}
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
