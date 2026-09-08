"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* SkillPulse Logo SVG Mark */
function SkillPulseLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#E85D2A" />
      <path
        d="M7 20H11L14.5 10L19 26L23.5 15L26 20H29"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14.5" cy="10" r="2.2" fill="#F28C5B" />
      <circle cx="19" cy="26" r="2.2" fill="#FFF0E8" />
      <circle cx="23.5" cy="15" r="2.2" fill="#F28C5B" />
    </svg>
  );
}

// Partner / Institutional Ecosystem Badges
const ECOSYSTEM_BADGES = [
  {
    icon: (
      <svg className="w-4 h-4 text-[#E85D2A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Skill Taxonomy",
    sub: "Standardized Frameworks",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-[#E85D2A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
      </svg>
    ),
    title: "Employer Network",
    sub: "Industry Hiring Partners",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-[#E85D2A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
    title: "NSQF Standards",
    sub: "Academic Pathways",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-[#E85D2A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Labour Market Stream",
    sub: "Live Demand Signal",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-[#E85D2A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: "Outcome Analytics",
    sub: "Evidence-Based Decisions",
  },
];

const PLATFORM_LINKS = [
  { label: "Intelligence", href: "/skills" },
  { label: "Training & Curriculum", href: "/curricula" },
  { label: "Outcomes", href: "/outcomes" },
  { label: "Recommendations", href: "/recommendations" },
  { label: "Dashboards", href: "/dashboard" },
];

const RESOURCE_LINKS = [
  { label: "Skills", href: "/skills" },
  { label: "Workforce Insights", href: "/jobs" },
  { label: "About SkillPulse", href: "/quality" },
  { label: "Contact", href: "/settings" },
];

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const isDashboardRoute =
    pathname !== "/" &&
    !pathname?.startsWith("/sign-in") &&
    !pathname?.startsWith("/sign-up");

  return (
    <footer
      className={`w-full transition-all duration-150 ${
        isDashboardRoute ? "lg:ml-[var(--sp-sidebar-width,256px)]" : "w-full"
      }`}
      aria-label="Site Footer"
    >
      {/* ================================================================== */}
      {/* 1. INSTITUTIONAL ECOSYSTEM / PARTNER LOGO STRIP                   */}
      {/* ================================================================== */}
      <section className="w-full bg-[#FFFFFF] border-t border-b border-[#E5D9D0] py-4 select-none">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#E5D9D0] border-t md:border-t-0 border-[#E5D9D0]">
            {ECOSYSTEM_BADGES.map((badge, idx) => (
              <div
                key={badge.title + idx}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[#FFF8F2] group cursor-default"
              >
                <div className="p-2 rounded-xl bg-[#FFF0E8] text-[#E85D2A] group-hover:scale-105 transition-transform duration-150 shrink-0">
                  {badge.icon}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#1F2933] group-hover:text-[#E85D2A] transition-colors truncate">
                    {badge.title}
                  </span>
                  <span className="text-[0.6875rem] text-[#64748B] tracking-tight truncate">
                    {badge.sub}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* 2. MAIN FOOTER CONTAINER (DARK CHARCOAL #1F2933)                  */}
      {/* ================================================================== */}
      <div className="bg-[#1F2933] text-white relative overflow-hidden select-none">
        {/* Subtle Horizontal Workforce Pulse SVG Data Signal Top Line */}
        <div className="w-full h-1 relative overflow-hidden bg-slate-800">
          <div className="h-full w-full bg-gradient-to-r from-[#E85D2A] via-[#F28C5B] to-[#E85D2A] opacity-80" />
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Column A: BRAND */}
            <div className="lg:col-span-6 flex flex-col gap-3.5 pr-0 lg:pr-6">
              <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
                <SkillPulseLogoMark className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-white leading-none">
                    Skill<span className="text-[#E85D2A]">Pulse</span>
                  </span>
                  <span className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[#F28C5B] leading-tight mt-0.5">
                    Workforce Intelligence
                  </span>
                </div>
              </Link>

              <p className="text-xs sm:text-sm text-[#CBD5E1] leading-relaxed max-w-lg mt-1">
                Evidence-driven skill and workforce intelligence for better decisions. Connecting hiring demand, skill taxonomies, qualification standards, and employment outcomes.
              </p>
            </div>

            {/* Column B: PLATFORM */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 border-b border-slate-700/60 pb-1.5 w-fit">
                Platform
              </h3>
              <ul className="flex flex-col gap-2">
                {PLATFORM_LINKS.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-[#CBD5E1] transition-colors duration-150 hover:text-[#F28C5B] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column C: RESOURCES */}
            <div className="lg:col-span-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3.5 border-b border-slate-700/60 pb-1.5 w-fit">
                Resources
              </h3>
              <ul className="flex flex-col gap-2">
                {RESOURCE_LINKS.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-xs sm:text-sm text-[#CBD5E1] transition-colors duration-150 hover:text-[#F28C5B] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. BOTTOM BAR                                                    */}
          {/* ================================================================ */}
          <div className="mt-10 pt-6 border-t border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#CBD5E1]">
            <p>© {currentYear} SkillPulse. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/settings" className="hover:text-[#F28C5B] transition-colors">
                Privacy
              </Link>
              <span className="text-slate-600">|</span>
              <Link href="/settings" className="hover:text-[#F28C5B] transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
