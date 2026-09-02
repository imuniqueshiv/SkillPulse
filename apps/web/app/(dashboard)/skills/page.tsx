"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ChartBar } from "@/components/ui/ChartBar";
import { ProgressBar } from "@/components/ui/ProgressBar";

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
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

function ShieldCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const SKILLS_BAR_DATA = [
  { label: "Python", value: 92 },
  { label: "React", value: 85 },
  { label: "AWS", value: 78 },
  { label: "Docker", value: 71 },
  { label: "SQL", value: 68 },
  { label: "PyTorch", value: 59 },
  { label: "Go", value: 52 },
  { label: "Rust", value: 41 },
];

const SKILLS_TABLE = [
  {
    name: "Python for Data Science & AI",
    category: "Software & AI",
    demand: "High",
    growth: "+24.5%",
    learners: 18450,
    coverage: 88,
  },
  {
    name: "AWS Cloud Infrastructure",
    category: "Cloud Architecture",
    demand: "High",
    growth: "+19.2%",
    learners: 14200,
    coverage: 76,
  },
  {
    name: "React & Next.js Ecosystem",
    category: "Frontend Development",
    demand: "Medium",
    growth: "+12.8%",
    learners: 16800,
    coverage: 92,
  },
  {
    name: "Cybersecurity & Incident Response",
    category: "Security",
    demand: "Critical",
    growth: "+31.4%",
    learners: 8900,
    coverage: 45,
  },
  {
    name: "Kubernetes Orchestration",
    category: "DevOps & SRE",
    demand: "High",
    growth: "+21.0%",
    learners: 9400,
    coverage: 62,
  },
];

export default function SkillsPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Skill Taxonomy & Competencies"
        subtitle="Standardized skill framework mapped against national market demand"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            + Add Taxonomy Skill
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Tracked Skills"
          value="2,456"
          trend="+18"
          trendDirection="up"
          icon={<ZapIcon />}
        />
        <StatCard
          label="Skill Categories"
          value="48"
          trend="+3"
          trendDirection="up"
          icon={<LayersIcon />}
        />
        <StatCard
          label="Avg YoY Growth"
          value="+17.8%"
          trend="+2.4%"
          trendDirection="up"
          icon={<TrendingUpIcon />}
        />
        <StatCard
          label="Verified Credentials"
          value="98,400"
          trend="+12.5%"
          trendDirection="up"
          icon={<ShieldCheckIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card title="Skill Demand Volume" subtitle="Relative market intensity index">
            <ChartBar data={SKILLS_BAR_DATA} height={260} />
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="Skill Competency Framework" subtitle="Industry demand and regional coverage status" noPadding>
            <DataTable
              columns={[
                { key: "name", label: "Skill Name" },
                { key: "category", label: "Category" },
                { key: "demand", label: "Demand", align: "center" },
                { key: "growth", label: "YoY Growth", align: "right" },
                { key: "coverage", label: "Coverage Level" },
              ]}
              rows={SKILLS_TABLE.map((s) => ({
                name: (
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                      {s.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--sp-text-tertiary)" }}>
                      {s.learners.toLocaleString()} active learners
                    </p>
                  </div>
                ),
                category: (
                  <span className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                    {s.category}
                  </span>
                ),
                demand: (
                  <Badge
                    variant={
                      s.demand === "Critical" ? "danger" :
                      s.demand === "High" ? "warning" : "accent"
                    }
                  >
                    {s.demand}
                  </Badge>
                ),
                growth: (
                  <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-success)" }}>
                    {s.growth}
                  </span>
                ),
                coverage: (
                  <div className="w-36">
                    <ProgressBar
                      value={s.coverage}
                      color={s.coverage >= 80 ? "success" : s.coverage >= 60 ? "accent" : "warning"}
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
