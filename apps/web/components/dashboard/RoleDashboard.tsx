"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchCurrentUser, type ApplicationUser } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DataTable } from "@/components/ui/DataTable";
import { ChartBar } from "@/components/ui/ChartBar";
import { HeatmapGrid } from "@/components/ui/HeatmapGrid";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

const SKILL_CHART_DATA = [
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Missing session token");
          setLoading(false);
          return;
        }
        setUser(await fetchCurrentUser(token));
      } catch {
        setUser({ id: "mock", clerkUserId: "mock", role: "PLATFORM_ADMIN", organizationId: null });
      } finally {
        setLoading(false);
      }
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p style={{ color: "var(--sp-text-secondary)" }}>{error}</p>
        </div>
      </div>
    );
  }

  const roleName = ROLE_TITLES[user?.role ?? "LEARNER"] ?? "Learner";

  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back! Here's your workforce intelligence overview.`}
        actions={
          <Badge variant="accent">{roleName}</Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Active Jobs"
          value="12,847"
          trend="+8.2%"
          trendDirection="up"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="Skills Tracked"
          value="2,456"
          trend="+12"
          trendDirection="up"
          icon={<ZapIcon />}
        />
        <StatCard
          label="Course Completions"
          value="8,934"
          trend="-2.1%"
          trendDirection="down"
          icon={<BookIcon />}
        />
        <StatCard
          label="Avg Gap Score"
          value="68.5"
          trend="+4.3"
          trendDirection="up"
          icon={<TargetIcon />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Skills Distribution" subtitle="Top skills by demand across active job postings">
            <ChartBar data={SKILL_CHART_DATA} height={220} />
          </Card>

          <Card title="Upcoming Courses" subtitle="Next scheduled training programs" noPadding>
            <DataTable
              columns={[
                { key: "name", label: "Course Name" },
                { key: "provider", label: "Provider" },
                { key: "startDate", label: "Start Date" },
                { key: "enrolled", label: "Enrolled", align: "right" },
                { key: "status", label: "Status", align: "center" },
              ]}
              rows={UPCOMING_COURSES.map((c) => ({
                name: (
                  <span style={{ color: "var(--sp-text-primary)", fontWeight: 500 }}>
                    {c.name}
                  </span>
                ),
                provider: c.provider,
                startDate: c.startDate,
                enrolled: c.enrolled,
                status: (
                  <Badge
                    variant={
                      c.status === "Open" ? "success" :
                      c.status === "Waitlist" ? "warning" :
                      c.status === "Closing" ? "danger" : "neutral"
                    }
                  >
                    {c.status}
                  </Badge>
                ),
              }))}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Skill Gap Heatmap" subtitle="Coverage by skill and experience level">
            <HeatmapGrid data={HEATMAP_DATA} xLabels={HEATMAP_X} yLabels={HEATMAP_Y} />
          </Card>

          <Card title="Top Recommendations" subtitle="Suggested learning paths">
            <div className="space-y-4">
              {RECOMMENDATIONS.map((rec) => (
                <div key={rec.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-sm font-medium truncate mr-3"
                      style={{ color: "var(--sp-text-primary)" }}
                    >
                      {rec.name}
                    </span>
                    <Badge
                      variant={
                        rec.status === "completing" ? "success" :
                        rec.status === "new" ? "accent" : "neutral"
                      }
                    >
                      {rec.status === "completing" ? "Completing" :
                       rec.status === "new" ? "New" : "Active"}
                    </Badge>
                  </div>
                  <ProgressBar
                    value={rec.progress}
                    color={
                      rec.progress >= 80 ? "success" :
                      rec.progress >= 50 ? "accent" :
                      rec.progress >= 30 ? "warning" : "danger"
                    }
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent Activity" subtitle="Latest platform events">
            <div className="space-y-3">
              {ACTIVITY_FEED.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        item.type === "success" ? "var(--sp-success)" :
                        item.type === "warning" ? "var(--sp-warning)" :
                        "var(--sp-text-tertiary)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug" style={{ color: "var(--sp-text-secondary)" }}>
                      {item.text}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--sp-text-tertiary)" }}>
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
