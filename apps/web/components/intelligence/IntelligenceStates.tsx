"use client";

import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function formatMetric(
  status: string | undefined,
  value: string | number | null | undefined,
  suffix = "",
): string {
  if (status === "INSUFFICIENT_DATA" || status === "UNKNOWN") {
    return status === "UNKNOWN" ? "Unknown" : "Insufficient data";
  }
  if (value === null || value === undefined || value === "") {
    return "Insufficient data";
  }
  return `${value}${suffix}`;
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return <Badge variant="neutral">UNKNOWN</Badge>;
  if (status === "AVAILABLE") return <Badge variant="success">AVAILABLE</Badge>;
  if (status === "INSUFFICIENT_DATA") {
    return <Badge variant="warning">INSUFFICIENT_DATA</Badge>;
  }
  if (status === "UNKNOWN") return <Badge variant="neutral">UNKNOWN</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority?: string }) {
  const p = priority ?? "UNKNOWN";
  const variant =
    p === "CRITICAL" || p === "HIGH"
      ? "danger"
      : p === "MEDIUM"
        ? "warning"
        : p === "INSUFFICIENT_DATA"
          ? "neutral"
          : "accent";
  return <Badge variant={variant}>{p}</Badge>;
}

export function IntelligenceLoading() {
  return (
    <Card>
      <p style={{ textAlign: "center", color: "var(--sp-text-secondary)" }}>
        Loading intelligence...
      </p>
    </Card>
  );
}

export function IntelligenceError({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={
        <span aria-hidden style={{ fontSize: "1.5rem" }}>
          !
        </span>
      }
      title="Unable to load intelligence."
      description={message ?? "The intelligence API request failed. Try again later."}
    />
  );
}

export function IntelligenceUnauthorized({ message }: { message?: string }) {
  return (
    <EmptyState
      icon={
        <span aria-hidden style={{ fontSize: "1.5rem" }}>
          ⊘
        </span>
      }
      title="Unauthorized"
      description={
        message ??
        "Your role is not permitted to view this intelligence. Server-side authorization blocked the request."
      }
    />
  );
}

export function IntelligenceEmpty() {
  return (
    <EmptyState
      icon={
        <span aria-hidden style={{ fontSize: "1.5rem" }}>
          ∅
        </span>
      }
      title="No sufficient evidence available for this view."
      description="Upstream Phase 7–13 services returned no usable analytical evidence for the selected filters."
    />
  );
}

export function LimitationsPanel({
  limitations,
  phaseVersions,
}: {
  limitations?: string[];
  phaseVersions?: Record<string, string | null | undefined>;
}) {
  if (!limitations?.length && !phaseVersions) return null;
  return (
    <Card>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
        Limitations &amp; phase versions
      </h3>
      {phaseVersions && (
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.8125rem",
            color: "var(--sp-text-secondary)",
          }}
        >
          {Object.entries(phaseVersions)
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")}
        </p>
      )}
      {limitations && limitations.length > 0 && (
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            fontSize: "0.875rem",
            color: "var(--sp-text-secondary)",
          }}
        >
          {limitations.slice(0, 8).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function EvidenceList({
  evidence,
}: {
  evidence?: Array<{
    source?: string;
    metric?: string;
    value?: string | number | boolean | null;
    interpretation?: string;
  }>;
}) {
  if (!evidence?.length) {
    return (
      <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
        No evidence items for this view.
      </p>
    );
  }
  return (
    <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.875rem" }}>
      {evidence.map((e, i) => (
        <li key={`${e.source}-${e.metric}-${i}`} style={{ marginBottom: "0.5rem" }}>
          <strong>{e.source ?? "SOURCE"}</strong> — {e.metric}:{" "}
          {e.value === null || e.value === undefined ? "null" : String(e.value)}
          {e.interpretation ? ` (${e.interpretation})` : ""}
        </li>
      ))}
    </ul>
  );
}
