"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchCurrentUser,
  fetchIntelligenceOverview,
  IntelligenceApiError,
  type ApplicationUser,
  type IntelligenceMeta,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";
import {
  formatMetric,
  IntelligenceEmpty,
  IntelligenceError,
  IntelligenceUnauthorized,
  LimitationsPanel,
  PriorityBadge,
  StatusBadge,
} from "@/components/intelligence/IntelligenceStates";

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

type OverviewData = {
  demandSource?: {
    source?: { name?: string; code?: string; url?: string };
    scope?: { state?: string | null; district?: string | null };
    dataStatus?: string;
    liveNcsData?: boolean;
    observationCount?: number;
    lastObservedAt?: string | null;
    lastSnapshot?: { id?: string; accessMethod?: string; status?: string } | null;
    notes?: string[];
  };
  demand?: {
    status?: string;
    highDemandSkillCount?: number;
    topSkills?: Array<Record<string, unknown>>;
  };
  gaps?: {
    status?: string;
    severeOrHighCount?: number;
    insufficientDataCount?: number;
    topPriority?: Array<Record<string, unknown>>;
  };
  training?: {
    status?: string;
    highNeedCount?: number;
    capacityGapCount?: number;
  };
  employment?: {
    status?: string;
    trainingToEmployment?: { status?: string; value?: number | null };
    note?: string | null;
  };
  decisions?: {
    status?: string;
    highPriorityCount?: number;
    topSignals?: Array<Record<string, unknown>>;
  };
  dataQuality?: {
    status?: string;
    totalAssessments?: number;
    freshness?: Record<string, number>;
  };
};

