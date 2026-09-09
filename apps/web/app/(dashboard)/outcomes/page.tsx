"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import {
  fetchIntelligenceOverview,
  IntelligenceApiError,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  formatMetric,
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceLoading,
  LimitationsPanel,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

type EmploymentView = {
  status?: string;
  note?: string | null;
  trainingToEmployment?: { status?: string; value?: number | null };
  trainingToPlacement?: { status?: string; value?: number | null };
  certificationToEmployment?: { status?: string; value?: number | null };
  totals?: {
    trained?: number;
    certified?: number;
    placed?: number;
    employed?: number;
    uniqueLearners?: number;
  };
  skillUtilization?: {
    knownOutcomes?: number;
    full?: number;
    unknown?: number;
    rate?: number | null;
  };
  evidenceCoverage?: { totalObservations?: number };
};

function pct(status: string | undefined, value: number | null | undefined): string {
  if (status === "INSUFFICIENT_DATA" || value == null) {
    return "Insufficient data";
  }
  return `${Math.round(value * 100)}%`;
}

export default function OutcomesPage() {
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employment, setEmployment] = useState<EmploymentView | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

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
        setEmployment((result.data.employment as EmploymentView) ?? null);
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

  const totals = employment?.totals ?? {};
  const observations = employment?.evidenceCoverage?.totalObservations ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Employment Outcomes"
        subtitle="Phase 12 observational outcomes. TRAINED, CERTIFIED, PLACED, EMPLOYED, and SKILL_UTILIZED are distinct — SkillPulse does not claim causality."
      />

      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : !employment ? (
        <IntelligenceEmpty />
      ) : (
        <>
          <Card>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge status={employment.status} />
              <span style={{ fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
                {employment.note ??
                  (observations === 0
                    ? "No authorized employment observations in this period."
                    : `${observations} employment observations.`)}
              </span>
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatCard
              label="Trained (exclusive)"
              value={formatMetric(employment.status, totals.trained)}
              trend="TRAINED ≠ placed"
            />
            <StatCard
              label="Certified (exclusive)"
              value={formatMetric(employment.status, totals.certified)}
              trend="Never inferred from placement"
            />
            <StatCard
              label="Placed (exclusive)"
              value={formatMetric(employment.status, totals.placed)}
              trend="PLACED ≠ currently employed"
            />
            <StatCard
              label="Employed (exclusive)"
              value={formatMetric(employment.status, totals.employed)}
              trend="Observational count"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
            }}
          >
            <StatCard
              label="Training → placement"
              value={pct(
                employment.trainingToPlacement?.status,
                employment.trainingToPlacement?.value,
              )}
              trend={employment.trainingToPlacement?.status}
            />
            <StatCard
              label="Training → employment"
              value={pct(
                employment.trainingToEmployment?.status,
                employment.trainingToEmployment?.value,
              )}
              trend={employment.trainingToEmployment?.status}
            />
            <StatCard
              label="Certification → employment"
              value={pct(
                employment.certificationToEmployment?.status,
                employment.certificationToEmployment?.value,
              )}
              trend={employment.certificationToEmployment?.status}
            />
            <StatCard
              label="Skill utilized (known)"
              value={formatMetric(
                employment.status,
                employment.skillUtilization?.full,
              )}
              trend={
                employment.skillUtilization?.rate == null
                  ? "INSUFFICIENT_DATA"
                  : `mean ratio ${employment.skillUtilization.rate}`
              }
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>Evidence notes</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
              Rates are withheld when cohort linkage or denominators are missing. Zero exclusive
              counts with INSUFFICIENT_DATA status means no authorized outcome dataset — not a
              verified 0% placement rate. Demo employment fixtures, if present in evaluation, are
              not government placement statistics.
            </p>
          </Card>

          <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
        </>
      )}
    </div>
  );
}
