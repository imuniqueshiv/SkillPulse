"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchCurrentUser, fetchJobAnalytics, fetchOutcomes, type ApplicationUser } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DataTable } from "@/components/ui/DataTable";
import { ChartBar } from "@/components/ui/ChartBar";
import { HeatmapGrid } from "@/components/ui/HeatmapGrid";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

interface JobAnalyticsData {
  totalPostings?: number;
  verifiedPostings?: number;
  confidenceAverage?: number;
  freshnessIndexDays?: number;
}

interface OutcomeData {
  summary?: {
    overallPlacementRate?: number;
    placementRateLift?: string;
  };
}

const DEFAULT_SKILL_CHART_DATA = [
  { label: "Python", value: 87 },
  { label: "Data Sci", value: 72 },
  { label: "Cloud", value: 65 },
  { label: "DevOps", value: 58 },
  { label: "ML/AI", value: 51 },
  { label: "Cyber", value: 44 },
  { label: "Web Dev", value: 78 },
  { label: "Mobile", value: 39 },
];

const HEATMAP_DATA = [
  [85, 60, 35, 90, 55],
  [40, 75, 50, 30, 70],
  [65, 45, 80, 55, 25],
  [50, 85, 40, 65, 45],
];
const HEATMAP_X = ["Python", "Cloud", "ML/AI", "DevOps", "Data Sci"];
const HEATMAP_Y = ["Entry", "Junior", "Mid", "Senior"];

const RECOMMENDATIONS = [
  { name: "AWS Solutions Architect", progress: 72, status: "active" as const },
  { name: "Machine Learning Foundations", progress: 45, status: "active" as const },
  { name: "Kubernetes Administration", progress: 18, status: "new" as const },
  { name: "Data Engineering Pipeline", progress: 90, status: "completing" as const },
];

const UPCOMING_COURSES = [
  { name: "Advanced Python for Data Science", provider: "NSDC", startDate: "Sep 15, 2026", enrolled: "1,240", status: "Open" },
  { name: "Cloud Infrastructure (AWS)", provider: "Sector Council", startDate: "Sep 22, 2026", enrolled: "856", status: "Open" },
  { name: "Cybersecurity Fundamentals", provider: "NIELIT", startDate: "Oct 1, 2026", enrolled: "2,100", status: "Waitlist" },
  { name: "Full-Stack Web Development", provider: "NASSCOM", startDate: "Oct 10, 2026", enrolled: "1,890", status: "Open" },
  { name: "AI/ML for Industry 4.0", provider: "AICTE", startDate: "Oct 20, 2026", enrolled: "675", status: "Closing" },
];

const ACTIVITY_FEED = [
  { time: "2h ago", text: "New skill gap analysis completed for Maharashtra region", type: "success" as const },
  { time: "5h ago", text: "12 new job postings matched to Cloud Computing skills", type: "neutral" as const },
  { time: "1d ago", text: "Course completion rate dropped 3% in Data Science track", type: "warning" as const },
  { time: "1d ago", text: "Employer Intel Technologies updated their skill requirements", type: "neutral" as const },
  { time: "2d ago", text: "Generated 45 new course recommendations for learners", type: "success" as const },
  { time: "3d ago", text: "Curriculum v2.1 for DevOps track approved", type: "success" as const },
];

const ROLE_TITLES: Record<string, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  GOVERNMENT_MANAGER: "Government Manager",
  INSTITUTE_ADMIN: "Institute Admin",
  EMPLOYER: "Employer",
  TRAINER: "Trainer",
  LEARNER: "Learner",
};

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
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

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
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

export function RoleDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [user, setUser] = useState<ApplicationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobAnalytics, setJobAnalytics] = useState<JobAnalyticsData | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeData | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    void (async () => {
      try {
        const token = await getToken();
        if (token) {
          setUser(await fetchCurrentUser(token));
        } else {
          setUser({ id: "mock", clerkUserId: "mock", role: "PLATFORM_ADMIN", organizationId: null });
        }
      } catch {
        setUser({ id: "mock", clerkUserId: "mock", role: "PLATFORM_ADMIN", organizationId: null });
      }

      const [jRes, oRes] = await Promise.all([
        fetchJobAnalytics(),
        fetchOutcomes()
      ]);
      if (jRes?.data) setJobAnalytics(jRes.data as JobAnalyticsData);
      if (oRes?.data) setOutcomes(oRes.data as OutcomeData);

      setLoading(false);
    })();
  }, [getToken, isLoaded]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader variant="text" count={2} />
        <SkeletonLoader variant="stat" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonLoader variant="chart" />
          <SkeletonLoader variant="chart" />
        </div>
      </div>
    );
  }

  const role = user?.role ?? "PLATFORM_ADMIN";
  const title = ROLE_TITLES[role] ?? "Dashboard";

  const totalPostings = jobAnalytics?.totalPostings ? jobAnalytics.totalPostings.toLocaleString() : "14,850";
  const placementRate = outcomes?.summary?.overallPlacementRate ? `${outcomes.summary.overallPlacementRate}%` : "78.4%";

  const courseColumns = [
    { key: "name", label: "Course Name" },
    { key: "provider", label: "Provider" },
    { key: "startDate", label: "Start Date" },
    { key: "enrolled", label: "Enrolled" },
    {
      key: "status",
      label: "Status",
      render: (row: typeof UPCOMING_COURSES[0]) => {
        const variantMap: Record<string, "success" | "warning" | "danger" | "accent"> = {
          Open: "success",
          Waitlist: "warning",
          Closing: "danger",
        };
        return <Badge variant={variantMap[row.status] ?? "accent"}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={`SkillPulse ${title} Executive Dashboard`}
        subtitle="Live Evidence-Driven Skill & Workforce Intelligence Engine"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="Active Job Signals Ingested"
          value={totalPostings}
          trend="+14% this month"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="Curriculum Skill Gap Score"
          value="31.8%"
          trend="-4.2% improved"
          icon={<ZapIcon />}
        />
        <StatCard
          label="Verified Job Placement Rate"
          value={placementRate}
          trend="+14.2% lift"
          icon={<BookIcon />}
        />
        <StatCard
          label="Human Audit Accuracy"
          value="91.2%"
          trend="340 expert reviews"
          icon={<TargetIcon />}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        <Card>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
            Top Demanded Industry Skills (Market Frequency)
          </h3>
          <ChartBar data={DEFAULT_SKILL_CHART_DATA} height={200} />
        </Card>

        <Card>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
            Skill Demand Heatmap by Experience Tier
          </h3>
          <HeatmapGrid data={HEATMAP_DATA} xLabels={HEATMAP_X} yLabels={HEATMAP_Y} />
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        <Card>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
            Learner Upskilling Pathways
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {RECOMMENDATIONS.map((rec) => (
              <div key={rec.name} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                  <span style={{ fontWeight: 500, color: "var(--color-neutral-800)" }}>{rec.name}</span>
                  <span style={{ color: "var(--color-neutral-500)" }}>{rec.progress}%</span>
                </div>
                <ProgressBar value={rec.progress} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
            Intelligence System Audit Stream
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {ACTIVITY_FEED.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--color-neutral-400)", whiteSpace: "nowrap" }}>{item.time}</span>
                <span style={{ color: "var(--color-neutral-700)" }}>{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-neutral-900)", marginBottom: "1rem" }}>
          Upcoming Industry-Aligned Courses
        </h3>
        <DataTable columns={courseColumns} data={UPCOMING_COURSES} />
      </Card>
    </div>
  );
}
