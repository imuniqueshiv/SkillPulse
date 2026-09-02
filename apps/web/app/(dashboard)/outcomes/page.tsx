"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ChartBar } from "@/components/ui/ChartBar";
import { ProgressBar } from "@/components/ui/ProgressBar";

function TrendingUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

const PLACEMENT_CHART = [
  { label: "Q1 2025", value: 74 },
  { label: "Q2 2025", value: 78 },
  { label: "Q3 2025", value: 81 },
  { label: "Q4 2025", value: 83 },
  { label: "Q1 2026", value: 85 },
  { label: "Q2 2026", value: 88 },
];

const OUTCOMES_COHORTS = [
  {
    cohortName: "Cloud & DevOps Batch 2026-A",
    institute: "NSDC Partner Institute Pune",
    graduates: 450,
    placed: 396,
    placementRate: 88,
    avgWageHike: "+34%",
    status: "Verified",
  },
  {
    cohortName: "Full-Stack Web Dev 2025-Q4",
    institute: "Futureskills Bengaluru",
    graduates: 820,
    placed: 738,
    placementRate: 90,
    avgWageHike: "+38%",
    status: "Verified",
  },
  {
    cohortName: "Cybersecurity SOC Analysts 2026",
    institute: "NIELIT Centre Delhi",
    graduates: 280,
    placed: 224,
    placementRate: 80,
    avgWageHike: "+28%",
    status: "Verified",
  },
  {
    cohortName: "Data Science & MLOps Cohort 3",
    institute: "IIT Madras Digital Skilling",
    graduates: 320,
    placed: 275,
    placementRate: 86,
    avgWageHike: "+42%",
    status: "Verified",
  },
];

export default function OutcomesPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Labour Market Outcomes & Impact"
        subtitle="Post-training employment rates, wage gains, and long-term career tracking"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            Export Impact Report
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Placement Rate"
          value="86.4%"
          trend="+3.8%"
          trendDirection="up"
          icon={<TrendingUpIcon />}
        />
        <StatCard
          label="Avg Wage Increase"
          value="+32.5%"
          trend="+4.2%"
          trendDirection="up"
          icon={<DollarIcon />}
        />
        <StatCard
          label="Certified Graduates"
          value="24,150"
          trend="+18.2%"
          trendDirection="up"
          icon={<AwardIcon />}
        />
        <StatCard
          label="1-Year Retention"
          value="91.2%"
          trend="+1.4%"
          trendDirection="up"
          icon={<CheckCircleIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card title="Placement Quarterly Trend" subtitle="Percentage of graduates placed within 90 days">
            <ChartBar data={PLACEMENT_CHART} height={260} />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Training Cohort Outcomes" subtitle="Verified placement and wage growth results by cohort" noPadding>
            <DataTable
              columns={[
                { key: "cohort", label: "Cohort & Institute" },
                { key: "graduates", label: "Graduates", align: "right" },
                { key: "wageHike", label: "Avg Wage Hike", align: "right" },
                { key: "rate", label: "Placement Rate" },
                { key: "status", label: "Status", align: "center" },
              ]}
              rows={OUTCOMES_COHORTS.map((c) => ({
                cohort: (
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                      {c.cohortName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                      {c.institute}
                    </p>
                  </div>
                ),
                graduates: (
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                    {c.graduates}
                  </span>
                ),
                wageHike: (
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-success)" }}>
                    {c.avgWageHike}
                  </span>
                ),
                rate: (
                  <div className="w-36">
                    <ProgressBar
                      value={c.placementRate}
                      color={c.placementRate >= 85 ? "success" : "accent"}
                    />
                  </div>
                ),
                status: (
                  <Badge variant="success">
                    {c.status}
                  </Badge>
                ),
              }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
