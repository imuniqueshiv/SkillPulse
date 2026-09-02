"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const INTEGRATIONS = [
  {
    name: "National Skills Registry",
    status: "connected" as const,
    description: "Syncing skill certifications and credentials",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    name: "Sector Skill Councils",
    status: "connected" as const,
    description: "Importing sector-specific skill frameworks",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
  },
  {
    name: "UDISE+ Portal",
    status: "pending" as const,
    description: "Pending approval for institutional data access",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn Talent Insights",
    status: "disconnected" as const,
    description: "Not connected — authorize to import labour-market signals",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

export function AccountSection() {
  return (
    <div className="space-y-6 sp-fade-in">
      {/* Integrations */}
      <Card title="Connected Integrations" subtitle="Data sources linked to your account">
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center gap-4 p-3 rounded-lg transition-colors duration-150"
              style={{
                border: "1px solid var(--sp-border)",
                background: "var(--sp-bg-surface)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "var(--sp-bg-hover)",
                  color: "var(--sp-text-secondary)",
                }}
              >
                {integration.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--sp-text-primary)" }}
                  >
                    {integration.name}
                  </p>
                  <Badge
                    variant={
                      integration.status === "connected"
                        ? "success"
                        : integration.status === "pending"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {integration.status === "connected"
                      ? "Connected"
                      : integration.status === "pending"
                        ? "Pending"
                        : "Disconnected"}
                  </Badge>
                </div>
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{ color: "var(--sp-text-secondary)" }}
                >
                  {integration.description}
                </p>
              </div>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex-shrink-0 cursor-pointer"
                style={{
                  background:
                    integration.status === "disconnected"
                      ? "var(--sp-accent)"
                      : "var(--sp-bg-hover)",
                  color:
                    integration.status === "disconnected"
                      ? "white"
                      : "var(--sp-text-secondary)",
                  border: integration.status === "disconnected"
                    ? "none"
                    : "1px solid var(--sp-border)",
                }}
              >
                {integration.status === "disconnected"
                  ? "Connect"
                  : integration.status === "pending"
                    ? "Check Status"
                    : "Manage"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Sessions */}
      <Card title="Active Sessions" subtitle="Devices currently signed into your account">
        <div className="space-y-3">
          <div
            className="flex items-center justify-between p-3 rounded-lg"
            style={{
              border: "1px solid var(--sp-border)",
              background: "var(--sp-bg-surface)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center"
                style={{ background: "var(--sp-bg-hover)", color: "var(--sp-text-secondary)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--sp-text-primary)" }}>
                  Windows · Chrome
                </p>
                <p className="text-xs" style={{ color: "var(--sp-text-tertiary)" }}>
                  Current session · Last active now
                </p>
              </div>
            </div>
            <Badge variant="success">Current</Badge>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="Danger Zone" subtitle="Irreversible actions — proceed with caution">
        <div
          className="p-4 rounded-lg"
          style={{
            border: "1px solid var(--sp-danger)",
            background: "var(--sp-danger-muted)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--sp-danger)" }}>
                Deactivate Account
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--sp-text-secondary)" }}>
                This will remove your access to SkillPulse. Your data will be retained for 90 days
                before permanent deletion.
              </p>
            </div>
            <button
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 flex-shrink-0 cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--sp-danger)",
                border: "1px solid var(--sp-danger)",
              }}
            >
              Deactivate
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
