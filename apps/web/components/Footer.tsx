"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Brand Logo Mark (SkillPulse Workforce Node Icon)
function SkillPulseLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" fill="#003B73" fillOpacity="0.08" />
      <path
        d="M8 17L13 12L17 16L24 9"
        stroke="#005A9C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="17" r="2.5" fill="#003B73" />
      <circle cx="13" cy="12" r="2.5" fill="#005A9C" />
      <circle cx="17" cy="16" r="2.5" fill="#0284C7" />
      <circle cx="24" cy="9" r="3" fill="#003B73" />
      <path
        d="M8 23H24"
        stroke="#003B73"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  // Check if current route is within dashboard layout
  const isDashboardRoute =
    pathname !== "/" &&
    !pathname?.startsWith("/sign-in") &&
    !pathname?.startsWith("/sign-up");

  return (
    <footer
      className={`border-t border-[#E2E8F0] bg-[#F8FAFC] text-[#1F2937] transition-all duration-150 ${
        isDashboardRoute ? "lg:ml-[var(--sp-sidebar-width,256px)]" : "w-full"
      }`}
      aria-label="Site Footer"
    >
      {/* Top Accent Band */}
      <div className="h-1 w-full bg-gradient-to-r from-[#003B73] via-[#005A9C] to-[#0284C7]" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand & Mission Column (Spans 2 cols on lg) */}
          <div className="lg:col-span-2 flex flex-col gap-4 pr-0 lg:pr-6">
            <div className="flex items-center gap-2.5">
              <SkillPulseLogoMark className="h-8 w-8 shrink-0" />
              <span className="text-xl font-bold tracking-tight text-[#003B73]">
                SkillPulse
              </span>
              <span className="inline-flex items-center rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#005A9C]">
                Maharashtra MVP
              </span>
            </div>

            <p className="text-xs leading-relaxed text-[#475569]">
              Evidence-driven skill and workforce intelligence platform connecting
              labour-market demand, skills, training, curriculum and employment
              outcomes.
            </p>

            {/* Platform Identity & Scope Note */}
            <div className="rounded-md border border-[#E2E8F0] bg-white p-3 text-xs text-[#64748B] shadow-xs">
              <p className="font-medium text-[#1E293B]">
                Institutional Intelligence Scope:
              </p>
              <p className="mt-1 leading-snug">
                Maharashtra serves as the initial MVP and validation environment,
                with an architecture designed to scale across India.
              </p>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#003B73]">
              Platform Intelligence
            </h3>
            <ul className="flex flex-col gap-2 text-xs font-medium text-[#475569]">
              <li>
                <Link
                  href="/jobs"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Labour Market Demand
                </Link>
              </li>
              <li>
                <Link
                  href="/skills"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Skill Intelligence
                </Link>
              </li>
              <li>
                <Link
                  href="/gaps"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Demand vs Supply Gaps
                </Link>
              </li>
              <li>
                <Link
                  href="/curricula"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Curriculum Analysis
                </Link>
              </li>
              <li>
                <Link
                  href="/recommendations"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Actionable Recommendations
                </Link>
              </li>
              <li>
                <Link
                  href="/outcomes"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Outcome Tracking
                </Link>
              </li>
            </ul>
          </div>

          {/* Stakeholders Navigation */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#003B73]">
              Stakeholders
            </h3>
            <ul className="flex flex-col gap-2 text-xs font-medium text-[#475569]">
              <li>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Government & Policymakers
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Training Institutes
                </Link>
              </li>
              <li>
                <Link
                  href="/employers"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Employers & Industry
                </Link>
              </li>
              <li>
                <Link
                  href="/skills"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Job Seekers & Learners
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & System Navigation */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#003B73]">
              Resources & Data
            </h3>
            <ul className="flex flex-col gap-2 text-xs font-medium text-[#475569]">
              <li>
                <Link
                  href="/settings"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Data Sources & Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/courses"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Courses & Capacity
                </Link>
              </li>
              <li>
                <Link
                  href="/gaps"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Regional Skill Gaps
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="transition-colors hover:text-[#005A9C] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Platform Home
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Intelligence Cycle Bar */}
        <div className="mt-8 rounded-lg border border-[#E2E8F0] bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#003B73]">
              <svg
                className="h-4 w-4 text-[#005A9C]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Continuous Intelligence Cycle:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#475569]">
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Collect</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Validate</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Analyse</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Identify Gaps</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Recommend</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Measure</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-medium text-[#003B73]">Learn</span>
            </div>
          </div>
        </div>

        {/* Data & Evidence Disclaimer */}
        <div className="mt-4 rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] p-4 text-xs text-[#0F172A]">
          <p className="font-semibold text-[#0369A1]">Data & Evidence Disclaimer:</p>
          <p className="mt-1 leading-relaxed text-[#334155]">
            SkillPulse provides evidence-driven workforce intelligence using multi-source
            data integration. Information may be subject to coverage, freshness,
            validation, and other data limitations. Users should verify important
            information with the relevant primary source before making decisions.
          </p>
        </div>

        {/* Copyright & Data Principles Footer Bottom */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[#E2E8F0] pt-6 sm:flex-row text-xs text-[#64748B]">
          <p>© {currentYear} SkillPulse. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            <span className="font-medium text-[#475569]">
              Missing data ≠ zero demand
            </span>
            <span className="text-[#CBD5E1]">•</span>
            <span className="font-medium text-[#475569]">
              Unknown status ≠ unemployed
            </span>
          </div>

          <p className="font-mono text-[11px] text-[#94A3B8]">
            SkillPulse Engine v1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}
