"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchProgramIntelligence,
  IntelligenceApiError,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  EvidenceList,
  formatMetric,
  IntelligenceError,
  IntelligenceLoading,
  LimitationsPanel,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = String(params.id ?? "");
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded || !courseId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchProgramIntelligence(token, courseId);
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
  }, [getToken, isLoaded, courseId]);

  const program = data?.program as {
    name?: string;
    organization?: { name?: string; id?: string };
    location?: { status?: string; note?: string };
  } | undefined;
  const alignment = data?.marketAlignment as {
    status?: string;
    alignment?: string;
    demandWeightedCoverage?: number | null;
  } | undefined;
  const relevance = data?.instituteRelevance as {
    status?: string;
    relevance?: { level?: string; score?: number };
  } | undefined;
  const employment = data?.employmentOutcomes as {
    status?: string;
    employmentRate?: { status?: string; value?: number | null };
    medianTimeToEmploymentDays?: number | null;
  } | undefined;
  const skills = (data?.curriculumSkills as Array<Record<string, unknown>>) ?? [];
  const evidence = (data?.evidence as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={program?.name ?? "Program intelligence"}
        subtitle={`${program?.organization?.name ?? "Institute"} · course ${courseId}`}
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
              label="Market alignment"
              value={formatMetric(alignment?.status, alignment?.alignment)}
              trend={
                alignment?.demandWeightedCoverage != null
                  ? `coverage ${alignment.demandWeightedCoverage.toFixed(2)}`
                  : alignment?.status
              }
              icon={<StatusBadge status={alignment?.status} />}
            />
            <StatCard
              label="Institute relevance"
              value={formatMetric(relevance?.status, relevance?.relevance?.level)}
              trend={
                relevance?.relevance?.score != null
                  ? `score ${relevance.relevance.score.toFixed(2)}`
                  : relevance?.status
              }
              icon={<StatusBadge status={relevance?.status} />}
            />
            <StatCard
              label="Employment rate"
              value={formatMetric(
                employment?.employmentRate?.status ?? employment?.status,
                employment?.employmentRate?.value != null
                  ? Math.round(employment.employmentRate.value * 100)
                  : null,
                "%",
              )}
              trend={
                employment?.medianTimeToEmploymentDays != null
                  ? `median TTE ${employment.medianTimeToEmploymentDays}d`
                  : employment?.status
              }
              icon={<StatusBadge status={employment?.status} />}
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Location</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
              {program?.location?.status ?? "UNKNOWN"} — {program?.location?.note}
            </p>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Curriculum skills</h3>
            {skills.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                No sufficient evidence available for this view.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {skills.map((s) => (
                  <li key={String(s.skillId)}>
                    {String(s.canonicalName)} ({String(s.skillId)}) — {String(s.coverage)}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Evidence</h3>
            <EvidenceList evidence={evidence as never} />
          </Card>

          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
