"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { HeatmapGrid } from "@/components/ui/HeatmapGrid";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
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

const REGIONAL_HEATMAP_DATA = [
  [92, 45, 30, 85, 40],
  [65, 80, 55, 40, 75],
  [40, 60, 85, 60, 35],
  [75, 35, 45, 90, 65],
  [50, 70, 60, 45, 80],
];

const HEATMAP_X = ["Cloud", "DevOps", "AI/ML", "CyberSec", "Data Eng"];
const HEATMAP_Y = ["Maharashtra", "Karnataka", "Telangana", "Delhi NCR", "Tamil Nadu"];

const GAP_DETAILS = [
  {
    skill: "Cybersecurity SOC & Threat Hunting",
    region: "Delhi NCR",
    severity: "Critical",
    demandCount: 3840,
    supplyCount: 1120,
    gapPercentage: 71,
  },
  {
    skill: "MLOps & LLM Deployment",
    region: "Karnataka",
    severity: "High",
    demandCount: 5200,
    supplyCount: 2100,
    gapPercentage: 60,
  },
  {
    skill: "Kubernetes & Multi-Cloud Ops",
    region: "Maharashtra",
    severity: "High",
    demandCount: 4100,
    supplyCount: 1850,
    gapPercentage: 55,
  },
  {
    skill: "Data Pipeline & Real-Time Analytics",
    region: "Telangana",
    severity: "Moderate",
    demandCount: 2900,
    supplyCount: 1650,
    gapPercentage: 43,
  },
];

export default function GapsPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Skill Gap & Disparity Analysis"
        subtitle="Identifying supply-demand shortfalls across regions and domain clusters"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            Run Full Analysis
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Overall Gap Score"
          value="68.5 / 100"
          trend="+4.3"
          trendDirection="up"
          icon={<BarChartIcon />}
        />
        <StatCard
          label="Critical Skill Deficits"
          value="14 Skills"
          trend="-2"
          trendDirection="down"
          icon={<AlertTriangleIcon />}
        />
        <StatCard
          label="Highest Deficit Region"
          value="Delhi NCR"
          trend="71% Gap"
          trendDirection="neutral"
          icon={<MapPinIcon />}
        />
        <StatCard
          label="Est. Resolution Window"
          value="4.2 Months"
          trend="-0.5 mo"
          trendDirection="down"
          icon={<ClockIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card title="Regional Deficit Heatmap" subtitle="Skill shortfall intensity across major tech hubs">
            <HeatmapGrid
              data={REGIONAL_HEATMAP_DATA}
              xLabels={HEATMAP_X}
              yLabels={HEATMAP_Y}
            />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Priority Skill Deficits" subtitle="Highest gap areas requiring intervention" noPadding>
            <DataTable
              columns={[
                { key: "skill", label: "Skill & Region" },
                { key: "severity", label: "Severity", align: "center" },
                { key: "demand", label: "Demand", align: "right" },
                { key: "supply", label: "Supply", align: "right" },
                { key: "gap", label: "Deficit Gap %" },
              ]}
              rows={GAP_DETAILS.map((g) => ({
                skill: (
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                      {g.skill}
                    </p>
                    <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                      {g.region}
                    </p>
                  </div>
                ),
                severity: (
                  <Badge variant={g.severity === "Critical" ? "danger" : g.severity === "High" ? "warning" : "accent"}>
                    {g.severity}
                  </Badge>
                ),
                demand: (
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                    {g.demandCount.toLocaleString()}
                  </span>
                ),
                supply: (
                  <span className="text-xs font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                    {g.supplyCount.toLocaleString()}
                  </span>
                ),
                gap: (
                  <div className="w-36">
                    <ProgressBar
                      value={g.gapPercentage}
                      color={g.gapPercentage >= 70 ? "danger" : g.gapPercentage >= 50 ? "warning" : "accent"}
                    />
                  </div>
                ),
              }))}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
