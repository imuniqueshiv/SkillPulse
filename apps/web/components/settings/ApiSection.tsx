"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ApiSection() {
  const [keyVisible, setKeyVisible] = useState(false);

  const maskedKey = "sk_live_••••••••••••••••••••••••••••r7Kx";
  const realKey = "sk_live_aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5r7Kx";

  return (
    <div className="space-y-6 sp-fade-in">
      {/* API Keys */}
      <Card title="API Keys" subtitle="Manage your programmatic access tokens">
        <div className="space-y-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Production Key
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 font-mono text-sm px-3 py-2 rounded-md"
                style={{
                  background: "var(--sp-bg-input)",
                  border: "1px solid var(--sp-border)",
                  color: "var(--sp-text-secondary)",
                }}
              >
                {keyVisible ? realKey : maskedKey}
              </div>
              <button
                onClick={() => setKeyVisible(!keyVisible)}
                className="px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer"
                style={{
                  background: "var(--sp-bg-hover)",
                  color: "var(--sp-text-secondary)",
                  border: "1px solid var(--sp-border)",
                }}
              >
                {keyVisible ? "Hide" : "Reveal"}
              </button>
              <button
                className="px-3 py-2 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer"
                style={{
                  background: "var(--sp-bg-hover)",
                  color: "var(--sp-text-secondary)",
                  border: "1px solid var(--sp-border)",
                }}
                onClick={() => {
                  void navigator.clipboard.writeText(realKey);
                }}
              >
                Copy
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-3 p-3 rounded-lg"
            style={{
              background: "var(--sp-warning-muted)",
              border: "1px solid hsla(38 92% 55% / 0.2)",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--sp-warning)", flexShrink: 0 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs" style={{ color: "var(--sp-warning)" }}>
              Keep your API key secure. Never expose it in client-side code or public repositories.
            </p>
          </div>
        </div>
      </Card>

      {/* API Usage */}
      <Card title="API Usage" subtitle="Current billing period (Sep 1 – Sep 30, 2026)">
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm" style={{ color: "var(--sp-text-primary)" }}>
                API Requests
              </span>
              <span className="text-sm font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                14,280 / 50,000
              </span>
            </div>
            <ProgressBar value={14280} maxValue={50000} color="accent" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm" style={{ color: "var(--sp-text-primary)" }}>
                Data Export Credits
              </span>
              <span className="text-sm font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                38 / 100
              </span>
            </div>
            <ProgressBar value={38} maxValue={100} color="success" />
          </div>
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm" style={{ color: "var(--sp-text-primary)" }}>
                Intelligence Queries
              </span>
              <span className="text-sm font-mono" style={{ color: "var(--sp-text-secondary)" }}>
                892 / 1,000
              </span>
            </div>
            <ProgressBar value={892} maxValue={1000} color="warning" />
          </div>
        </div>
      </Card>

      {/* Rate Limits */}
      <Card title="Rate Limits" subtitle="Current plan thresholds">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg text-center"
            style={{
              background: "var(--sp-bg-surface)",
              border: "1px solid var(--sp-border)",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--sp-text-primary)" }}>
              100
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--sp-text-secondary)" }}>
              Requests / minute
            </p>
          </div>
          <div
            className="p-4 rounded-lg text-center"
            style={{
              background: "var(--sp-bg-surface)",
              border: "1px solid var(--sp-border)",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--sp-text-primary)" }}>
              5 MB
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--sp-text-secondary)" }}>
              Max payload size
            </p>
          </div>
          <div
            className="p-4 rounded-lg text-center"
            style={{
              background: "var(--sp-bg-surface)",
              border: "1px solid var(--sp-border)",
            }}
          >
            <p className="text-2xl font-bold" style={{ color: "var(--sp-text-primary)" }}>
              30s
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--sp-text-secondary)" }}>
              Request timeout
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Badge variant="accent">Pro Plan</Badge>
        </div>
      </Card>
    </div>
  );
}
