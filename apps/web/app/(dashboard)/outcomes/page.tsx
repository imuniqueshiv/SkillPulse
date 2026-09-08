"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { fetchOutcomes } from "@/lib/api";

interface DistrictRecord extends Record<string, unknown> {
  district: string;
  placementRate: number;
  traineesCount: number;
  topSector: string;
}

interface OutcomeSummary {
  overallPlacementRate?: number;
  placementRateLift?: string;
  wageGrowthPercentage?: string;
  averageTimeToHireDays?: number;
  skillMatchAccuracy?: number;
}

interface OutcomesData {
  summary?: OutcomeSummary;
  districtBreakdown?: DistrictRecord[];
}

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function OutcomesPage() {
  const [outcomes, setOutcomes] = useState<OutcomesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await fetchOutcomes();
      if (res?.data) setOutcomes(res.data as OutcomesData);
      setLoading(false);
    }
    loadData();
  }, []);

  const summary = outcomes?.summary || {};
  const districtData = outcomes?.districtBreakdown || [];

  const columns = [
    { key: "district", label: "District / Region" },
    {
      key: "placementRate",
      label: "Placement Rate",
      render: (row: DistrictRecord) => <strong style={{ color: "#16a34a" }}>{row.placementRate}%</strong>
    },
    {
      key: "traineesCount",
      label: "Verified Trainees",
      render: (row: DistrictRecord) => row.traineesCount?.toLocaleString()
    },
    { key: "topSector", label: "Primary Hiring Sector" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Outcomes (SAMPLE UI)"
        subtitle="Demo SAMPLE metrics from GET /api/v1/outcomes — not Phase 12 employment-v1 intelligence. Use Decision Signals and Overview for authenticated employment adapters."
      />

      <Card>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
          These values are SAMPLE UI fixtures. They must not be treated as production employment evidence.
        </p>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="Overall Placement Rate (SAMPLE)"
          value={summary.overallPlacementRate != null ? `${summary.overallPlacementRate}%` : "Insufficient data"}
          trend={summary.placementRateLift || "SAMPLE endpoint"}
          icon={<CheckCircleIcon />}
        />
        <StatCard
          label="Average Wage Growth (SAMPLE)"
          value={summary.wageGrowthPercentage || "Insufficient data"}
          trend="SAMPLE endpoint"
          icon={<TrendingUpIcon />}
        />
        <StatCard
          label="Time-to-Hire (SAMPLE)"
          value={summary.averageTimeToHireDays != null ? `${summary.averageTimeToHireDays} days` : "Insufficient data"}
          trend="SAMPLE endpoint"
          icon={<ClockIcon />}
        />
        <StatCard
          label="Skill Match Accuracy (SAMPLE)"
          value={summary.skillMatchAccuracy != null ? `${summary.skillMatchAccuracy}%` : "Insufficient data"}
          trend="SAMPLE endpoint"
          icon={<CheckCircleIcon />}
        />
      </div>

      <Card>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
          Regional District Outcome Performance
        </h3>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-neutral-500)" }}>Loading Outcome Statistics...</div>
        ) : (
          <DataTable columns={columns} data={districtData} />
        )}
      </Card>
    </div>
  );
}
