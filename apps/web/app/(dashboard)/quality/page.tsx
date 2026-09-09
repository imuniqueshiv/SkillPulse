"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  fetchQualityIntelligence,
  IntelligenceApiError,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  formatMetric,
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
  LimitationsPanel,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function QualityPage() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    void (async () => {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const token = await resolveAccessToken(getToken);
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchQualityIntelligence(token);
        setData(result.data);
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
  }, [getToken, isLoaded]);

  const freshness = (data?.freshness ?? {}) as Record<string, number>;
  const eligibility = (data?.eligibility ?? {}) as Record<string, number>;
  const interpretation = (data?.interpretation as string[]) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Data Quality"
        subtitle="Phase 7 quality assessments for analytical trust. Percentages are not manufactured."
      />
      {loading ? (
        <IntelligenceLoading />
      ) : unauthorized ? (
        <IntelligenceUnauthorized message="You are not authorized to view data quality intelligence." />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : !data || data.status === "INSUFFICIENT_DATA" ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <StatusBadge status={String(data.status)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <StatCard
              label="PROCESSED assessments"
              value={formatMetric(String(data.status), data.total as number)}
              trend={String(data.assessmentVersion ?? "")}
              icon={<StatusBadge status={String(data.status)} />}
            />
            <StatCard
              label="Fresh"
              value={formatMetric("AVAILABLE", freshness.FRESH ?? 0)}
              trend={`Aging ${freshness.AGING ?? 0}`}
              icon={<StatusBadge status="AVAILABLE" />}
            />
            <StatCard
              label="Stale"
              value={formatMetric("AVAILABLE", freshness.STALE ?? 0)}
              trend={`Unknown ${freshness.UNKNOWN ?? 0}`}
              icon={<StatusBadge status="AVAILABLE" />}
            />
            <StatCard
              label="EXCLUDE"
              value={formatMetric("AVAILABLE", eligibility.EXCLUDE ?? 0)}
              trend={`INCLUDE ${eligibility.INCLUDE ?? 0}`}
              icon={<StatusBadge status="AVAILABLE" />}
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Interpretation</h3>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
              {interpretation.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>
                Employment evidence is incomplete when Phase 12 observations are absent.
                Decision signals involving employment should be interpreted with caution.
              </li>
            </ul>
          </Card>

          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
