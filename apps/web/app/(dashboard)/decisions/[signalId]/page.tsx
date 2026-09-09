"use client";

import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import {
  fetchDecisionSignalDetail,
  IntelligenceApiError,
  resolveAccessToken,
  type IntelligenceMeta,
} from "@/lib/api";
import {
  EvidenceList,
  IntelligenceError,
  IntelligenceLoading,
  EvidenceNote,
  PriorityBadge,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

export default function DecisionDetailPage() {
  const params = useParams();
  const signalId = decodeURIComponent(String(params.signalId ?? ""));
  const { getToken, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signal, setSignal] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded || !signalId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await resolveAccessToken(getToken);
        if (!token) {
          setError("Unable to load intelligence.");
          return;
        }
        const result = await fetchDecisionSignalDetail(token, signalId);
        setSignal(result.data.signal);
        setMeta(result.meta);
      } catch (err) {
        setError(
          err instanceof IntelligenceApiError
            ? err.message
            : "Unable to load intelligence.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken, isLoaded, signalId]);

  const metrics = (signal?.contributingMetrics ?? {}) as Record<
    string,
    string | number | boolean | null
  >;
  const evidence = (signal?.evidence as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title="Decision signal detail"
        subtitle="Explainable Phase 13 decision-support — why this signal exists."
      />
      {loading ? (
        <IntelligenceLoading />
      ) : error ? (
        <IntelligenceError message={error} />
      ) : !signal ? (
        <IntelligenceError />
      ) : (
        <>
          <Card>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <PriorityBadge priority={String(signal.priority ?? "")} />
              <StatusBadge status={String(signal.confidence ?? "")} />
              <span style={{ fontSize: "0.875rem" }}>{String(signal.category ?? "")}</span>
              <span style={{ fontSize: "0.875rem" }}>{String(signal.actionType ?? "")}</span>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.9375rem" }}>
              {String(signal.rationale ?? "")}
            </p>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--sp-text-secondary)" }}>
              Target:{" "}
              {String(
                (signal.target as { skillCanonicalName?: string } | undefined)
                  ?.skillCanonicalName ??
                  (signal.target as { skillId?: string } | undefined)?.skillId ??
                  "—",
              )}
              {" · Geography: "}
              {signal.geography
                ? JSON.stringify(signal.geography)
                : "UNKNOWN / not evidenced"}
            </p>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Contributing metrics</h3>
            {Object.keys(metrics).length === 0 ? (
              <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
                No sufficient evidence available for this view.
              </p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
                {Object.entries(metrics).map(([k, v]) => (
                  <li key={k}>
                    <strong>{k}</strong>: {v === null || v === undefined ? "null" : String(v)}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Evidence</h3>
            <EvidenceList evidence={evidence as never} />
          </Card>

          <EvidenceNote
            limitations={(signal.limitations as string[]) ?? meta?.limitations}
            phaseVersions={
              (signal.phaseVersions as Record<string, string | null>) ??
              meta?.phaseVersions
            }
          />
        </>
      )}
    </div>
  );
}