export function RoleDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [user, setUser] = useState<ApplicationUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [meta, setMeta] = useState<IntelligenceMeta | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    void (async () => {
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const token = await getToken();
        if (!token) {
          setError("Unable to load intelligence.");
          setLoading(false);
          return;
        }
        const appUser = await fetchCurrentUser(token);
        setUser(appUser);

        if (appUser.role === "LEARNER") {
          setOverview(null);
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        const result = await fetchIntelligenceOverview(token, { limit: 20 });
        setOverview(result.data as OverviewData);
        setMeta(result.meta);
      } catch (err) {
        if (err instanceof IntelligenceApiError && err.status === 403) {
          setUnauthorized(true);
        } else {
          setError("Unable to load intelligence.");
        }
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
      </div>
    );
  }

  const role = user?.role ?? "LEARNER";
  const title = ROLE_TITLES[role] ?? "Dashboard";

  if (unauthorized) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader
          title={`SkillPulse ${title} Overview`}
          subtitle="Authenticated executive view over Phase 7–13 intelligence adapters."
        />
        <IntelligenceUnauthorized message="This role cannot access government-wide intelligence." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader
          title={`SkillPulse ${title} Overview`}
          subtitle="Authenticated executive view over Phase 7–13 intelligence adapters."
        />
        <IntelligenceError message={error} />
      </div>
    );
  }

  if (!overview) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <PageHeader title={`SkillPulse ${title} Overview`} subtitle="Executive intelligence overview." />
        <IntelligenceEmpty />
      </div>
    );
  }

  const employmentDisplay = formatMetric(
    overview.employment?.trainingToEmployment?.status ?? overview.employment?.status,
    overview.employment?.trainingToEmployment?.value != null
      ? Math.round(overview.employment.trainingToEmployment.value * 100)
      : null,
    "%",
  );

  const signalRows = (overview.decisions?.topSignals ?? []).map((s) => ({
    priority: String(s.priority ?? ""),
    category: String(s.category ?? ""),
    target: String(
      (s.target as { skillCanonicalName?: string } | undefined)?.skillCanonicalName ??
        (s.target as { skillId?: string } | undefined)?.skillId ??
        "—",
    ),
    confidence: String(s.confidence ?? ""),
    action: String(s.actionType ?? ""),
    signalId: String(s.signalId ?? ""),
  }));

  const signalColumns = [
    {
      key: "priority",
      label: "Priority",
      render: (row: (typeof signalRows)[0]) => <PriorityBadge priority={row.priority} />,
    },
    { key: "category", label: "Category" },
    { key: "target", label: "Target" },
    { key: "confidence", label: "Confidence" },
    { key: "action", label: "Action" },
    {
      key: "signalId",
      label: "Detail",
      render: (row: (typeof signalRows)[0]) =>
        row.signalId ? (
          <Link href={`/decisions/${encodeURIComponent(row.signalId)}`} className="text-[var(--sp-accent)] underline">
            Open
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <PageHeader
        title={`SkillPulse ${title} Overview`}
        subtitle="Bounded dashboard over Phase 7–13 intelligence. Values are not fabricated placeholders."
      />

      <Card>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Job demand source</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Source</div>
            <div>{overview.demandSource?.source?.name ?? "National Career Service"}</div>
          </div>
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Scope</div>
            <div>
              {overview.demandSource?.scope?.state ?? "Maharashtra"}
              {overview.demandSource?.scope?.district
                ? ` / ${overview.demandSource.scope.district}`
                : ""}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Observations</div>
            <div>{overview.demandSource?.observationCount ?? 0}</div>
          </div>
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Data status</div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <StatusBadge status={overview.demandSource?.dataStatus} />
              {overview.demandSource?.liveNcsData ? null : (
                <span style={{ color: "var(--sp-text-secondary)", fontSize: "0.75rem" }}>
                  not live NCS
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Last observed</div>
            <div>
              {overview.demandSource?.lastObservedAt
                ? new Date(overview.demandSource.lastObservedAt).toLocaleString()
                : "INSUFFICIENT_DATA"}
            </div>
          </div>
          <div>
            <div style={{ color: "var(--sp-text-secondary)" }}>Evidence</div>
            <div>
              {overview.demandSource?.lastSnapshot?.id
                ? `snapshot ${overview.demandSource.lastSnapshot.id.slice(0, 8)}… (${overview.demandSource.lastSnapshot.accessMethod ?? "—"})`
                : "INSUFFICIENT_DATA"}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <StatCard
          label="High Demand Skills"
          value={formatMetric(overview.demand?.status, overview.demand?.highDemandSkillCount)}
          trend={overview.demand?.status}
          icon={<ZapIcon />}
        />
        <StatCard
          label="Severe / High Gaps"
          value={formatMetric(overview.gaps?.status, overview.gaps?.severeOrHighCount)}
          trend={
            overview.gaps?.insufficientDataCount
              ? `${overview.gaps.insufficientDataCount} insufficient-data rows`
              : overview.gaps?.status
          }
          icon={<TargetIcon />}
        />
        <StatCard
          label="Training → Employment"
          value={employmentDisplay}
          trend={overview.employment?.note ?? overview.employment?.status}
          icon={<BriefcaseIcon />}
        />
        <StatCard
          label="High Priority Signals"
          value={formatMetric(overview.decisions?.status, overview.decisions?.highPriorityCount)}
          trend={overview.decisions?.status}
          icon={<BookIcon />}
        />
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>Statuses:</span>
        <StatusBadge status={overview.demand?.status} />
        <StatusBadge status={overview.gaps?.status} />
        <StatusBadge status={overview.training?.status} />
        <StatusBadge status={overview.employment?.status} />
        <StatusBadge status={overview.dataQuality?.status} />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>High priority decision signals</h3>
          <Link href="/decisions" className="text-[var(--sp-accent)] text-sm underline">
            View all signals
          </Link>
        </div>
        {signalRows.length === 0 ? (
          <p style={{ color: "var(--sp-text-secondary)", fontSize: "0.875rem" }}>
            No sufficient evidence available for this view.
          </p>
        ) : (
          <DataTable columns={signalColumns} rows={signalRows} />
        )}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Data quality snapshot</h3>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--sp-text-secondary)" }}>
          {overview.dataQuality?.status === "AVAILABLE"
            ? `${overview.dataQuality.totalAssessments ?? 0} PROCESSED assessments. Stale: ${overview.dataQuality.freshness?.STALE ?? 0}.`
            : "Insufficient data"}
          {" "}
          <Link href="/quality" className="text-[var(--sp-accent)] underline">
            Open data quality
          </Link>
        </p>
      </Card>

      <LimitationsPanel limitations={meta?.limitations} phaseVersions={meta?.phaseVersions} />
    </div>
  );
}
