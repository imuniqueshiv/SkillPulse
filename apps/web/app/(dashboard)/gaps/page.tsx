"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fetchGapAnalysis } from "@/lib/api";

interface GapItem {
  curriculumId: string;
  curriculumTitle: string;
  institutionType: string;
  gapSeverityScore: number;
  missingSkills?: string[];
  outdatedTopics?: string[];
  rootCauseDiagnosis: string;
}

interface GapResponse {
  averageGapSeverity?: number;
  criticalGapsCount?: number;
  data?: GapItem[];
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

export default function CurriculumGapsPage() {
  const [gapData, setGapData] = useState<GapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGaps() {
      setLoading(true);
      const res = await fetchGapAnalysis();
      if (res) setGapData(res as GapResponse);
      setLoading(false);
    }
    loadGaps();
  }, []);

  const items = gapData?.data || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Curriculum & Industry Gap Analyzer"
        subtitle="Automated alignment scoring between higher education / vocational syllabi and real-time labor market skill signals."
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="Average Gap Severity"
          value={gapData?.averageGapSeverity ? `${gapData.averageGapSeverity}%` : "31.8%"}
          trend="Automated calculation"
          icon={<AlertTriangleIcon />}
        />
        <StatCard
          label="Critical Gaps Flagged"
          value={gapData?.criticalGapsCount ? gapData.criticalGapsCount.toString() : "2"}
          trend="Action recommended"
          icon={<AlertTriangleIcon />}
        />
      </div>

      <div style={{ display: "grid", gap: "1.25rem" }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: "center", color: "var(--color-neutral-500)" }}>Analyzing Curriculum Gaps...</div>
          </Card>
        ) : (
          items.map((item: GapItem) => (
            <Card key={item.curriculumId}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--color-neutral-900)" }}>
                    {item.curriculumTitle}
                  </h3>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-neutral-500)", marginTop: "0.2rem" }}>
                    Institution: {item.institutionType}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 600, color: "var(--color-neutral-500)" }}>
                    Gap Severity Score
                  </div>
                  <Badge variant={item.gapSeverityScore > 35 ? "warning" : "accent"}>
                    {item.gapSeverityScore}% Severity Index
                  </Badge>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#dc2626", marginBottom: "0.4rem" }}>
                    Missing High-Demand Skills
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {item.missingSkills?.map((s: string) => (
                      <Badge key={s} variant="neutral">{s}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#d97706", marginBottom: "0.4rem" }}>
                    Outdated Topics Flagged
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {item.outdatedTopics && item.outdatedTopics.length > 0 ? (
                      item.outdatedTopics.map((t: string) => <Badge key={t} variant="warning">{t}</Badge>)
                    ) : (
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>None flagged</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#334155" }}>
                <strong>Root-Cause Diagnosis:</strong> {item.rootCauseDiagnosis}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
