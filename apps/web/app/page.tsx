"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";

export default function Home() {
  const router = useRouter();

  // Search/explore state in Hero
  const [searchQuery, setSearchQuery] = useState("");

  // Interactive Node selection state in Hero visual
  const [activeNode, setActiveNode] = useState<string>("market");

  // Timeline step state in "How SkillPulse Works"
  const [activeTimelineStep, setActiveTimelineStep] = useState<number>(1);

  // Tab state in "From Data to Decision"
  const [activeScenarioTab, setActiveScenarioTab] = useState<"data" | "recommendation">("recommendation");

  // Tab state in Stakeholders section
  const [activeStakeholderTab, setActiveStakeholderTab] = useState<number>(0);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.toLowerCase();
    if (query.includes("course") || query.includes("capacity") || query.includes("training")) {
      router.push("/courses");
    } else if (query.includes("gap") || query.includes("shortage") || query.includes("supply")) {
      router.push("/gaps");
    } else if (query.includes("job") || query.includes("market") || query.includes("demand")) {
      router.push("/jobs");
    } else {
      router.push("/skills");
    }
  };

  // Node descriptions for Hero visual
  const nodeInfo: Record<string, { title: string; subtitle: string; description: string }> = {
    market: {
      title: "01. Labour Market Demand",
      subtitle: "What employers need",
      description: "Understand employer demand, job vacancy frequency, hiring signals, and labour-market trends across regional sectors.",
    },
    skills: {
      title: "02. Skills Taxonomy",
      subtitle: "What candidates & workers have",
      description: "Map required skills, proficiency benchmarks, and qualification levels against standardized national competency frameworks.",
    },
    training: {
      title: "03. Training & Curriculum",
      subtitle: "What institutions teach & provide",
      description: "Compare industry requirements with course module coverage, trainer readiness, and institute seat capacities.",
    },
    outcomes: {
      title: "04. Employment Outcomes",
      subtitle: "What happens after training",
      description: "Track candidate placement verification, post-training employment sustainability, and policy outcome signals.",
    },
  };

  // Timeline steps
  const timelineSteps = [
    { num: "01", name: "Collect", title: "Collect Data", detail: "Ingest job postings, employer surveys, curriculum units, and institute training capacity records." },
    { num: "02", name: "Validate", title: "Validate Evidence", detail: "Check freshness, reliability, duplicates, reposted vacancies, conflicting information and coverage limits." },
    { num: "03", name: "Analyse", title: "Analyse Skills", detail: "Normalize job descriptions into standardized competency domains and qualification standards." },
    { num: "04", name: "Identify Gaps", title: "Identify Gaps", detail: "Compare demand vs supply to distinguish between skill, curriculum, capacity, and geographic gaps." },
    { num: "05", name: "Recommend", title: "Recommend Action", detail: "Generate explainable policy guidance specifying target action, root cause, confidence score, and limitations." },
    { num: "06", name: "Measure", title: "Measure Outcomes", detail: "Track actual hiring results and post-intervention placement sustainability to refine future models." },
  ];

  // Stakeholder items
  const stakeholders = [
    {
      role: "Government & Policymakers",
      question: "Where should public skill development funds be deployed?",
      items: ["District skill gap heatmaps", "Emerging occupation tracking", "Institute capacity optimization", "Targeted priority interventions"],
      href: "/dashboard",
      linkText: "Open Executive Dashboard →",
    },
    {
      role: "Training Institutes",
      question: "Does training match what employers need?",
      items: ["Curriculum module alignment", "Course relevance health scores", "Trainer upskilling requirements", "Equipment & lab planning data"],
      href: "/courses",
      linkText: "Explore Courses & Capacity →",
    },
    {
      role: "Employers & Industry",
      question: "How can industry signal future skill requirements?",
      items: ["Direct skill demand signaling", "Proficiency benchmark definition", "Curriculum feedback integration", "Candidate readiness feedback"],
      href: "/employers",
      linkText: "View Employer Intelligence →",
    },
    {
      role: "Learners & Job Seekers",
      question: "What skills are required for target career roles?",
      items: ["Target role skill requirements", "Personalized skill gap identification", "High-alignment accredited courses", "Regional career pathways"],
      href: "/skills",
      linkText: "Explore Skill Intelligence →",
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">
      {/* ============================================================
          SECTION 1 — HERO (ACTION ORIENTED + INTERACTIVE NODE EXPLORER)
          ============================================================ */}
      <section className="border-b border-[#D9E1E8] bg-[#F5F7FA] py-10 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Heading & Action Exploration Area */}
            <div className="lg:col-span-7 flex flex-col gap-4 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 self-start bg-[#003B73] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                SKILL & WORKFORCE INTELLIGENCE
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl font-extrabold tracking-tight text-[#003B73] sm:text-4xl lg:text-5xl leading-tight">
                Turn Workforce Data Into Better Decisions
              </h1>

              {/* Short Description */}
              <p className="text-sm leading-relaxed text-[#475569] sm:text-base max-w-2xl">
                SkillPulse connects labour-market demand, skills, training and employment outcomes to identify workforce gaps and support evidence-based decisions.
              </p>

              {/* Search & Exploration Action Bar */}
              <div className="mt-2 rounded-xs border border-[#D9E1E8] bg-white p-4 shadow-xs">
                <span className="text-xs font-bold text-[#003B73] block mb-2">
                  What do you want to explore?
                </span>

                <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills, roles, courses or workforce insights..."
                    className="flex-1 border border-[#D9E1E8] bg-[#F5F7FA] px-3 py-2 text-xs text-[#1F2937] placeholder-[#94A3B8] focus:border-[#005A9C] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-[#005A9C] px-4 py-2 text-xs font-semibold text-white hover:bg-[#003B73] transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Quick Action Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-[#64748B]">Quick Actions:</span>
                  <Link
                    href="/skills"
                    className="border border-[#D9E1E8] bg-[#F5F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#005A9C] hover:bg-[#EFF6FF] hover:border-[#005A9C]"
                  >
                    [Explore Skills]
                  </Link>
                  <Link
                    href="/courses"
                    className="border border-[#D9E1E8] bg-[#F5F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#005A9C] hover:bg-[#EFF6FF] hover:border-[#005A9C]"
                  >
                    [Explore Courses]
                  </Link>
                  <Link
                    href="/dashboard"
                    className="border border-[#D9E1E8] bg-[#F5F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#005A9C] hover:bg-[#EFF6FF] hover:border-[#005A9C]"
                  >
                    [View Workforce Insights]
                  </Link>
                  <Link
                    href="/gaps"
                    className="border border-[#D9E1E8] bg-[#F5F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#005A9C] hover:bg-[#EFF6FF] hover:border-[#005A9C]"
                  >
                    [Understand Skill Gaps]
                  </Link>
                </div>
              </div>

              {/* Primary Buttons & Clerk Auth */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/skills"
                  className="inline-flex items-center justify-center bg-[#005A9C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#003B73] focus-visible:outline-2 focus-visible:outline-[#005A9C] focus-visible:outline-offset-2"
                >
                  Explore Skill Intelligence
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center border border-[#005A9C] bg-white px-5 py-2 text-xs font-semibold text-[#005A9C] transition-colors hover:bg-[#EFF6FF]"
                >
                  How It Works
                </a>

                <Show when="signed-out">
                  <SignInButton>
                    <button className="inline-flex items-center justify-center border border-[#D9E1E8] bg-white px-5 py-2 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#F5F7FA] cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center border border-[#003B73] bg-[#003B73] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#002D59]"
                  >
                    Open Workspace Dashboard
                  </Link>
                </Show>
              </div>
            </div>

            {/* Right Column: Interactive Node Explorer Panel */}
            <div className="lg:col-span-5">
              <div className="border border-[#D9E1E8] bg-white p-4 shadow-xs">
                <div className="bg-[#003B73] px-3 py-2 text-white font-bold text-xs uppercase tracking-wider mb-3 flex justify-between items-center">
                  <span>SkillPulse Intelligence Flow</span>
                  <span className="text-[10px] font-normal text-[#BFDBFE]">Click any node</span>
                </div>

                {/* Node Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { key: "market", label: "Labour Market", icon: "💼" },
                    { key: "skills", label: "Skills Taxonomy", icon: "⚡" },
                    { key: "training", label: "Training & Curriculum", icon: "📚" },
                    { key: "outcomes", label: "Employment Outcomes", icon: "🎯" },
                  ].map((node) => (
                    <button
                      key={node.key}
                      type="button"
                      onClick={() => setActiveNode(node.key)}
                      className={`p-2.5 text-left border text-xs font-bold transition-all cursor-pointer ${
                        activeNode === node.key
                          ? "border-[#005A9C] bg-[#EFF6FF] text-[#003B73]"
                          : "border-[#D9E1E8] bg-[#F5F7FA] text-[#475569] hover:bg-white"
                      }`}
                    >
                      <span className="mr-1.5">{node.icon}</span>
                      {node.label}
                    </button>
                  ))}
                </div>

                {/* Selected Node Explanation Card */}
                <div className="border border-[#005A9C] bg-[#EFF6FF] p-3 text-xs">
                  <span className="font-bold text-[#003B73] block mb-0.5">
                    {nodeInfo[activeNode].title}
                  </span>
                  <span className="text-[11px] font-semibold text-[#005A9C] block mb-1">
                    ({nodeInfo[activeNode].subtitle})
                  </span>
                  <p className="text-[#334155] text-[11px] leading-snug">
                    &quot;{nodeInfo[activeNode].description}&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — QUICK ACCESS PORTAL SHORTCUTS AREA
          ============================================================ */}
      <section className="border-b border-[#D9E1E8] bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 bg-[#005A9C]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#003B73]">Quick Access Portal Shortcuts</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/skills"
              className="flex items-start gap-3 border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-left transition-colors hover:border-[#005A9C] hover:bg-[#EFF6FF]"
            >
              <span className="text-base font-bold text-[#005A9C]">01</span>
              <div>
                <h3 className="text-xs font-bold text-[#003B73]">Skill Intelligence</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Explore skills required for emerging roles.</p>
              </div>
            </Link>

            <Link
              href="/gaps"
              className="flex items-start gap-3 border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-left transition-colors hover:border-[#005A9C] hover:bg-[#EFF6FF]"
            >
              <span className="text-base font-bold text-[#005A9C]">02</span>
              <div>
                <h3 className="text-xs font-bold text-[#003B73]">Demand & Supply</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Understand workforce shortages and mismatches.</p>
              </div>
            </Link>

            <Link
              href="/curricula"
              className="flex items-start gap-3 border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-left transition-colors hover:border-[#005A9C] hover:bg-[#EFF6FF]"
            >
              <span className="text-base font-bold text-[#005A9C]">03</span>
              <div>
                <h3 className="text-xs font-bold text-[#003B73]">Curriculum Analysis</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Compare training with industry requirements.</p>
              </div>
            </Link>

            <Link
              href="/recommendations"
              className="flex items-start gap-3 border border-[#D9E1E8] bg-[#F5F7FA] p-3 text-left transition-colors hover:border-[#005A9C] hover:bg-[#EFF6FF]"
            >
              <span className="text-base font-bold text-[#005A9C]">04</span>
              <div>
                <h3 className="text-xs font-bold text-[#003B73]">Recommendations</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">See evidence-based actionable guidance.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — THE WORKFORCE CHALLENGE
          ============================================================ */}
      <section className="py-10 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#003B73]">Bridging the Gap Between Skills and Demand</h2>
          </div>

          <div className="border border-[#D9E1E8] bg-white p-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 text-center text-xs font-bold">
              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <span className="text-[#003B73] block uppercase tracking-wider text-[10px] text-[#64748B]">Demand</span>
                <span className="text-[#003B73]">INDUSTRY NEEDS</span>
                <p className="text-[11px] font-normal text-[#64748B] mt-1">What employers need</p>
              </div>

              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <span className="text-[#003B73] block uppercase tracking-wider text-[10px] text-[#64748B]">Skills</span>
                <span className="text-[#003B73]">SKILLS AVAILABLE</span>
                <p className="text-[11px] font-normal text-[#64748B] mt-1">What candidates have</p>
              </div>

              <div className="p-3 border border-[#D9E1E8] bg-[#F5F7FA]">
                <span className="text-[#003B73] block uppercase tracking-wider text-[10px] text-[#64748B]">Capacity</span>
                <span className="text-[#003B73]">TRAINING CAPACITY</span>
                <p className="text-[11px] font-normal text-[#64748B] mt-1">What institutions teach</p>
              </div>

              <div className="p-3 border border-[#005A9C] bg-[#EFF6FF]">
                <span className="text-[#005A9C] block uppercase tracking-wider text-[10px]">Outcomes</span>
                <span className="text-[#003B73]">EMPLOYMENT OUTCOMES</span>
                <p className="text-[11px] font-normal text-[#005A9C] mt-1">What happens after training</p>
              </div>
            </div>

            <div className="mt-4 border-l-4 border-[#005A9C] bg-[#EFF6FF] p-3 text-xs font-bold text-[#003B73]">
              High demand does not automatically mean more training is the answer. Does training match what employers need?
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — HOW SKILLPULSE WORKS (CLICKABLE TIMELINE)
          ============================================================ */}
      <section id="how-it-works" className="py-10 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#003B73]">From Data to Decisions</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Click any stage in the timeline to explore how data becomes actionable policy.</p>
          </div>

          {/* Interactive Horizontal Timeline */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6 border border-[#D9E1E8] bg-[#F5F7FA] p-2 text-xs font-bold mb-3">
            {timelineSteps.map((step, idx) => (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveTimelineStep(idx)}
                className={`p-2.5 text-center border transition-all cursor-pointer ${
                  activeTimelineStep === idx
                    ? "border-[#005A9C] bg-[#003B73] text-white"
                    : "border-[#D9E1E8] bg-white text-[#003B73] hover:bg-[#EFF6FF]"
                }`}
              >
                <span className="block text-[10px] font-mono opacity-80 mb-0.5">{step.num}</span>
                {step.name}
              </button>
            ))}
          </div>

          {/* Active Step Single Detail Box */}
          <div className="border border-[#005A9C] bg-[#EFF6FF] p-3.5 text-xs text-[#334155]">
            <span className="font-bold text-[#003B73] block mb-1">
              Stage {timelineSteps[activeTimelineStep].num}: {timelineSteps[activeTimelineStep].title}
            </span>
            <p className="text-[11px] leading-relaxed">
              &quot;{timelineSteps[activeTimelineStep].detail}&quot;
            </p>
          </div>

          <p className="mt-3 text-xs text-[#475569]">
            SkillPulse combines labour-market, employer, training and employment evidence to identify real workforce mismatches and support actionable decisions.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — FROM DATA TO DECISION (INTERACTIVE SCENARIO TAB)
          ============================================================ */}
      <section className="py-10 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#003B73]">From Data to Decision</h2>
              <p className="text-xs text-[#64748B] mt-0.5">Toggle tabs to see how raw signals translate into diagnostic actions.</p>
            </div>
            <span className="border border-[#D9E1E8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#005A9C]">
              Illustrative Example
            </span>
          </div>

          <div className="border border-[#003B73] bg-white p-4 text-xs">
            {/* Tab Switcher */}
            <div className="flex gap-2 mb-3 border-b border-[#D9E1E8] pb-2">
              <button
                type="button"
                onClick={() => setActiveScenarioTab("data")}
                className={`px-3 py-1.5 font-bold text-xs cursor-pointer ${
                  activeScenarioTab === "data"
                    ? "bg-[#003B73] text-white"
                    : "bg-[#F5F7FA] text-[#475569] hover:bg-[#E2E8F0]"
                }`}
              >
                [What the Data Says]
              </button>
              <button
                type="button"
                onClick={() => setActiveScenarioTab("recommendation")}
                className={`px-3 py-1.5 font-bold text-xs cursor-pointer ${
                  activeScenarioTab === "recommendation"
                    ? "bg-[#005A9C] text-white"
                    : "bg-[#F5F7FA] text-[#475569] hover:bg-[#E2E8F0]"
                }`}
              >
                [What SkillPulse Recommends]
              </button>
            </div>

            {/* Active Tab Content */}
            {activeScenarioTab === "data" ? (
              <div className="space-y-1.5 p-3 bg-[#F5F7FA] border border-[#D9E1E8]">
                <strong className="text-[#003B73] block mb-1">Observed Market Data Signals:</strong>
                <p>• <strong>Labour Market Demand:</strong> High (Strong hiring frequency)</p>
                <p>• <strong>Training Capacity:</strong> High (Institute seats available)</p>
                <p>• <strong>Curriculum Alignment:</strong> Low (Module practical gap)</p>
              </div>
            ) : (
              <div className="space-y-1.5 p-3 bg-[#EFF6FF] border border-[#005A9C]">
                <strong className="text-[#003B73] block mb-1">SkillPulse Diagnostic Recommendation:</strong>
                <p className="text-sm font-bold text-[#005A9C]">UPDATE CURRICULUM</p>
                <p className="text-[#334155] text-[11px]">
                  &quot;Improve existing practical training modules rather than creating additional training seats.&quot;
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — EVIDENCE & CONFIDENCE (SIMPLIFIED PANEL)
          ============================================================ */}
      <section className="py-10 bg-white border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-[#003B73]">Evidence Before Assumptions</h2>
            <span className="border border-[#D9E1E8] bg-[#F5F7FA] px-2.5 py-1 text-[11px] font-semibold text-[#005A9C]">
              Illustrative Example
            </span>
          </div>

          <div className="border border-[#003B73] bg-[#F5F7FA] p-4 text-xs text-[#334155]">
            <div className="flex flex-wrap items-center gap-2 font-bold text-[#003B73] mb-3">
              <span>Evidence</span>
              <span>→</span>
              <span>Confidence</span>
              <span>→</span>
              <span className="text-[#005A9C]">Action</span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#D9E1E8] bg-white p-3">
              <p><strong>Recommendation:</strong> Update Curriculum</p>
              <p><strong>Confidence:</strong> Medium–High</p>
              <p><strong>Why?:</strong> Strong employer demand with insufficient curriculum coverage.</p>
              <p><strong>Limitation:</strong> Evidence may be concentrated in selected districts.</p>
            </div>
          </div>

          <p className="mt-3 text-xs text-[#475569]">
            SkillPulse surfaces evidence quality and limitations instead of hiding uncertainty. How reliable is the evidence?
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 7 — STAKEHOLDERS (INTERACTIVE TABS)
          ============================================================ */}
      <section className="py-10 bg-[#F5F7FA] border-b border-[#D9E1E8]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#003B73]">One Platform. Multiple Stakeholders.</h2>
            <p className="text-xs text-[#64748B] mt-0.5">Select a stakeholder perspective to view tailored intelligence capabilities.</p>
          </div>

          {/* Interactive Stakeholder Tabs */}
          <div className="flex flex-wrap gap-2 mb-3 border-b border-[#D9E1E8] pb-2">
            {stakeholders.map((sh, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStakeholderTab(idx)}
                className={`px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeStakeholderTab === idx
                    ? "bg-[#003B73] text-white"
                    : "bg-white text-[#475569] border border-[#D9E1E8] hover:bg-[#EFF6FF]"
                }`}
              >
                [{sh.role}]
              </button>
            ))}
          </div>

          {/* Active Stakeholder Content Box */}
          <div className="border border-[#005A9C] bg-white p-4 text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#D9E1E8]">
              <div>
                <h3 className="text-sm font-bold text-[#003B73]">
                  {stakeholders[activeStakeholderTab].role}
                </h3>
                <p className="text-[11px] font-semibold text-[#005A9C]">
                  {stakeholders[activeStakeholderTab].question}
                </p>
              </div>

              <Link
                href={stakeholders[activeStakeholderTab].href}
                className="font-bold text-[#005A9C] hover:underline text-xs"
              >
                {stakeholders[activeStakeholderTab].linkText}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {stakeholders[activeStakeholderTab].items.map((item, i) => (
                <div key={i} className="p-2 border border-[#D9E1E8] bg-[#F5F7FA] font-medium text-[#334155]">
                  • {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — MAHARASHTRA MVP + FINAL CTA
          ============================================================ */}
      <section className="py-10 bg-[#003B73] text-white">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-block bg-[#005A9C] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white mb-2">
            Pilot Scope
          </span>

          <h2 className="text-2xl font-bold tracking-tight text-white">
            Starting in Maharashtra. Built for India.
          </h2>

          {/* Simple Geographic Hierarchy Chain */}
          <div className="my-4 flex flex-wrap justify-center items-center gap-1.5 text-xs font-bold text-[#BFDBFE]">
            <span className="p-1.5 border border-[#005A9C] bg-[#002D59]">Maharashtra</span>
            <span>→</span>
            <span className="p-1.5 border border-[#005A9C] bg-[#002D59]">36 Districts</span>
            <span>→</span>
            <span className="p-1.5 border border-[#005A9C] bg-[#002D59]">Institutions</span>
            <span>→</span>
            <span className="p-1.5 border border-[#005A9C] bg-[#002D59]">Employers</span>
            <span>→</span>
            <span className="p-1.5 border border-[#005A9C] bg-[#002D59]">Skills</span>
          </div>

          <p className="mx-auto max-w-2xl text-xs text-[#BFDBFE] leading-relaxed">
            Maharashtra serves as the initial MVP and validation environment, while the architecture is designed to scale across India&apos;s diverse labour markets.
          </p>

          <hr className="my-5 border-[#005A9C] max-w-lg mx-auto" />

          <h3 className="text-base font-bold text-white mb-4">
            Make Workforce Decisions With Better Evidence
          </h3>

          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/skills"
              className="bg-[#005A9C] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-[#003B73]"
            >
              Explore SkillPulse
            </Link>
            <Link
              href="/dashboard"
              className="border border-[#BFDBFE] bg-transparent px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#002D59]"
            >
              Open Workspace Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
