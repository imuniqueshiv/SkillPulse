"use client";

import { usePathname } from "next/navigation";

export interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  jobs: "Labour Market & Jobs",
  skills: "Skill Intelligence",
  courses: "Courses & Programs",
  curricula: "Curricula & Qualification Packs",
  gaps: "Skill Gaps & Disparities",
  recommendations: "Recommendations",
  employers: "Employer Network",
  outcomes: "Outcomes & Impact",
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
    <div className="flex h-9 w-full items-center justify-between border-b border-[#D1D5DB] bg-[#F8FAFC] px-6 text-xs">
      {/* Left: Mobile Sidebar Trigger & Breadcrumb */}
      <div className="flex items-center gap-2">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="flex h-6 w-6 items-center justify-center rounded text-[#6B7280] hover:bg-[#EEF2F7] hover:text-[#111827] lg:hidden"
            aria-label="Toggle workspace navigation drawer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex items-center">
          <span className="text-[#6B7280]">Workspace</span>
          <span className="mx-1.5 text-[#9CA3AF]">/</span>
          <span className="font-semibold text-[#1F2937]">{breadcrumb}</span>
        </nav>
      </div>

      {/* Right: Institutional Status Indicator */}
      <div className="hidden sm:flex items-center gap-2 text-[0.6875rem] text-[#6B7280]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#15803D]" />
        <span>Evidence-Driven Intelligence</span>
      </div>
    </div>
  );
}
