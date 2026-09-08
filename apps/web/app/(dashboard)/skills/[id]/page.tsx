"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchSkillIntelligence,
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

export default function SkillDetailPage() {
  const params = useParams();
  const skillId = String(params.id ?? "");
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded || !skillId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchSkillIntelligence(token, skillId);
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
  }, [getToken, isLoaded, skillId]);

  const skill = data?.skill as { canonicalName?: string; code?: string; id?: string } | undefined;
  const demand = data?.marketDemand as { status?: string; weightedDemand?: number; jobCount?: number } | undefined;
  const gap = data?.skillGap as { status?: string; severity?: string; confidence?: string } | undefined;
  const training = data?.training as { status?: string; trainingNeed?: string; capacityStatus?: string } | undefined;
  const capability = data?.instituteCapability as { status?: string; capabilityStatus?: string } | undefined;
  const employment = data?.employmentOutcomes as {
    status?: string;
    rates?: { trainingToEmployment?: { status?: string; value?: number | null } };
  } | undefined;
  const signals = (data?.decisionSignals as Array<Record<string, unknown>>) ?? [];
  const evidence = (data?.evidence as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={skill?.canonicalName ?? "Skill intelligence"}
        subtitle={`Canonical ID: ${skill?.id ?? skillId}${skill?.code ? ` · code ${skill.code}` : ""}`}
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
              label="Market demand"
              value={formatMetric(demand?.status, demand?.weightedDemand)}
              trend={demand?.jobCount != null ? `${demand.jobCount} jobs` : demand?.status}
              icon={<StatusBadge status={demand?.status} />}
            />
            <StatCard
              label="Skill gap"
              value={formatMetric(gap?.status, gap?.severity)}
              trend={gap?.confidence}
              icon={<StatusBadge status={gap?.status} />}
            />
            <StatCard
              label="Training need"
              value={formatMetric(training?.status, training?.trainingNeed)}
              trend={training?.capacityStatus}
              icon={<StatusBadge status={training?.status} />}
            />
            <StatCard
              label="Employment rate"
              value={formatMetric(
                employment?.rates?.trainingToEmployment?.status ?? employment?.status,
                employment?.rates?.trainingToEmployment?.value != null
                  ? Math.round(employment.rates.trainingToEmployment.value * 100)
                  : null,
                "%",
              )}
              trend={capability?.capabilityStatus ?? employment?.status}
              icon={<StatusBadge status={employment?.status} />}
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Decision signals</h3>
            {signals.length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                No sufficient evidence available for this view.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {signals.map((s) => (
                  <li key={String(s.signalId)}>
                    {String(s.priority)} · {String(s.category)} · {String(s.actionType)}
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
