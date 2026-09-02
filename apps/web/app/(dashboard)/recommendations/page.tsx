"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function CompassIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
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

const RECOMMENDATION_CARDS = [
  {
    title: "AWS Cloud Solutions Architect Pathway",
    category: "Cloud Infrastructure",
    matchScore: 96,
    estTime: "6 Weeks",
    impact: "+35% Hiring Likelihood",
    skills: ["AWS EC2/S3", "Terraform", "CloudSec"],
    description: "High market demand in Bengaluru & Hyderabad. Fills critical infrastructure engineering deficit.",
  },
  {
    title: "Machine Learning & MLOps Certification",
    category: "Artificial Intelligence",
    matchScore: 92,
    estTime: "8 Weeks",
    impact: "+42% Salary Potential",
    skills: ["PyTorch", "MLflow", "Docker", "Python"],
    description: "Aligns with recent surge in Enterprise AI job postings across top technology employers.",
  },
  {
    title: "Full-Stack Web Engineering (React + Next.js)",
    category: "Software Development",
    matchScore: 88,
    estTime: "4 Weeks",
    impact: "High Placement Rate",
    skills: ["Next.js", "TypeScript", "Tailwind", "PostgreSQL"],
    description: "Recommended bridge course for junior developers seeking mid-level software engineering roles.",
  },
];

export default function RecommendationsPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="AI-Powered Recommendations"
        subtitle="Intelligent learning path suggestions based on market gaps and career goals"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            Refresh AI Engine
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Recommended Paths"
          value="18 Active"
          trend="+3 new"
          trendDirection="up"
          icon={<CompassIcon />}
        />
        <StatCard
          label="AI Match Confidence"
          value="94.2%"
          trend="+1.5%"
          trendDirection="up"
          icon={<CpuIcon />}
        />
        <StatCard
          label="Skill Bridge Score"
          value="82 / 100"
          trend="+6"
          trendDirection="up"
          icon={<ZapIcon />}
        />
        <StatCard
          label="Avg Salary Impact"
          value="+28.5%"
          trend="High"
          trendDirection="up"
          icon={<TrendingUpIcon />}
        />
      </div>

      <div className="space-y-4">
        {RECOMMENDATION_CARDS.map((rec) => (
          <Card key={rec.title}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="accent">{rec.category}</Badge>
                  <Badge variant="success">{rec.impact}</Badge>
                  <span className="text-xs font-mono" style={{ color: "var(--sp-text-tertiary)" }}>
                    Est. Duration: {rec.estTime}
                  </span>
                </div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                  {rec.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--sp-text-secondary)" }}>
                  {rec.description}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {rec.skills.map((s) => (
                    <Badge key={s} variant="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 min-w-[200px]">
                <div className="w-full">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "var(--sp-text-secondary)" }}>AI Match Confidence</span>
                    <span className="font-mono font-bold" style={{ color: "var(--sp-accent)" }}>
                      {rec.matchScore}%
                    </span>
                  </div>
                  <ProgressBar value={rec.matchScore} color="accent" />
                </div>
                <button
                  className="w-full px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
                  style={{ background: "var(--sp-accent)" }}
                >
                  Enroll in Pathway
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
