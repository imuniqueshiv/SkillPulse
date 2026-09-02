"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

function BuildingIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8.01" y2="6" />
      <line x1="16" y1="6" x2="16.01" y2="6" />
      <line x1="12" y1="6" x2="12.01" y2="6" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
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

const EMPLOYERS_DATA = [
  {
    name: "Tata Consultancy Services (TCS)",
    sector: "IT & Digital Services",
    location: "Mumbai / PAN India",
    openings: 1420,
    skills: ["Java", "Cloud", "Python", "DevOps"],
    status: "Verified Partner",
  },
  {
    name: "Infosys Technologies",
    sector: "Enterprise Software",
    location: "Bengaluru",
    openings: 980,
    skills: ["React", "AWS", "Full-Stack", "AI"],
    status: "Verified Partner",
  },
  {
    name: "Wipro Digital Solutions",
    sector: "Infrastructure & Cybersecurity",
    location: "Hyderabad",
    openings: 650,
    skills: ["CyberSec", "SIEM", "Kubernetes"],
    status: "Verified Partner",
  },
  {
    name: "Reliance Jio Platforms",
    sector: "Telecommunications & Cloud",
    location: "Navi Mumbai",
    openings: 840,
    skills: ["5G Ops", "Go", "Python", "Data Eng"],
    status: "Verified Partner",
  },
  {
    name: "HCLTech India",
    sector: "Engineering & R&D Services",
    location: "Noida",
    openings: 510,
    skills: ["Embedded Systems", "C++", "Linux"],
    status: "Partner Pending",
  },
];

export default function EmployersPage() {
  return (
    <div className="space-y-6 sp-fade-in">
      <PageHeader
        title="Employer Network & Industry Partners"
        subtitle="Organizations contributing real-time hiring demand and skill validation"
        actions={
          <button
            className="px-4 py-2 text-xs font-medium text-white rounded-md transition-all duration-150 cursor-pointer"
            style={{ background: "var(--sp-accent)" }}
          >
            + Connect Employer Profile
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sp-stagger">
        <StatCard
          label="Verified Employers"
          value="1,240"
          trend="+24"
          trendDirection="up"
          icon={<BuildingIcon />}
        />
        <StatCard
          label="Active Hiring Roles"
          value="3,890"
          trend="+11.5%"
          trendDirection="up"
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="Industry Sectors"
          value="24 Sectors"
          trend="Diverse"
          trendDirection="neutral"
          icon={<GlobeIcon />}
        />
        <StatCard
          label="Monthly Hires"
          value="620 Hires"
          trend="+8.4%"
          trendDirection="up"
          icon={<UserCheckIcon />}
        />
      </div>

      <Card title="Partner Organizations" subtitle="Industry partners providing live market demand" noPadding>
        <DataTable
          columns={[
            { key: "name", label: "Organization & Sector" },
            { key: "location", label: "Headquarters" },
            { key: "openings", label: "Openings", align: "right" },
            { key: "skills", label: "Primary Skills Sought" },
            { key: "status", label: "Verification Status", align: "center" },
          ]}
          rows={EMPLOYERS_DATA.map((e) => ({
            name: (
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--sp-text-primary)" }}>
                  {e.name}
                </p>
                <p className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                  {e.sector}
                </p>
              </div>
            ),
            location: (
              <span className="text-xs" style={{ color: "var(--sp-text-secondary)" }}>
                {e.location}
              </span>
            ),
            openings: (
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--sp-text-primary)" }}>
                {e.openings.toLocaleString()}
              </span>
            ),
            skills: (
              <div className="flex flex-wrap gap-1">
                {e.skills.map((s) => (
                  <Badge key={s} variant="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
            ),
            status: (
              <Badge variant={e.status === "Verified Partner" ? "success" : "warning"}>
                {e.status}
              </Badge>
            ),
          }))}
        />
      </Card>
    </div>
  );
}
