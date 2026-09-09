"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

function BookOpenIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
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

const COURSES_DATA = [
  {
    title: "Advanced Data Engineering Pipelines",
    provider: "NSDC Academy",
    duration: "12 Weeks",
    enrolled: 4210,
    completionRate: 84,
    skills: ["Python", "Spark", "SQL", "Kafka"],
    status: "Active",
  },
  {
    title: "AWS Cloud Solutions Architect Track",
    provider: "IT-ITeS Sector Skills Council",
    duration: "16 Weeks",
    enrolled: 6890,
    completionRate: 79,
    skills: ["AWS", "CloudSec", "Networking"],
    status: "Active",
  },
  {
    title: "Certified Full-Stack Developer (MERN)",
    provider: "NASSCOM Futureskills",
    duration: "24 Weeks",
    enrolled: 12450,
    completionRate: 91,
    skills: ["React", "Node", "MongoDB", "Express"],
    status: "Featured",
  },
  {
    title: "Cybersecurity SOC Analyst Bootcamp",
    provider: "NIELIT Centre",
    duration: "8 Weeks",
    enrolled: 3120,
    completionRate: 72,
    skills: ["SIEM", "Incident Response", "Linux"],
    status: "New",
  },
  {
    title: "AI & Machine Learning Practitioner",
    provider: "AICTE Digital Skilling",
    duration: "20 Weeks",
    enrolled: 5400,
    completionRate: 68,
    skills: ["PyTorch", "Python", "MLOps"],
    status: "Active",
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Course Catalog (DEMO)"
        subtitle="Illustrative NSQF-style catalogue for product walkthrough — not authorized training-capacity evidence. Use Training & Programs for Phase 10–11 intelligence."
      />

      <Card>
        <p className="text-sm" style={{ color: "var(--sp-text-secondary)", margin: 0 }}>
          Enrolment and completion figures below are DEMO placeholders. They are not government statistics.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Active Courses (DEMO)"
          value="DEMO"
          trend="Not official capacity"
          icon={<BookOpenIcon />}
        />
        <StatCard
          label="Total Enrolled (DEMO)"
          value="DEMO"
          trend="Not official enrolment"
          icon={<UsersIcon />}
        />
        <StatCard
          label="Partner Institutes (DEMO)"
          value="DEMO"
          trend="Not official providers"
          icon={<BuildingIcon />}
        />
        <StatCard
          label="Avg Completion Rate (DEMO)"
          value="DEMO"
          trend="Not official outcomes"
          icon={<AwardIcon />}
        />
      </div>

      <Card title="Available Programs" subtitle="Filter by duration, provider, or covered skills" noPadding>
        <DataTable
          columns={[
            { key: "title", label: "Course & Provider" },
            { key: "duration", label: "Duration" },
            { key: "enrolled", label: "Enrolled", align: "right" },
            { key: "skills", label: "Skills Covered" },
            { key: "completion", label: "Completion Rate" },
            { key: "status", label: "Status", align: "center" },
          ]}
          rows={COURSES_DATA.map((course) => ({
            title: (
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                  {course.title}
                </p>
                <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                  {course.provider}
                </p>
              </div>
            ),
            duration: (
              <span className="text-xs font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                {course.duration}
              </span>
            ),
            enrolled: (
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                {course.enrolled.toLocaleString()}
              </span>
            ),
            skills: (
              <div className="flex flex-wrap gap-1">
                {course.skills.map((s) => (
                  <Badge key={s} variant="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
            ),
            completion: (
              <div className="w-32">
                <ProgressBar
                  value={course.completionRate}
                  color={course.completionRate >= 80 ? "success" : "warning"}
                />
              </div>
            ),
            status: (
              <Badge
                variant={
                  course.status === "Featured" ? "accent" :
                  course.status === "New" ? "warning" : "success"
                }
              >
                {course.status}
              </Badge>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
