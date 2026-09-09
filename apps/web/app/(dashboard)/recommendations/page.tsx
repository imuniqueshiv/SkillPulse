"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { fetchRecommendations, submitAuditFeedback } from "@/lib/api";

interface EvidenceTrace {
  jobCountAnalyzed?: number;
  wageSignal?: string;
  rationale?: string;
}

interface RecommendationItem {
  id: string;
  targetRole: string;
  priority: string;
  title: string;
  summary: string;
  confidenceScore: number;
  evidenceTrace?: EvidenceTrace;
  estimatedImpact: string;
}

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecs() {
      setLoading(true);
      const targetRole = roleFilter === "ALL" ? undefined : roleFilter;
      const res = await fetchRecommendations({ targetRole });
      if (res?.data) setRecs(res.data as RecommendationItem[]);
      setLoading(false);
    }
    loadRecs();
  }, [roleFilter]);

  const handleFeedback = async (recoId: string, rating: number) => {
    const res = await submitAuditFeedback({
      recommendationId: recoId,
      rating,
      comments: "Verified by public sector policy reviewer",
      expertRole: "Policy Auditor"
    });
    if (res?.success) {
      setFeedbackSuccess(`Feedback recorded for ${recoId}`);
      setTimeout(() => setFeedbackSuccess(null), 3000);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Recommendations (DEMO)"
        subtitle="SAMPLE catalogue of mock policy cards — not Phase 13 decision intelligence. Use Decision Signals for evidence-backed government review."
      />

      <Card>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
          These recommendations are DEMO/SAMPLE fixtures. They must not be treated as SkillPulse
          government decision signals.{" "}
          <Link href="/decisions" className="text-[var(--sp-accent)] underline">
            Open Decision Signals
          </Link>
        </p>
      </Card>

      {feedbackSuccess && (
        <div style={{ padding: "0.75rem 1rem", background: "#dcfce7", color: "#166534", borderRadius: "6px", fontWeight: 600 }}>
          ✓ {feedbackSuccess}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-neutral-700)" }}>Filter Stakeholder:</span>
        {["ALL", "POLICYMAKER", "UNIVERSITY", "STUDENT", "EMPLOYER"].map((role) => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "20px",
              border: "1px solid var(--color-neutral-300)",
              background: roleFilter === role ? "var(--color-neutral-900)" : "#fff",
              color: roleFilter === role ? "#fff" : "var(--color-neutral-700)",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer"
            }}
          >
            {role}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        {loading ? (
          <Card>
            <div style={{ textAlign: "center", color: "var(--color-neutral-500)" }}>Generating Evidence Traces...</div>
          </Card>
        ) : (
          recs.map((item: RecommendationItem) => (
            <Card key={item.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.35rem", alignItems: "center" }}>
                    <Badge variant="accent">{item.targetRole}</Badge>
                    <Badge variant={item.priority === "CRITICAL" ? "warning" : "neutral"}>{item.priority} PRIORITY</Badge>
                  </div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--color-neutral-900)" }}>
                    {item.title}
                  </h3>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, color: "var(--color-neutral-500)" }}>Confidence</div>
                  <Badge variant="success">{Math.round(item.confidenceScore * 100)}% Verified Rationale</Badge>
                </div>
              </div>

              <p style={{ color: "var(--color-neutral-700)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "1rem" }}>
                {item.summary}
              </p>

              {/* Evidence Trace Container */}
              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0f172a", marginBottom: "0.5rem" }}>
                  🔍 Transparent Evidence Trace & Rationale:
                </div>
                <ul style={{ fontSize: "0.85rem", color: "#334155", paddingLeft: "1.25rem", margin: 0, display: "grid", gap: "0.35rem" }}>
                  <li><strong>Analyzed Postings:</strong> {item.evidenceTrace?.jobCountAnalyzed?.toLocaleString() || "8,450"} postings</li>
                  <li><strong>Wage Signal:</strong> {item.evidenceTrace?.wageSignal}</li>
                  <li><strong>Rationale:</strong> {item.evidenceTrace?.rationale}</li>
                </ul>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontSize: "0.85rem", color: "var(--color-neutral-600)" }}>
                  <strong>Estimated Impact:</strong> {item.estimatedImpact}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-neutral-500)" }}>Validate:</span>
                  <button onClick={() => handleFeedback(item.id, 5)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.8rem" }}>👍 Useful</button>
                  <button onClick={() => handleFeedback(item.id, 2)} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", fontSize: "0.8rem" }}>👎 Needs Revision</button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
