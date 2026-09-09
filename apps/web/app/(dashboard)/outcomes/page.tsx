"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useIntelligenceOverview } from "@/lib/useIntelligenceOverview";
import {
  EvidenceNote,
  formatMetric,
  IntelligenceError,
  IntelligenceLoading,
  IntelligenceUnauthorized,
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
    return "INSUFFICIENT DATA";
  }
  return `${Math.round(value * 100)}%`;
}

function outcomeValue(
  employmentStatus: string | undefined,
  value: number | null | undefined,
): string {
  if (employmentStatus === "INSUFFICIENT_DATA" || value == null) {
    return "INSUFFICIENT DATA";
  }
  return formatMetric(employmentStatus, value);
}

export default function OutcomesPage() {
  const { loading, error, unauthorized, overview, meta } = useIntelligenceOverview();
  const employment = (overview?.employment ?? null) as EmploymentView | null;
  const source = (overview?.demandSource ?? {}) as { observationCount?: number };
  const ncsObservations = Number(source.observationCount ?? 0);
  const totals = employment?.totals ?? {};
  const outcomeObservations = employment?.evidenceCoverage?.totalObservations ?? 0;
  const insufficient = employment?.status === "INSUFFICIENT_DATA" || outcomeObservations === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <PageHeader
        title="Employment Outcomes"
        subtitle="TRAINED, CERTIFIED, PLACED, EMPLOYED, and SKILL UTILIZED are distinct observational counts — not causal claims."
      />
      <EvidenceNote
        limitations={meta?.limitations}
        phaseVersions={meta?.phaseVersions}
        observations={ncsObservations || undefined}
        includeDemo
        includeInsufficient={insufficient}
      />

      {unauthorized ? (
        <IntelligenceUnauthorized />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : loading ? (
        <IntelligenceLoading />
      ) : (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={employment?.status} />
            {insufficient ? <Badge variant="warning">INSUFFICIENT DATA</Badge> : null}
            <span style={{ fontSize: "0.8125rem", color: "var(--sp-text-secondary)" }}>
              {insufficient
                ? "No authorized employment observations. Zeros are not shown as placement results."
                : employment?.note}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <StatCard
              label="Trained"
              value={outcomeValue(employment?.status, totals.trained)}
              trend="TRAINED ≠ placed"
            />
            <StatCard
              label="Certified"
              value={outcomeValue(employment?.status, totals.certified)}
              trend="Not inferred from placement"
            />
            <StatCard
              label="Placed"
              value={outcomeValue(employment?.status, totals.placed)}
              trend="PLACED ≠ employed"
            />
            <StatCard
              label="Employed"
              value={outcomeValue(employment?.status, totals.employed)}
              trend="Observational count"
            />
            <StatCard
              label="Skill utilized"
              value={
                employment?.skillUtilization?.rate == null || insufficient
                  ? "INSUFFICIENT DATA"
                  : formatMetric(employment?.status, employment.skillUtilization.full)
              }
              trend="Known utilization only"
            />
          </div>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Conversion rates</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <StatCard
                label="Training → placement"
                value={pct(
                  employment?.trainingToPlacement?.status,
                  employment?.trainingToPlacement?.value,
                )}
                trend={employment?.trainingToPlacement?.status}
              />
              <StatCard
                label="Training → employment"
                value={pct(
                  employment?.trainingToEmployment?.status,
                  employment?.trainingToEmployment?.value,
                )}
                trend={employment?.trainingToEmployment?.status}
              />
              <StatCard
                label="Certification → employment"
                value={pct(
                  employment?.certificationToEmployment?.status,
                  employment?.certificationToEmployment?.value,
                )}
                trend={employment?.certificationToEmployment?.status}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
