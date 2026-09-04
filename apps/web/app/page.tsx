"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  // Active step state for "How SkillPulse Works" interactive section
  const [activeStep, setActiveStep] = useState<number>(0);

  // Active tab state for Stakeholder section
  const [activeStakeholder, setActiveStakeholder] = useState<number>(0);

  // Active node state for Hero interactive node visual
  const [activeNode, setActiveNode] = useState<string>("skills");

  // How SkillPulse Works Data
  const steps = [
    {
      id: "collect",
      number: "01",
      title: "COLLECT",
      subtitle: "Multi-Source Data Ingestion",
      description:
        "Continuously ingests job postings, employer surveys, curriculum frameworks, training capacity data, and placement reports across districts.",
      detail:
        "Integrates structured and unstructured data feeds without relying on single-source assumptions.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "validate",
      number: "02",
      title: "VALIDATE",
      subtitle: "Quality & Provenance Verification",
      description:
        "Filters out duplicate postings, stale vacancies, reposted listings, and employer hiring spikes to establish baseline evidence quality.",
      detail:
        "Every data point receives a freshness and reliability score before entering analysis.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: "analyse",
      number: "03",
      title: "ANALYSE",
      subtitle: "Skill Taxonomy & Demand Mapping",
      description:
        "Maps employer requirements to standardized skill frameworks, qualification levels, and regional industry clusters.",
      detail:
        "Normalizes disparate job descriptions into comparable competency domains.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: "identify",
      number: "04",
      title: "IDENTIFY GAPS",
      subtitle: "Demand vs Supply Discrepancy",
      description:
        "Compares real-time market demand against effective training supply and curriculum coverage down to the district level.",
      detail:
        "Distinguishes between seat shortages, curriculum mismatches, and geographic imbalances.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: "recommend",
      number: "05",
      title: "RECOMMEND",
      subtitle: "Explainable Policy Interventions",
      description:
        "Generates actionable, evidence-backed recommendations: update curriculum, expand capacity, reallocate seats, or upgrade trainers.",
      detail:
        "Every recommendation specifies root cause, confidence score, and data limitations.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h-4a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: "measure",
      number: "06",
      title: "MEASURE OUTCOMES",
      subtitle: "Employment & Placement Verification",
      description:
        "Tracks actual hiring outcomes, wage trends, and employer satisfaction following policy or curriculum adjustments.",
      detail:
        "Closes the loop by evaluating whether recommended interventions achieved intended results.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: "learn",
      number: "07",
      title: "LEARN",
      subtitle: "Continuous System Refinement",
      description:
        "Feeds outcome results back into the intelligence engine to continuously refine future gap detection and recommendation confidence.",
      detail:
        "Self-correcting model that improves accuracy over successive training cycles.",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
  ];

  // Stakeholder Data
  const stakeholders = [
    {
      role: "Government & Policymakers",
      tagline: "Make evidence-based interventions.",
      description:
        "Identify high-priority district skill gaps, emerging industrial roles, and optimal seat capacity allocation before deploying public training funds.",
      capabilities: [
        "District-wise skill gap analysis",
        "Emerging occupation tracking",
        "Training capacity optimization",
        "Targeted policy intervention modeling",
      ],
      href: "/dashboard",
      buttonText: "Open Executive Dashboard",
    },
    {
      role: "Training Institutes",
      tagline: "Align training with real industry needs.",
      description:
        "Bridge the gap between curriculum units and employer expectations. Identify obsolete modules, trainer upskilling needs, and equipment upgrades.",
      capabilities: [
        "Curriculum coverage alignment",
        "Course relevance health scores",
        "Trainer competency requirements",
        "Equipment & lab planning data",
      ],
      href: "/courses",
      buttonText: "Explore Courses & Capacity",
    },
    {
      role: "Employers & Industry",
      tagline: "Help shape the future skills pipeline.",
      description:
        "Signal hiring requirements, emerging role competencies, and proficiency expectations directly to education planners and curriculum developers.",
      capabilities: [
        "Direct skill demand signaling",
        "Proficiency benchmark definition",
        "Curriculum feedback integration",
        "Candidate readiness feedback",
      ],
      href: "/employers",
      buttonText: "View Employer Intelligence",
    },
    {
      role: "Job Seekers & Learners",
      tagline: "Build skills for real opportunities.",
      description:
        "Understand exactly what skills are required for target roles, discover high-alignment accredited courses, and navigate viable career pathways.",
      capabilities: [
        "Target role skill requirements",
        "Personalized skill gap identification",
        "High-alignment course directory",
        "Regional career pathways",
      ],
      href: "/skills",
      buttonText: "Explore Skill Intelligence",
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">
      {/* ============================================================
          1. HERO SECTION
          ============================================================ */}
      <section className="relative overflow-hidden border-b border-[#E2E8F0] bg-gradient-to-b from-[#F8FAFC] via-[#F1F5F9] to-white py-16 lg:py-24">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f015_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f015_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col gap-6 text-left">
              {/* Eyebrow Pill */}
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#005A9C]">
                <span className="h-2 w-2 rounded-full bg-[#005A9C] animate-pulse" />
                Skill & Workforce Intelligence
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl font-extrabold tracking-tight text-[#003B73] sm:text-5xl lg:text-6xl leading-[1.1]">
                Turn Workforce Data Into <span className="text-[#005A9C]">Better Decisions</span>
              </h1>

              {/* Supporting Subheading */}
              <p className="text-lg leading-relaxed text-[#475569] sm:text-xl max-w-2xl">
                SkillPulse connects labour-market demand, skills, training and
                employment outcomes to identify real workforce gaps and recommend
                evidence-based action.
              </p>

              {/* CTA Buttons & Clerk Auth Integration */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/skills"
                  className="inline-flex items-center justify-center rounded-lg bg-[#005A9C] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#003B73] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Explore Skill Intelligence
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <Show when="signed-out">
                  <SignInButton>
                    <button className="inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] bg-white px-6 py-3.5 text-sm font-semibold text-[#003B73] shadow-xs transition-all duration-150 hover:bg-[#F8FAFC] hover:border-[#94A3B8] cursor-pointer">
                      Sign In to Platform
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg border border-[#005A9C] bg-white px-6 py-3.5 text-sm font-semibold text-[#005A9C] transition-all duration-150 hover:bg-[#EFF6FF]"
                  >
                    Open Workspace Dashboard
                  </Link>
                </Show>
              </div>

              {/* Pilot Scope Badge */}
              <div className="flex items-center gap-3 pt-2 text-xs text-[#64748B]">
                <span className="flex h-2 w-2 rounded-full bg-[#10B981]" />
                <span>
                  <strong className="font-semibold text-[#334155]">Maharashtra MVP</strong> — Architecture designed to scale nationwide across India.
                </span>
              </div>
            </div>

            {/* Right Visual: Interactive Node Architecture Diagram */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#003B73]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#003B73]">
                      SkillPulse Intelligence Architecture
                    </span>
                  </div>
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5 font-mono text-[11px] text-[#475569]">
                    Live Engine
                  </span>
                </div>

                {/* Node Flow Diagram */}
                <div className="flex flex-col gap-3">
                  {[
                    { id: "demand", label: "Labour-Market Demand", icon: "💼", tag: "Jobs & Employer Posts" },
                    { id: "skills", label: "Skills Taxonomy", icon: "⚡", tag: "Competency Mapping" },
                    { id: "curriculum", label: "Curriculum & Capacity", icon: "📚", tag: "Training Alignment" },
                    { id: "outcomes", label: "Employment Outcomes", icon: "🎯", tag: "Placement Signals" },
                  ].map((node) => (
                    <button
                      key={node.id}
                      onClick={() => setActiveNode(node.id)}
                      className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                        activeNode === node.id
                          ? "border-[#005A9C] bg-[#EFF6FF] shadow-xs"
                          : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#CBD5E1] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{node.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-[#003B73]">{node.label}</p>
                          <p className="text-[11px] text-[#64748B]">{node.tag}</p>
                        </div>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${activeNode === node.id ? "bg-[#005A9C]" : "bg-[#CBD5E1]"}`} />
                    </button>
                  ))}
                </div>

                {/* Selected Node Status Box */}
                <div className="mt-4 rounded-lg bg-[#003B73] p-3 text-white text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[#BFDBFE]">Node Context:</span>
                    <span className="text-[10px] font-mono text-[#93C5FD]">Active Signal</span>
                  </div>
                  <p className="text-[#E2E8F0] leading-snug">
                    {activeNode === "demand" && "Aggregating posting frequency, hiring spikes, and employer skill requirements across 36 districts."}
                    {activeNode === "skills" && "Standardizing unstructured job descriptions into NSQF/EQF-aligned skill domains."}
                    {activeNode === "curriculum" && "Evaluating practical module coverage and seat availability in state training institutes."}
                    {activeNode === "outcomes" && "Tracking candidate placement verification and post-training employment sustainability."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Micro-Stats / Conceptual Indicators Bar */}
          <div className="mt-16 grid grid-cols-2 gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Labour Market Demand", status: "Active Tracking", detail: "Multi-Sector Job Aggregation" },
              { label: "Effective Supply", status: "Measured", detail: "State Training Capacity" },
              { label: "Skill Gaps", status: "Identified", detail: "District-Level Mapping" },
              { label: "Curriculum Alignment", status: "Analyzed", detail: "Industry Competency Match" },
              { label: "Evidence Confidence", status: "Scored", detail: "Multi-Source Validation" },
            ].map((stat, idx) => (
              <div key={idx} className="flex flex-col gap-1 border-r border-[#E2E8F0] last:border-0 pr-4 last:pr-0">
                <span className="text-xs font-semibold text-[#003B73]">{stat.label}</span>
                <span className="text-sm font-bold text-[#005A9C]">{stat.status}</span>
                <span className="text-[11px] text-[#64748B]">{stat.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          2. TRUST STATEMENT BANNER
          ============================================================ */}
      <section className="border-b border-[#E2E8F0] bg-[#003B73] py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Evidence before assumptions. Decisions before dashboards.
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-[#BFDBFE]">
            SkillPulse combines information from multiple sources and evaluates freshness,
            reliability, coverage and validation before generating intelligence.
          </p>
        </div>
      </section>

      {/* ============================================================
          3. THE PROBLEM SECTION
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">The Structural Challenge</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              The Workforce Gap Is More Than a Number
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              Workforce mismatch cannot be resolved by simple counts. Disconnects happen across five distinct dimensions in the skill ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                icon: "📘",
                title: "Skills Taught",
                desc: "Curricula often lag behind emerging industry tools, practical frameworks, and equipment.",
              },
              {
                icon: "💼",
                title: "Skills Required",
                desc: "Employers rapidly update requirements based on technological and operational shifts.",
              },
              {
                icon: "🏫",
                title: "Training Capacity",
                desc: "Seat allocations in institutes may not align with regional hiring demand.",
              },
              {
                icon: "🎯",
                title: "Employment Outcomes",
                desc: "Incomplete tracking of post-training candidate hiring and retention rates.",
              },
              {
                icon: "📍",
                title: "Regional Demand",
                desc: "Job openings are concentrated in specific industrial clusters rather than uniformly.",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 transition-all duration-150 hover:border-[#005A9C] hover:bg-white hover:shadow-md"
              >
                <span className="text-3xl">{card.icon}</span>
                <h3 className="text-base font-bold text-[#003B73]">{card.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-6 text-center max-w-3xl mx-auto">
            <p className="text-sm font-bold text-[#003B73]">
              High demand does not automatically mean more training is the answer.
            </p>
            <p className="mt-1 text-xs text-[#475569]">
              The problem could be outdated curriculum, lack of practical trainers, or geographic mismatch rather than seat shortages.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. HOW SKILLPULSE WORKS (INTERACTIVE FLOW)
          ============================================================ */}
      <section id="how-it-works" className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Continuous Cycle</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              From Fragmented Data to Actionable Intelligence
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              Click on any stage of the 7-step intelligence cycle to explore how raw data becomes validated workforce policy.
            </p>
          </div>

          {/* Interactive Steps Bar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7 mb-8">
            {steps.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(idx)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-all duration-150 cursor-pointer ${
                  activeStep === idx
                    ? "border-[#005A9C] bg-[#003B73] text-white shadow-md"
                    : "border-[#E2E8F0] bg-white text-[#475569] hover:border-[#CBD5E1]"
                }`}
              >
                <span className={`text-xs font-mono font-bold ${activeStep === idx ? "text-[#BFDBFE]" : "text-[#94A3B8]"}`}>
                  {step.number}
                </span>
                <span className="text-xs font-bold">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Active Step Detail Card */}
          <div className="rounded-2xl border border-[#005A9C] bg-white p-8 shadow-lg max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#005A9C]">
                {steps[activeStep].icon}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#005A9C]">
                  Stage {steps[activeStep].number} of 07
                </span>
                <h3 className="text-xl font-bold text-[#003B73]">
                  {steps[activeStep].title}: {steps[activeStep].subtitle}
                </h3>
              </div>
            </div>

            <p className="text-sm text-[#334155] leading-relaxed mb-4">
              {steps[activeStep].description}
            </p>

            <div className="rounded-lg bg-[#F8FAFC] p-4 border border-[#E2E8F0] text-xs text-[#64748B]">
              <strong className="text-[#003B73]">Technical Rigor:</strong> {steps[activeStep].detail}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          5. MULTI-SOURCE DATA INTEGRATION
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Multi-Source Ecosystem</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              One Intelligence Layer. Multiple Sources.
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              SkillPulse combines data feeds from diverse ecosystem participants into a unified validation layer.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-center">
            {/* Input Sources */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#003B73] mb-1">
                Ecosystem Inputs
              </h3>
              {[
                "Government Labour Market Datasets",
                "Public & Private Employment Portals",
                "Verified Employer Requirements",
                "Industry Skill Surveys",
                "Training Institute Capacities",
                "Qualification Framework Standards",
              ].map((input, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs font-medium text-[#334155]">
                  <span className="h-2 w-2 rounded-full bg-[#005A9C]" />
                  {input}
                </div>
              ))}
            </div>

            {/* Central Layer */}
            <div className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-[#005A9C] bg-[#EFF6FF]">
              <div className="h-14 w-14 rounded-full bg-[#003B73] text-white flex items-center justify-center font-bold text-xl mb-3">
                SP
              </div>
              <h3 className="text-lg font-bold text-[#003B73]">SkillPulse Intelligence Layer</h3>
              <p className="mt-2 text-xs text-[#475569] leading-relaxed">
                Normalizes taxonomies, verifies data freshness, detects duplicates, and assigns confidence weights before generating recommendations.
              </p>
            </div>

            {/* Output Interventions */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#003B73] mb-1">
                Actionable Outputs
              </h3>
              {[
                "District Skill Gap Heatmaps",
                "Curriculum Update Priorities",
                "Training Capacity Allocation",
                "Trainer Upskilling Plans",
                "Policy Intervention Guidance",
                "Placement Outcome Signals",
              ].map((output, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-[#BFDBFE] bg-[#F0F9FF] p-3 text-xs font-semibold text-[#003B73]">
                  <svg className="h-4 w-4 text-[#005A9C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {output}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          6. DATA RELIABILITY & QUALITY MATRIX
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Evidence Quality</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
                Not All Data Is Equal
              </h2>
              <p className="mt-4 text-base text-[#475569] leading-relaxed">
                SkillPulse evaluates the freshness, reliability, coverage, and validation status of every evidence stream before presenting recommendations. Decision-makers see the exact confidence score behind every insight.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-start gap-3 text-xs text-[#334155]">
                  <span className="rounded bg-[#EFF6FF] p-1 text-[#005A9C] font-bold">✓</span>
                  <span><strong>Freshness Scoring:</strong> Identifies stale postings and outdated vacancy listings.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#334155]">
                  <span className="rounded bg-[#EFF6FF] p-1 text-[#005A9C] font-bold">✓</span>
                  <span><strong>Duplicate Detection:</strong> Removes multi-board reposted job ads to prevent artificial demand spikes.</span>
                </div>
                <div className="flex items-start gap-3 text-xs text-[#334155]">
                  <span className="rounded bg-[#EFF6FF] p-1 text-[#005A9C] font-bold">✓</span>
                  <span><strong>Coverage Audit:</strong> Explicitly highlights district data limitations.</span>
                </div>
              </div>
            </div>

            {/* Data Quality Card */}
            <div className="rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-md">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-4 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#003B73]">
                  Evidence Quality Matrix
                </span>
                <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#005A9C]">
                  Illustrative Example
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { metric: "Source Aggregation", value: "Multi-Source Verified", score: "High" },
                  { metric: "Data Freshness", value: "Updated Weekly", score: "High" },
                  { metric: "Validation Status", value: "Cross-Referenced", score: "Medium-High" },
                  { metric: "District Coverage", value: "36 Districts (Maharashtra)", score: "Full MVP" },
                  { metric: "Confidence Score", value: "Index: 84 / 100", score: "High" },
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] p-3 text-xs border border-[#E2E8F0]">
                    <span className="font-semibold text-[#334155]">{row.metric}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#64748B]">{row.value}</span>
                      <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 font-bold text-[#047857] text-[11px]">
                        {row.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          7. IMPORTANT DATA PRINCIPLES
          ============================================================ */}
      <section className="py-12 bg-[#003B73] text-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-xl border border-[#005A9C] bg-[#002D59] p-6">
              <h3 className="text-lg font-bold text-[#BFDBFE] mb-2">Missing data ≠ zero demand</h3>
              <p className="text-xs text-[#E2E8F0] leading-relaxed">
                Absence of active online job postings in a specific district does not mean zero employer demand. SkillPulse accounts for informal hiring channels, reporting latency, and unposted vacancy estimates.
              </p>
            </div>

            <div className="rounded-xl border border-[#005A9C] bg-[#002D59] p-6">
              <h3 className="text-lg font-bold text-[#BFDBFE] mb-2">Unknown employment status ≠ unemployed</h3>
              <p className="text-xs text-[#E2E8F0] leading-relaxed">
                Unconfirmed post-training placement status is categorized separately from verified unemployment to prevent biased policy conclusions and preserve diagnostic transparency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          8. SKILL INTELLIGENCE MAPPING
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Taxonomy Mapping</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              Understand What the Market Actually Needs
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              SkillPulse translates job roles into granular competency units and matches them directly to accredited course modules.
            </p>
          </div>

          {/* Interactive Relationship Chain */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {[
              { step: "Job Role", example: "EV Service Technician", color: "border-[#003B73] bg-[#EFF6FF]" },
              { step: "Required Skill", example: "Battery Diagnostics & BMS", color: "border-[#005A9C] bg-[#F0F9FF]" },
              { step: "Proficiency Level", example: "Level 4 (Advanced Practical)", color: "border-[#0284C7] bg-[#F8FAFC]" },
              { step: "Qualification Standard", example: "NSQF Aligned Module", color: "border-[#0369A1] bg-[#F0F9FF]" },
              { step: "Course / Curriculum", example: "ITI Auto-Electric Unit 3", color: "border-[#003B73] bg-[#EFF6FF]" },
            ].map((chain, idx) => (
              <div key={idx} className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left ${chain.color}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#005A9C]">
                  Step 0{idx + 1}
                </span>
                <h4 className="text-xs font-bold text-[#003B73]">{chain.step}</h4>
                <p className="text-xs text-[#334155] font-medium mt-1">{chain.example}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          9. DEMAND VS SUPPLY BREAKDOWN
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Discrepancy Analysis</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              See Where Demand and Supply Do Not Match
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              Visualizing the gap between market demand signals and effective training capacity.
            </p>
          </div>

          {/* Illustrative Bar Comparison */}
          <div className="rounded-2xl border border-[#CBD5E1] bg-white p-8 shadow-md max-w-3xl mx-auto mb-12">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold uppercase text-[#003B73]">Labour Market vs Training Capacity Comparison</span>
              <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-semibold text-[#005A9C]">Illustrative Example</span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#003B73]">Labour Market Demand Signal</span>
                  <span className="text-[#005A9C]">High Hiring Demand</span>
                </div>
                <div className="h-4 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#003B73] rounded-full w-[85%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#003B73]">Effective Training Supply</span>
                  <span className="text-[#64748B]">Moderate Capacity</span>
                </div>
                <div className="h-4 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#005A9C] rounded-full w-[45%]" />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] flex justify-between items-center text-xs">
                <span className="font-bold text-[#B45309]">Identified Discrepancy:</span>
                <span className="font-semibold text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-full">
                  38% Skill & Capacity Gap (Shortage Signal)
                </span>
              </div>
            </div>
          </div>

          {/* 7 Possible Outcome Signals */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { signal: "Shortage", desc: "Demand > Supply", badge: "bg-red-50 text-red-700 border-red-200" },
              { signal: "Oversupply", desc: "Supply > Demand", badge: "bg-amber-50 text-amber-700 border-amber-200" },
              { signal: "Skill Mismatch", desc: "Wrong Skills Taught", badge: "bg-orange-50 text-orange-700 border-orange-200" },
              { signal: "Curriculum Gap", desc: "Module Missing", badge: "bg-blue-50 text-blue-700 border-blue-200" },
              { signal: "Geographic Mismatch", desc: "District Disconnect", badge: "bg-purple-50 text-purple-700 border-purple-200" },
              { signal: "Capacity Limit", desc: "Seat Bottleneck", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
              { signal: "Data Risk", desc: "Low Confidence", badge: "bg-gray-50 text-gray-700 border-gray-200" },
            ].map((item, idx) => (
              <div key={idx} className={`flex flex-col items-center rounded-xl border p-3 text-center ${item.badge}`}>
                <span className="text-xs font-bold">{item.signal}</span>
                <span className="text-[10px] mt-0.5 opacity-80">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          10. CURRICULUM GAP ANALYZER
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Curriculum Alignment</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              Align Training With Industry
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              Compare required employer competencies against existing course coverage to pinpoint required curriculum updates.
            </p>
          </div>

          <div className="rounded-2xl border border-[#CBD5E1] bg-white overflow-hidden shadow-md max-w-4xl mx-auto">
            <div className="bg-[#003B73] px-6 py-4 flex justify-between items-center text-white">
              <span className="text-xs font-bold uppercase tracking-wider">Sample Curriculum Alignment Table</span>
              <span className="rounded bg-[#005A9C] px-2.5 py-0.5 text-[10px] font-semibold text-white">Illustrative Example</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#003B73]">
                  <tr>
                    <th className="px-6 py-3 font-bold">Required Market Skill</th>
                    <th className="px-6 py-3 font-bold">Course Module Coverage</th>
                    <th className="px-6 py-3 font-bold">Alignment Status</th>
                    <th className="px-6 py-3 font-bold">Recommended Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  <tr>
                    <td className="px-6 py-4 font-semibold text-[#1E293B]">High-Voltage Battery Safety</td>
                    <td className="px-6 py-4 text-[#475569]">Fully Covered in Unit 2</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">✓ Covered</span></td>
                    <td className="px-6 py-4 text-[#475569]">Maintain Current Module</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-[#1E293B]">BMS Firmware Diagnostics</td>
                    <td className="px-6 py-4 text-[#475569]">Partial Theory Only</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">⚠ Partial</span></td>
                    <td className="px-6 py-4 font-semibold text-[#005A9C]">Add Practical Lab Hours</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-semibold text-[#1E293B]">IoT Telematics Data Analysis</td>
                    <td className="px-6 py-4 text-[#475569]">Not Included in Syllabus</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-800">✕ Missing</span></td>
                    <td className="px-6 py-4 font-semibold text-[#B91C1C]">Update Curriculum Unit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          11. INTELLIGENT RECOMMENDATIONS (ROOT CAUSE ANALYSIS)
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Root Cause Intelligence</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              From Insight to Action
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              SkillPulse does not just report high demand—it diagnoses why the gap exists and recommends targeted policy actions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                scenario: "Scenario A",
                demand: "High Demand",
                capacity: "High Capacity",
                alignment: "Low Curriculum Alignment",
                action: "UPDATE CURRICULUM",
                detail: "Update existing course units rather than creating additional seats.",
                color: "border-[#005A9C] bg-[#EFF6FF]",
              },
              {
                scenario: "Scenario B",
                demand: "High Demand",
                capacity: "Low Capacity",
                alignment: "High Curriculum Alignment",
                action: "EXPAND CAPACITY",
                detail: "Increase seat allocation in high-performing local institutes.",
                color: "border-[#10B981] bg-[#ECFDF5]",
              },
              {
                scenario: "Scenario C",
                demand: "Low Demand",
                capacity: "High Capacity",
                alignment: "Moderate Alignment",
                action: "REALLOCATE SEATS",
                detail: "Shift training capacity toward emerging high-growth sectors.",
                color: "border-[#F59E0B] bg-[#FFFBEB]",
              },
            ].map((card, idx) => (
              <div key={idx} className={`flex flex-col justify-between rounded-xl border-2 p-6 ${card.color}`}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-[#003B73]">{card.scenario}</span>
                    <span className="text-[10px] font-semibold text-[#64748B]">Illustrative Example</span>
                  </div>
                  <div className="space-y-1 text-xs text-[#334155] mb-4">
                    <p>• {card.demand}</p>
                    <p>• {card.capacity}</p>
                    <p>• {card.alignment}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#CBD5E1]">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#003B73]">
                    Recommended Action:
                  </span>
                  <p className="text-sm font-bold text-[#005A9C] mt-1">{card.action}</p>
                  <p className="text-xs text-[#475569] mt-1">{card.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          12. CONFIDENCE-AWARE RECOMMENDATIONS
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto rounded-2xl border-2 border-[#003B73] bg-[#003B73] text-white p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#005A9C] pb-4 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#BFDBFE]">
                  Confidence & Evidence Card
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Every Recommendation Comes With Evidence
                </h3>
              </div>
              <span className="mt-2 sm:mt-0 inline-flex items-center rounded-full bg-[#10B981] px-3 py-1 text-xs font-bold text-white">
                Medium–High Confidence Index (84/100)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-[#002D59] p-4 rounded-xl border border-[#005A9C]">
                <strong className="text-[#93C5FD] block mb-1">Target Action:</strong>
                <p className="text-white font-semibold text-sm">Update EV Technician Practical Syllabus</p>
              </div>

              <div className="bg-[#002D59] p-4 rounded-xl border border-[#005A9C]">
                <strong className="text-[#93C5FD] block mb-1">Supporting Evidence:</strong>
                <p className="text-[#E2E8F0]">Strong employer demand across 14 industrial districts with 38% practical gap.</p>
              </div>

              <div className="bg-[#002D59] p-4 rounded-xl border border-[#005A9C]">
                <strong className="text-[#FCD34D] block mb-1">Data Limitations:</strong>
                <p className="text-[#E2E8F0]">Employer survey evidence concentrated in major industrial corridors.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          13. EARLY WARNING SYSTEM
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Early Signals</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              See Workforce Changes Before They Become Critical
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              Five early warning indicators alert policy planners to emerging trends and potential risks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { title: "Critical Skill Gap", color: "border-red-300 bg-red-50 text-red-900", desc: "Demand significantly exceeds effective supply." },
              { title: "Emerging Skill", color: "border-emerald-300 bg-emerald-50 text-emerald-900", desc: "Hiring demand is growing consistently." },
              { title: "Watch List", color: "border-blue-300 bg-blue-50 text-blue-900", desc: "Potential emerging demand, but evidence is limited." },
              { title: "Oversupply Risk", color: "border-amber-300 bg-amber-50 text-amber-900", desc: "Training capacity exceeds supported demand." },
              { title: "Data Risk", color: "border-gray-300 bg-gray-50 text-gray-900", desc: "Evidence is insufficient or conflicting." },
            ].map((signal, idx) => (
              <div key={idx} className={`rounded-xl border p-4 flex flex-col justify-between ${signal.color}`}>
                <h4 className="text-xs font-bold">{signal.title}</h4>
                <p className="text-[11px] mt-2 opacity-90 leading-snug">{signal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          14. FOUR STAKEHOLDERS PERSPECTIVES
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Tailored Intelligence</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              One Platform. Four Perspectives.
            </h2>
            <p className="mt-4 text-base text-[#475569]">
              SkillPulse provides distinct value streams tailored for every participant in the workforce ecosystem.
            </p>
          </div>

          {/* Stakeholder Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {stakeholders.map((sh, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStakeholder(idx)}
                className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-150 cursor-pointer ${
                  activeStakeholder === idx
                    ? "bg-[#003B73] text-white shadow-md"
                    : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                }`}
              >
                {sh.role}
              </button>
            ))}
          </div>

          {/* Active Stakeholder Card */}
          <div className="rounded-2xl border-2 border-[#005A9C] bg-[#F8FAFC] p-8 max-w-4xl mx-auto shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6 mb-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#005A9C]">
                  Stakeholder Experience
                </span>
                <h3 className="text-2xl font-bold text-[#003B73] mt-1">
                  {stakeholders[activeStakeholder].role}
                </h3>
                <p className="text-sm font-semibold text-[#005A9C] mt-1">
                  {stakeholders[activeStakeholder].tagline}
                </p>
              </div>

              <Link
                href={stakeholders[activeStakeholder].href}
                className="inline-flex items-center justify-center rounded-lg bg-[#005A9C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#003B73] transition-colors self-start md:self-auto"
              >
                {stakeholders[activeStakeholder].buttonText}
              </Link>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed mb-6">
              {stakeholders[activeStakeholder].description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stakeholders[activeStakeholder].capabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white p-3 border border-[#E2E8F0] text-xs font-semibold text-[#003B73]">
                  <span className="h-2 w-2 rounded-full bg-[#005A9C]" />
                  {cap}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          15. MAHARASHTRA MVP TO NATIONAL SCALE
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Scalable Architecture</span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
                Starting in Maharashtra. Built for India.
              </h2>
              <p className="mt-4 text-base text-[#475569] leading-relaxed">
                Maharashtra serves as the initial MVP and validation environment for SkillPulse, proving the evidence pipeline before scaling across India&apos;s diverse state workforce ecosystems.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <div className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] p-4 text-xs">
                  <strong className="text-[#003B73] block mb-1">Current MVP Validation Scope:</strong>
                  <p className="text-[#475569]">District-level data aggregation across 36 districts of Maharashtra.</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-xs">
                  <strong className="text-[#003B73] block mb-1">National Scaling Strategy:</strong>
                  <p className="text-[#475569]">Modular data connectors designed for multi-state rollout.</p>
                </div>
              </div>
            </div>

            {/* Hierarchical Visual */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-md text-xs">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3 font-bold text-[#003B73]">
                <span>Workforce Intelligence Hierarchy</span>
                <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[10px] text-[#005A9C]">Scale Pipeline</span>
              </div>

              {[
                { level: "India", scope: "National Platform Target", status: "Scalable Architecture" },
                { level: "Maharashtra", scope: "Initial MVP & Validation Environment", status: "Active MVP" },
                { level: "Districts", scope: "36 Regional Labour Markets", status: "Granular Mapping" },
                { level: "Institutions & ITIs", scope: "Training Capacity & Courses", status: "Course Tracking" },
                { level: "Employers", scope: "Industry Skill Demand Signals", status: "Live Aggregation" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] p-3 border border-[#E2E8F0]">
                  <div>
                    <strong className="text-[#003B73] block">{item.level}</strong>
                    <span className="text-[11px] text-[#64748B]">{item.scope}</span>
                  </div>
                  <span className="rounded-full bg-[#005A9C]/10 px-2.5 py-0.5 font-semibold text-[#005A9C] text-[11px]">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          16. CONTINUOUS FEEDBACK LOOP
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">System Learning</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
            A Workforce Intelligence System That Learns
          </h2>
          <p className="mt-4 text-base text-[#475569] max-w-3xl mx-auto">
            SkillPulse is not a static one-time report. It continuously measures placement outcomes to refine future recommendations.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 max-w-5xl mx-auto text-xs">
            {[
              "Employer Demand",
              "Skill Extraction",
              "SkillPulse Engine",
              "Curriculum Update",
              "Trained Candidates",
              "Outcome Tracking",
              "Model Learning",
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center rounded-xl border border-[#005A9C] bg-[#EFF6FF] p-3 font-semibold text-[#003B73]">
                <span className="text-[10px] text-[#005A9C] font-mono mb-1">0{idx + 1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          17. IMPACT SECTION
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#005A9C]">Systemic Impact</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#003B73] sm:text-4xl">
              Better Intelligence. Better Workforce Decisions.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { action: "Reduce", topic: "Curriculum-Industry Mismatch", desc: "Align course modules directly with verified hiring competencies." },
              { action: "Improve", topic: "Training Relevance", desc: "Focus state training resources on high-demand practical skills." },
              { action: "Identify", topic: "Emerging Skills Earlier", desc: "Detect growth signals before skill shortages constrain industry." },
              { action: "Plan", topic: "Training Capacity", desc: "Allocate institute seats based on regional district demand." },
              { action: "Support", topic: "Trainer Planning", desc: "Identify faculty upskilling needs for emerging technologies." },
              { action: "Improve", topic: "Employment Outcomes", desc: "Track verified hiring results to validate policy effectiveness." },
            ].map((impact, idx) => (
              <div key={idx} className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#005A9C]">{impact.action}</span>
                <h3 className="text-base font-bold text-[#003B73] mt-1">{impact.topic}</h3>
                <p className="text-xs text-[#475569] mt-2 leading-relaxed">{impact.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          18. DATA TRANSPARENCY BANNER
          ============================================================ */}
      <section className="py-12 bg-white border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#F0F9FF] p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-[#003B73]">Built on Evidence. Designed for Transparency.</h3>
            <p className="mt-2 text-xs text-[#334155] leading-relaxed max-w-2xl mx-auto">
              SkillPulse surfaces evidence quality, coverage limits, and uncertainty scores instead of hiding them behind black-box algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
          19. FINAL CALL TO ACTION (CTA)
          ============================================================ */}
      <section className="py-16 lg:py-24 bg-[#003B73] text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Understand What Is Changing. Decide What To Do Next.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#BFDBFE]">
            SkillPulse brings labour-market evidence, skill intelligence, training data and outcome signals together to support clearer workforce decisions.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/skills"
              className="rounded-lg bg-[#005A9C] px-8 py-4 text-sm font-semibold text-white shadow-md hover:bg-white hover:text-[#003B73] transition-all duration-150"
            >
              Explore Skill Intelligence
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-[#BFDBFE] bg-transparent px-8 py-4 text-sm font-semibold text-white hover:bg-[#002D59] transition-all duration-150"
            >
              Explore Executive Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
