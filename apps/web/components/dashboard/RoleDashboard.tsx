"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { fetchCurrentUser, type ApplicationUser } from "@/lib/api";

const ROLE_COPY: Record<string, { title: string; body: string }> = {
  PLATFORM_ADMIN: {
    title: "Platform dashboard",
    body: "You have platform-wide access. Authorization is enforced by the API, not this page.",
  },
  GOVERNMENT_MANAGER: {
    title: "Government dashboard",
    body: "Labour-market oversight view for government managers.",
  },
  INSTITUTE_ADMIN: {
    title: "Institute dashboard",
    body: "Training institute administration. Scoped to your organization.",
  },
  EMPLOYER: {
    title: "Employer dashboard",
    body: "Employer workspace. Scoped to your organization.",
  },
  TRAINER: {
    title: "Trainer dashboard",
    body: "Trainer workspace. Scoped to your organization.",
  },
  LEARNER: {
    title: "Learner dashboard",
    body: "Learner workspace. New accounts start with this role.",
  },
};

export function RoleDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [user, setUser] = useState<ApplicationUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void (async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Missing session token");
          return;
        }
        setUser(await fetchCurrentUser(token));
      } catch {
        setError("Could not load SkillPulse user");
      }
    })();
  }, [getToken, isLoaded]);

  if (error) {
    return <p className="text-zinc-600 dark:text-zinc-400">{error}</p>;
  }

  if (!user) {
    return <p className="text-zinc-600 dark:text-zinc-400">Loading workspace…</p>;
  }

  const copy = ROLE_COPY[user.role] ?? ROLE_COPY.LEARNER;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {copy?.title}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">{copy?.body}</p>
      <p className="text-sm text-zinc-500">Role: {user.role}</p>
    </div>
  );
}
