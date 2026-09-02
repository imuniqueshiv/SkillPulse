"use client";

import { useUser } from "@clerk/nextjs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ProfileSection() {
  const { user, isLoaded } = useUser();

  return (
    <div className="space-y-6 sp-fade-in">
      {/* User Info Card */}
      <Card title="Personal Information" subtitle="Manage your public profile">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{
              background: "var(--sp-accent-muted)",
              color: "var(--sp-accent-text)",
              border: "1px solid var(--sp-border)",
            }}
          >
            {isLoaded && user?.firstName
              ? user.firstName.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div className="flex-1 space-y-4 min-w-0">
            {/* Name */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--sp-text-tertiary)" }}
              >
                Full Name
              </label>
              <input
                type="text"
                className="sp-input w-full max-w-sm"
                defaultValue={
                  isLoaded
                    ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "User"
                    : ""
                }
                readOnly
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
                style={{ color: "var(--sp-text-tertiary)" }}
              >
                Email Address
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="email"
                  className="sp-input w-full max-w-sm"
                  defaultValue={
                    isLoaded
                      ? user?.primaryEmailAddress?.emailAddress ?? ""
                      : ""
                  }
                  readOnly
                />
                <Badge variant="success">Verified</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Role & Organization */}
      <Card title="Role & Organization" subtitle="Your access level within SkillPulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Current Role
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="accent">Platform Admin</Badge>
            </div>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Organization
            </label>
            <p className="text-sm" style={{ color: "var(--sp-text-primary)" }}>
              SkillPulse National
            </p>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Member Since
            </label>
            <p className="text-sm" style={{ color: "var(--sp-text-primary)" }}>
              {isLoaded && user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5 uppercase tracking-wider"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              Account ID
            </label>
            <p
              className="text-sm font-mono"
              style={{ color: "var(--sp-text-tertiary)" }}
            >
              {isLoaded ? user?.id?.slice(0, 16) + "..." : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
