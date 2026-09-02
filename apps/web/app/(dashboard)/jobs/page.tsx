"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
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

function DollarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function UserCheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

const JOBS_DATA = [
  {
    title: "Senior Full Stack Engineer",
    employer: "TechCorp India",
    location: "Bengaluru (Hybrid)",
    skills: ["React", "Node.js", "PostgreSQL", "AWS"],
    experience: "5-8 yrs",
    salary: "₹24 - 32 LPA",
    status: "Active",
  },
  {
    title: "Cloud Infrastructure Architect",
    employer: "Infosys Cloud Labs",
    location: "Hyderabad (Remote)",
    skills: ["AWS", "Kubernetes", "Terraform", "DevOps"],
    experience: "8+ yrs",
    salary: "₹35 - 45 LPA",
    status: "Active",
  },
  {
    title: "Data Scientist (AI / ML)",
    employer: "Analytics AI Pvt Ltd",
    location: "Pune (On-site)",
    skills: ["Python", "PyTorch", "MLOps", "Scikit-Learn"],
    experience: "3-6 yrs",
    salary: "₹18 - 26 LPA",
    status: "Urgent",
  },
  {
    title: "Cybersecurity Threat Analyst",
    employer: "SecureShield National",
    location: "New Delhi (On-site)",
    skills: ["SIEM", "Network Security", "Python", "SOC"],
    experience: "2-5 yrs",
    salary: "₹14 - 20 LPA",
    status: "Active",
  },
  {
    title: "DevOps Lead Engineer",
    employer: "FinTech Solutions",
    location: "Mumbai (Hybrid)",
    skills: ["Docker", "CI/CD", "Go", "AWS"],
    experience: "6-10 yrs",
    salary: "₹28 - 38 LPA",
    status: "Closing",
  },
];

export default function JobsPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Job Postings & Market Demand"
        subtitle="Real-time labor market signals and employer requirements across regions"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            + Post New Job
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Total Active Jobs"
          value="12,847"
          trend="+14.2%"
          trendDirection="up"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="New Postings (7d)"
          value="1,432"
          trend="+8.5%"
          trendDirection="up"
          icon={<TrendingUpIcon />}
        />
        <StatCard
          label="Avg Annual CTC"
          value="₹18.4 LPA"
          trend="+5.1%"
          trendDirection="up"
          icon={<DollarIcon />}
        />
        <StatCard
          label="Matched Applicants"
          value="48,210"
          trend="+18.9%"
          trendDirection="up"
          icon={<UserCheckIcon />}
        />
      </div>

      <Card title="Active Job Opportunities" subtitle="Filter and explore employer openings" noPadding>
        <DataTable
          columns={[
            { key: "title", label: "Role & Employer" },
            { key: "location", label: "Location" },
            { key: "skills", label: "Key Required Skills" },
            { key: "experience", label: "Experience" },
            { key: "salary", label: "Offered CTC", align: "right" },
            { key: "status", label: "Status", align: "center" },
          ]}
          rows={JOBS_DATA.map((job) => ({
            title: (
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                  {job.title}
                </p>
                <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                  {job.employer}
                </p>
              </div>
            ),
            location: (
              <span className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                {job.location}
              </span>
            ),
            skills: (
              <div className="flex flex-wrap gap-1">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="neutral">
                    {skill}
                  </Badge>
                ))}
              </div>
            ),
            experience: (
              <span className="text-xs font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                {job.experience}
              </span>
            ),
            salary: (
              <span className="text-xs font-semibold font-mono" style={{ color: "var(--sp-text-primary)" }}>
                {job.salary}
              </span>
            ),
            status: (
              <Badge
                variant={
                  job.status === "Active" ? "success" :
                  job.status === "Urgent" ? "warning" : "danger"
                }
              >
                {job.status}
              </Badge>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
