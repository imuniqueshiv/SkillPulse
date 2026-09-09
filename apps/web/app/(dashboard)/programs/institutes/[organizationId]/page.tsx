"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchInstituteIntelligence,
  IntelligenceApiError,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  EvidenceList,
  formatMetric,
  IntelligenceError,
  IntelligenceLoading,
  EvidenceNote,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function InstituteIntelligencePage() {
  const params = useParams();
  const organizationId = String(params.organizationId ?? "");
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded || !organizationId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await resolveAccessToken(getToken);
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchInstituteIntelligence(token, organizationId);
        setData(result.data);
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
  }, [getToken, isLoaded, organizationId]);

  const institute = data?.institute as {
    name?: string;
    type?: string;
    location?: { status?: string; note?: string };
  } | undefined;
  const capability = data?.capability as {
    status?: string;
    capabilityScore?: { score?: number };
    confidence?: string;
    activeProgramCount?: number;
  } | undefined;
  const programs = (data?.programs as Array<Record<string, unknown>>) ?? [];
  const employment = data?.employmentOutcomes as { status?: string } | undefined;
  const evidence = (data?.evidence as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={institute?.name ?? "Institute intelligence"}
        subtitle={`${institute?.type ?? "Organization"} · ${organizationId}`}
      />
      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : !data ? (
        <IntelligenceError />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <StatCard
              label="Capability"
              value={formatMetric(
                capability?.status,
                capability?.capabilityScore?.score != null
                  ? capability.capabilityScore.score.toFixed(2)
                  : null,
              )}
              trend={capability?.confidence}
              icon={<StatusBadge status={capability?.status} />}
            />
            <StatCard
              label="Active programs"
              value={formatMetric(
                capability?.status,
                capability?.activeProgramCount,
              )}
              trend={employment?.status}
              icon={<StatusBadge status={employment?.status} />}
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Location</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
              {institute?.location?.status ?? "UNKNOWN"} —{" "}
              {institute?.location?.note ??
                "Geography is not fabricated from skill-gap context."}
            </p>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Programs</h3>
            {programs.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                No sufficient evidence available for this view.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {programs.map((p) => (
                  <li key={String(p.programId)}>
                    {String(p.courseName)} ({String(p.courseId)}) — relevance{" "}
                    {String((p.relevance as { level?: string } | undefined)?.level ?? "—")}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Evidence</h3>
            <EvidenceList evidence={evidence as never} />
          </Card>

          <EvidenceNote limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} includeDemo />
        </>
      )}
    </div>
  );
}
