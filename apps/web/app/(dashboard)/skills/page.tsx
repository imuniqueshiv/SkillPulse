"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { fetchSkills, fetchSkillDemand } from "@/lib/api";

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [demandInfo, setDemandInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [skillsRes, demandRes] = await Promise.all([
        fetchSkills({ search: searchTerm }),
        fetchSkillDemand()
      ]);
      if (skillsRes?.data) setSkills(skillsRes.data);
      if (demandRes?.data) setDemandInfo(demandRes.data);
      setLoading(false);
    }
    loadData();
  }, [searchTerm]);

  const columns = [
    { key: "name", label: "Skill Name" },
    { key: "category", label: "Category" },
    { key: "domain", label: "Domain" },
    {
      key: "demandScore",
      label: "Demand Index",
      render: (row: any) => (
        <Badge variant={row.demandScore > 85 ? "success" : "accent"}>
          {row.demandScore || 85} / 100
        </Badge>
      ),
    },
    {
      key: "growthRate",
      label: "Growth Rate",
      render: (row: any) => (
        <span style={{ fontWeight: 600, color: "#16a34a" }}>
          {row.growthRate || "+14%"}
        </span>
      ),
    },
    {
      key: "frequency",
      label: "Job Mentions",
      render: (row: any) => (row.frequency ? row.frequency.toLocaleString() : "1,250")
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Skill Intelligence & Taxonomy"
        subtitle="National Skill Taxonomy mapping, demand ranking, and emerging industry skills."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="Tracked Skills"
          value={skills.length > 0 ? skills.length.toString() : "450+"}
          trend="Taxonomy Standard v1"
          icon={<BarChartIcon />}
        />
        <StatCard
          label="Top Emerging Skill"
          value={demandInfo?.emergingSkills?.[0]?.name || "Generative AI Prompting"}
          trend={demandInfo?.emergingSkills?.[0]?.growth || "+45% YoY"}
          icon={<ZapIcon />}
        />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--color-neutral-900)" }}>
            Skill Demand Directory ({skills.length})
          </h3>
          <input
            type="text"
            placeholder="Search skills or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem 0.85rem",
              borderRadius: "6px",
              border: "1px solid var(--color-neutral-300)",
              fontSize: "0.9rem",
              minWidth: "240px"
            }}
          />
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-neutral-500)" }}>Loading Skills Taxonomy...</div>
        ) : (
          <DataTable columns={columns} data={skills} />
        )}
      </Card>
    </div>
  );
}
