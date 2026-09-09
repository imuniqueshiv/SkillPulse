"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function LayersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
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

const CURRICULA_DATA = [
  {
    title: "National DevOps & Cloud Engineering Pathway",
    targetRole: "Cloud Engineer / DevOps Specialist",
    modules: 6,
    milestones: 12,
    completion: 82,
    version: "v2.4",
    status: "Approved",
  },
  {
    title: "Full-Stack Web Development NSQF Level 6",
    targetRole: "Full-Stack Software Engineer",
    modules: 8,
    milestones: 16,
    completion: 88,
    version: "v3.1",
    status: "Approved",
  },
  {
    title: "Artificial Intelligence & ML Specialist Pathway",
    targetRole: "AI / ML Engineer",
    modules: 10,
    milestones: 20,
    completion: 64,
    version: "v1.2",
    status: "Under Review",
  },
  {
    title: "Cybersecurity Analyst Competency Track",
    targetRole: "SOC Security Analyst",
    modules: 5,
    milestones: 10,
    completion: 76,
    version: "v2.0",
    status: "Approved",
  },
];

export default function CurriculaPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Curriculum Pathways (DEMO)"
        subtitle="Hardcoded SAMPLE qualification packs — not Phase 10 curriculum intelligence. Use Training & Programs for Phase 10–11."
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            + Design Curriculum
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Active Curricula (DEMO)"
          value="64"
          trend="+6"
          trendDirection="up"
          icon={<LayersIcon />}
        />
        <StatCard
          label="Mapped Roles"
          value="120"
          trend="+14"
          trendDirection="up"
          icon={<TargetIcon />}
        />
        <StatCard
          label="Milestones Defined"
          value="320"
          trend="+42"
          trendDirection="up"
          icon={<FlagIcon />}
        />
        <StatCard
          label="Certification Rate"
          value="84.2%"
          trend="+2.8%"
          trendDirection="up"
          icon={<CheckCircleIcon />}
        />
      </div>

      <Card title="Approved Pathways" subtitle="Browse structured learning modules and qualification packs" noPadding>
        <DataTable
          columns={[
            { key: "title", label: "Pathway Title & Target Role" },
            { key: "version", label: "Version" },
            { key: "modules", label: "Modules", align: "center" },
            { key: "milestones", label: "Milestones", align: "center" },
            { key: "completion", label: "Completion Rate" },
            { key: "status", label: "Approval Status", align: "center" },
          ]}
          rows={CURRICULA_DATA.map((c) => ({
            title: (
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                  {c.title}
                </p>
                <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                  Target: {c.targetRole}
                </p>
              </div>
            ),
            version: (
              <Badge variant="neutral">
                {c.version}
              </Badge>
            ),
            modules: (
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                {c.modules}
              </span>
            ),
            milestones: (
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                {c.milestones}
              </span>
            ),
            completion: (
              <div className="w-36">
                <ProgressBar
                  value={c.completion}
                  color={c.completion >= 80 ? "success" : "accent"}
                />
              </div>
            ),
            status: (
              <Badge
                variant={
                  c.status === "Approved" ? "success" : "warning"
                }
              >
                {c.status}
              </Badge>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
