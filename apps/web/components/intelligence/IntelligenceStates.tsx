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
  if (status === "AVAILABLE" || status === "SUCCESS" || status === "AUTHORIZED_FILE") {
    return <Badge variant="success">{status}</Badge>;
  }
  if (
    status === "INSUFFICIENT_DATA" ||
    status === "SYNTHETIC_FIXTURE" ||
    status === "PARTIAL_SYNC" ||
    status === "NOT_CONFIGURED"
  ) {
    return <Badge variant="warning">{status}</Badge>;
  }
  if (
    status === "ACCESS_DENIED" ||
    status === "SOURCE_UNAVAILABLE" ||
    status === "UNKNOWN"
  ) {
    return <Badge variant={status === "UNKNOWN" ? "neutral" : "danger"}>{status}</Badge>;
  }
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: "5.5rem",
              borderRadius: "0.75rem",
              background: "var(--sp-bg-hover)",
              border: "1px solid var(--sp-border)",
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: "11rem",
          borderRadius: "0.75rem",
          background: "var(--sp-bg-hover)",
          border: "1px solid var(--sp-border)",
        }}
      />
    </div>
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

export function EvidenceNote({
  limitations,
  phaseVersions,
  observations,
  includeDemo,
  includeInsufficient,
}: {
  limitations?: string[];
  phaseVersions?: Record<string, string | null | undefined>;
  observations?: number;
  includeDemo?: boolean;
  includeInsufficient?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        alignItems: "center",
        fontSize: "0.8125rem",
        color: "var(--sp-text-secondary)",
      }}
    >
      <span style={{ fontWeight: 600, letterSpacing: "0.04em", fontSize: "0.7rem" }}>
        DATA / EVIDENCE STATUS
      </span>
      <Badge variant="success">REAL SOURCE</Badge>
      <Badge variant="success">NCS</Badge>
      <Badge variant="neutral">NOT OFFICIAL API</Badge>
      {includeDemo ? <Badge variant="warning">DEMO DATA</Badge> : null}
      {includeInsufficient ? (
        <Badge variant="warning">INSUFFICIENT DATA</Badge>
      ) : null}
      {observations != null && observations > 0 ? (
        <span>
          {observations} captured NCS observations · public listing snapshot · not an
          official NCS API feed
        </span>
      ) : null}
      {includeDemo ? (
        <span>Simulated data is for MVP workflow demonstration only.</span>
      ) : null}
      <details style={{ marginLeft: "auto" }}>
        <summary style={{ cursor: "pointer", color: "var(--sp-accent)" }}>
          Methodology
        </summary>
        <LimitationsPanel limitations={limitations} phaseVersions={phaseVersions} />
      </details>
    </div>
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
    <div style={{ marginTop: "0.5rem", maxWidth: "48rem" }}>
      {phaseVersions && (
        <p
          style={{
            margin: "0 0 0.5rem",
            fontSize: "0.75rem",
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
            fontSize: "0.8125rem",
            color: "var(--sp-text-secondary)",
          }}
        >
          {limitations.slice(0, 6).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
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
