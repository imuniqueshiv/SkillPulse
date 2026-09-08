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
  type IntelligenceMeta,
} from "@/lib/api";
import {
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  LimitationsPanel,
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
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needs, setNeeds] = useState<NeedRow[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<string | undefined>();
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);
  const [orgId, setOrgId] = useState("");
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchIntelligenceOverview(token, { limit: 20 });
        const training = result.data.training as {
          status?: string;
          topTrainingNeeds?: Array<Record<string, unknown>>;
        };
        setTrainingStatus(training?.status);
        setNeeds(
          (training?.topTrainingNeeds ?? []).map((n) => ({
            skillId: String(n.skillId ?? ""),
            canonicalName: String(n.canonicalName ?? ""),
            trainingNeed: String(n.trainingNeed ?? ""),
            capacityStatus: String(n.capacityStatus ?? ""),
            intervention: String(n.intervention ?? ""),
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
      label: "Skill",
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
    { key: "capacityStatus", label: "Capacity" },
    { key: "intervention", label: "Intervention" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Programs & Institutes"
        subtitle="Phase 10–11 training and institute intelligence. Geography is not inferred for courses without location evidence."
      />

      <Card>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Open by canonical ID</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ fontSize: "0.875rem" }}>
            Course ID
            <input
              aria-label="Course ID"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem", minWidth: "16rem" }}
            />
          </label>
          <Link
            href={courseId.trim() ? `/courses/${encodeURIComponent(courseId.trim())}` : "#"}
            className="text-[var(--sp-accent)] underline text-sm"
            aria-disabled={!courseId.trim()}
          >
            Open program intelligence
          </Link>
          <label style={{ fontSize: "0.875rem" }}>
            Organization ID
            <input
              aria-label="Organization ID"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              style={{ display: "block", marginTop: "0.25rem", padding: "0.35rem 0.5rem", minWidth: "16rem" }}
            />
          </label>
          <Link
            href={orgId.trim() ? `/programs/institutes/${encodeURIComponent(orgId.trim())}` : "#"}
            className="text-[var(--sp-accent)] underline text-sm"
          >
            Open institute intelligence
          </Link>
        </div>
      </Card>

      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : needs.length === 0 ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <div>
            <StatusBadge status={trainingStatus} />
          </div>
          <Card>
            <h3 style={{ margin: "0 0 1rem", fontSize: "1rem" }}>Top training needs</h3>
            <DataTable columns={columns} rows={needs} />
          </Card>
          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
