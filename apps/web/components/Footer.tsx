"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Logo Mark */
function SkillPulseLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#003B73" />
      <path d="M6 18H10L13 9L17 23L21 14L23 18H26" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="9" r="2" fill="#60A5FA" />
      <circle cx="17" cy="23" r="2" fill="#93C5FD" />
      <circle cx="21" cy="14" r="2" fill="#60A5FA" />
    </svg>
  );
}

const footerLinks = {
  platform: [
    { label: "Labour Market Demand", href: "/jobs" },
    { label: "Skill Intelligence", href: "/skills" },
    { label: "Demand vs Supply Gaps", href: "/gaps" },
    { label: "Curriculum Analysis", href: "/curricula" },
    { label: "Recommendations", href: "/recommendations" },
    { label: "Outcome Tracking", href: "/outcomes" },
  ],
  stakeholders: [
    { label: "Government & Policymakers", href: "/dashboard" },
    { label: "Training Institutes", href: "/courses" },
    { label: "Employers & Industry", href: "/employers" },
    { label: "Learners & Job Seekers", href: "/skills" },
  ],
  resources: [
    { label: "Executive Dashboard", href: "/dashboard" },
    { label: "Courses & Capacity", href: "/courses" },
    { label: "Regional Skill Gaps", href: "/gaps" },
    { label: "Data Sources & Settings", href: "/settings" },
    { label: "Platform Home", href: "/" },
  ],
};

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const isDashboardRoute =
    pathname !== "/" &&
    !pathname?.startsWith("/sign-in") &&
    !pathname?.startsWith("/sign-up");

  return (
    <footer
      className={`border-t border-[#E2E8F0] bg-white text-[#1F2937] transition-all duration-150 ${
        isDashboardRoute ? "lg:ml-[var(--sp-sidebar-width,256px)]" : "w-full"
      }`}
      aria-label="Site Footer"
    >
      {/* Top accent */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#003B73] via-[#005A9C] to-[#E9783B]" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">

          {/* Brand column */}
          <div className="lg:col-span-4 flex flex-col gap-4 pr-0 lg:pr-8">
            <div className="flex items-center gap-2.5">
              <SkillPulseLogoMark className="h-8 w-8 shrink-0" />
              <div>
                <span className="text-lg font-bold tracking-tight text-[#003B73]">SkillPulse</span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B]">Workforce Intelligence</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[#475569]">
              Evidence-driven skill and workforce intelligence platform connecting labour-market demand, skills, training, curriculum and employment outcomes.
            </p>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] p-3.5 text-xs text-[#64748B]">
              <p className="font-semibold text-[#0F172A] mb-1">Institutional Scope</p>
              <p className="leading-relaxed">Maharashtra serves as the initial MVP and validation environment, with an architecture designed to scale across India.</p>
            </div>
          </div>

          {/* Platform */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#003B73] mb-4">
              Platform Intelligence
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.platform.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-sm text-[#475569] transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stakeholders */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#003B73] mb-4">
              Stakeholders
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.stakeholders.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-sm text-[#475569] transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#003B73] mb-4">
              Resources & Data
            </h3>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-sm text-[#475569] transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Intelligence Cycle */}
        <div className="mt-10 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span className="text-xs font-semibold text-[#003B73] flex items-center gap-2">
              <svg className="h-4 w-4 text-[#005A9C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Continuous Intelligence Cycle
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569]">
              {["Collect", "Validate", "Analyse", "Identify", "Recommend", "Measure", "Learn"].map((step, idx, arr) => (
                <React.Fragment key={step}>
                  <span className="rounded-md bg-white px-2.5 py-1 font-medium text-[#003B73] border border-[#E2E8F0]">{step}</span>
                  {idx < arr.length - 1 && <span className="text-[#94A3B8]">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] p-4 text-xs">
          <p className="font-semibold text-[#0369A1]">Data & Evidence Disclaimer</p>
          <p className="mt-1 leading-relaxed text-[#334155]">
            SkillPulse provides evidence-driven workforce intelligence using multi-source data integration. Information may be subject to coverage, freshness, validation, and other data limitations. Users should verify important information with the relevant primary source before making decisions.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] pt-6 sm:flex-row text-xs text-[#64748B]">
          <p>© {currentYear} SkillPulse. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <span className="font-medium text-[#475569]">Missing data ≠ zero demand</span>
            <span className="text-[#D9E1E8]">·</span>
            <span className="font-medium text-[#475569]">Unknown status ≠ unemployed</span>
          </div>
          <p className="font-mono text-[11px] text-[#94A3B8]">SkillPulse v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
