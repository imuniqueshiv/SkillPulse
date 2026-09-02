"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

export interface TopBarProps {
  onMobileMenuToggle: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Jobs",
  skills: "Skills",
  courses: "Courses",
  curricula: "Curricula",
  gaps: "Skill Gaps",
  recommendations: "Recommendations",
  employers: "Employers",
  outcomes: "Outcomes",
  settings: "Settings",
  "sign-in": "Sign In",
  "sign-up": "Sign Up",
};

function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getBreadcrumb(pathname: string): string {
  if (!pathname || pathname === "/" || pathname === "/dashboard") {
    return "Dashboard";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "Dashboard";
  }

  const firstKey = segments[0].toLowerCase();
  const firstLabel = ROUTE_LABELS[firstKey] ?? formatSegment(segments[0]);

  if (segments.length === 1) {
    return firstLabel;
  }

  const remaining = segments.slice(1).map(formatSegment).join(" / ");
  return `${firstLabel} / ${remaining}`;
}

export function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const pathname = usePathname();
  const breadcrumb = getBreadcrumb(pathname || "");

  return (
    <header className="sticky top-0 z-30 flex h-[var(--sp-topbar-height,56px)] w-full items-center justify-between border-b border-[color:var(--sp-border)] bg-[var(--sp-bg-surface)] px-6">
      {/* Left Section: Mobile Menu Trigger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-md)] text-[var(--sp-text-secondary)] transition-all duration-150 ease-out hover:bg-[var(--sp-bg-hover)] hover:text-[var(--sp-text-primary)] lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center">
          <span className="text-[0.8125rem] font-medium text-[var(--sp-text-secondary)]">
            {breadcrumb}
          </span>
        </nav>
      </div>

      {/* Right Section: Search, Notifications, User Profile */}
      <div className="flex items-center gap-2">
        {/* Search Bar */}
        <div className="relative hidden w-[240px] md:block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sp-text-tertiary)]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Search... ⌘K"
            className="sp-input h-9 w-full pl-9 pr-3 text-[0.8125rem] transition-all duration-150 ease-out"
          />
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-[var(--sp-radius-md)] text-[var(--sp-text-secondary)] transition-all duration-150 ease-out hover:bg-[var(--sp-bg-hover)] hover:text-[var(--sp-text-primary)]"
          aria-label="Notifications"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {/* Notification Dot */}
          <span
            className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[var(--sp-accent)] ring-2 ring-[var(--sp-bg-surface)]"
            aria-hidden="true"
          />
        </button>

        {/* User Button */}
        <div className="flex items-center">
          <UserButton />
        </div>
      </div>
    </header>
  );
}
