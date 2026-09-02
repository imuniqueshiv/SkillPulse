"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

function Toggle({
  label,
  description,
  defaultActive = false,
}: {
  label: string;
  description: string;
  defaultActive?: boolean;
}) {
  const [active, setActive] = useState(defaultActive);

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium" style={{ color: "var(--sp-text-primary)" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--sp-text-secondary)" }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        className="sp-toggle flex-shrink-0"
        data-active={active}
        onClick={() => setActive(!active)}
        aria-label={`Toggle ${label}`}
      />
    </div>
  );
}

export function PreferencesSection() {
  return (
    <div className="space-y-6 sp-fade-in">
      {/* Appearance */}
      <Card title="Appearance" subtitle="Customize the look and feel">
        <div className="space-y-1 divide-y" style={{ borderColor: "var(--sp-border)" }}>
          <Toggle
            label="Dark Mode"
            description="Use dark theme across the application"
            defaultActive={true}
          />
          <Toggle
            label="Compact View"
            description="Reduce spacing for a denser information layout"
            defaultActive={false}
          />
          <Toggle
            label="Sidebar Collapsed by Default"
            description="Start with the sidebar collapsed on login"
            defaultActive={false}
          />
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" subtitle="Choose what alerts you receive">
        <div className="space-y-1 divide-y" style={{ borderColor: "var(--sp-border)" }}>
          <Toggle
            label="Email Notifications"
            description="Receive updates about new job postings and skill gap reports"
            defaultActive={true}
          />
          <Toggle
            label="Weekly Digest"
            description="Summary of platform activity sent every Monday"
            defaultActive={true}
          />
          <Toggle
            label="Course Reminders"
            description="Get notified about upcoming course deadlines"
            defaultActive={false}
          />
          <Toggle
            label="Real-time Alerts"
            description="In-app notifications for critical events"
            defaultActive={true}
          />
        </div>
      </Card>

      {/* Language & Region */}
      <Card title="Language & Region" subtitle="Localization preferences">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Language
            </label>
            <select className="sp-input w-full cursor-pointer">
              <option>English (India)</option>
              <option>हिन्दी</option>
              <option>தமிழ்</option>
              <option>తెలుగు</option>
              <option>मराठी</option>
            </select>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Timezone
            </label>
            <select className="sp-input w-full cursor-pointer">
              <option>Asia/Kolkata (IST, UTC+5:30)</option>
              <option>UTC</option>
              <option>America/New_York (EST)</option>
            </select>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Date Format
            </label>
            <select className="sp-input w-full cursor-pointer">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Number Format
            </label>
            <select className="sp-input w-full cursor-pointer">
              <option>12,34,567.89 (Indian)</option>
              <option>1,234,567.89 (International)</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
}
