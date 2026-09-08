"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";

/* ─── Animated Counter Hook ─── */
function useCountUp(target: number, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, trigger]);
  return count;
}

/* ─── Intersection Observer Hook ─── */
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── SVG Icons (inline, no external deps) ─── */
const icons = {
  briefcase: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
  bolt: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  ),
  academic: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
  chart: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  shield: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  arrowRight: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  building: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  ),
  users: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
};

/* ─── Pipeline Step Data ─── */
const pipelineSteps = [
  {
    num: "01",
    name: "Collect",
    title: "Data Collection",
    detail: "Ingest job postings, employer surveys, curriculum data, and institute training capacity records from multiple verified sources.",
    icon: icons.briefcase,
    color: "#003B73",
  },
  {
    num: "02",
    name: "Validate",
    title: "Evidence Validation",
    detail: "Check freshness, reliability, duplicates, reposted vacancies, conflicting information, and coverage limits for every data point.",
    icon: icons.shield,
    color: "#005A9C",
  },
  {
    num: "03",
    name: "Analyse",
    title: "Skill Analysis",
    detail: "Normalize job descriptions into standardized competency domains and qualification standards using NLP-driven extraction.",
    icon: icons.bolt,
    color: "#0369A1",
  },
  {
    num: "04",
    name: "Identify",
    title: "Gap Detection",
    detail: "Compare demand vs supply to distinguish between skill, curriculum, capacity, and geographic gaps across regions.",
    icon: icons.chart,
    color: "#0284C7",
  },
  {
    num: "05",
    name: "Recommend",
    title: "Policy Guidance",
    detail: "Generate explainable recommendations specifying target action, root cause, confidence score, and data limitations.",
    icon: icons.lightbulb,
    color: "#005A9C",
  },
  {
    num: "06",
    name: "Measure",
    title: "Outcome Tracking",
    detail: "Track actual hiring results and post-intervention placement sustainability to refine future intelligence models.",
    icon: icons.chart,
    color: "#003B73",
  },
];

/* ─── Stakeholder Data ─── */
const stakeholders = [
  {
    role: "Government & Policymakers",
    subtitle: "Strategic workforce planning",
    question: "Where should public skill development funds be deployed?",
    items: [
      "District-level skill gap heatmaps",
      "Emerging occupation tracking",
      "Institute capacity optimization",
      "Evidence-based priority interventions",
    ],
    href: "/dashboard",
    linkText: "Executive Dashboard",
    icon: icons.building,
    accent: "#003B73",
  },
  {
    role: "Training Institutes",
    subtitle: "Curriculum alignment & quality",
    question: "Does training match what employers need?",
    items: [
      "Curriculum module alignment scoring",
      "Course relevance health indicators",
      "Trainer upskilling requirements",
      "Equipment & lab planning insights",
    ],
    href: "/courses",
    linkText: "Explore Courses",
    icon: icons.academic,
    accent: "#005A9C",
  },
  {
    role: "Employers & Industry",
    subtitle: "Talent pipeline intelligence",
    question: "How can industry signal future skill needs?",
    items: [
      "Direct skill demand signaling",
      "Proficiency benchmark definition",
      "Curriculum feedback integration",
      "Candidate readiness assessment",
    ],
    href: "/employers",
    linkText: "Employer Intelligence",
    icon: icons.briefcase,
    accent: "#0369A1",
  },
  {
    role: "Learners & Job Seekers",
    subtitle: "Career pathway navigation",
    question: "What skills are required for target roles?",
    items: [
      "Target role skill requirements",
      "Personalized skill gap identification",
      "High-alignment accredited courses",
      "Regional career pathway mapping",
    ],
    href: "/skills",
    linkText: "Skill Intelligence",
    icon: icons.users,
    accent: "#0284C7",
  },
];

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [activeStakeholder, setActiveStakeholder] = useState(0);

  // Animated counters
  const statsRef = useInView(0.3);
  const c1 = useCountUp(36, 1500, statsRef.inView);
  const c2 = useCountUp(250, 1800, statsRef.inView);
  const c3 = useCountUp(8, 1200, statsRef.inView);
  const c4 = useCountUp(95, 2000, statsRef.inView);

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

  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">

      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-white to-[#EFF6FF]">
        {/* Subtle decorative background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#005A9C]/[0.03] blur-3xl translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#003B73]/[0.04] blur-3xl -translate-x-1/3 translate-y-1/4" />
        </div>

        {/* Top accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#003B73] via-[#005A9C] to-[#0284C7]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">

            {/* Left: Content */}
            <div className="flex flex-col gap-6 text-left">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 self-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-1.5 text-xs font-semibold text-[#005A9C] tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#005A9C] animate-pulse" />
                  WORKFORCE INTELLIGENCE PLATFORM
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A] sm:text-5xl lg:text-[3.5rem] leading-[1.1]">
                Turn Workforce Data Into{" "}
                <span className="bg-gradient-to-r from-[#003B73] to-[#0284C7] bg-clip-text text-transparent">
                  Better Decisions
                </span>
              </h1>

              {/* Description */}
              <p className="text-base leading-relaxed text-[#475569] max-w-xl sm:text-lg">
                SkillPulse connects labour-market demand, skills, training and employment outcomes to identify workforce gaps and support evidence-based policy decisions across Maharashtra.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-0 max-w-lg">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    {icons.search}
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills, roles, courses..."
                    className="w-full rounded-l-xl border border-[#D1D5DB] bg-white py-3.5 pl-11 pr-4 text-sm text-[#1F2937] placeholder-[#94A3B8] shadow-sm transition-all focus:border-[#005A9C] focus:ring-2 focus:ring-[#005A9C]/20 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-r-xl bg-[#005A9C] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#003B73] hover:shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/skills"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#003B73] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#002D59] hover:shadow-lg active:scale-[0.98]"
                >
                  Explore Skill Intelligence
                  {icons.arrowRight}
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[#D1D5DB] bg-white px-6 py-3 text-sm font-semibold text-[#003B73] transition-all hover:border-[#005A9C] hover:bg-[#EFF6FF]"
                >
                  How It Works
                </a>

                <Show when="signed-out">
                  <SignInButton>
                    <button className="inline-flex items-center gap-2 rounded-xl border-2 border-[#E2E8F0] bg-white px-6 py-3 text-sm font-semibold text-[#475569] transition-all hover:border-[#005A9C] hover:text-[#003B73] cursor-pointer">
                      Sign In
                    </button>
                  </SignInButton>
                </Show>

                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#005A9C] px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#003B73] hover:shadow-lg"
                  >
                    Open Dashboard
                  </Link>
                </Show>
              </div>
            </div>

            {/* Right: Intelligence Flow Visualization */}
            <div className="relative">
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#003B73] flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0F172A]">Intelligence Flow</h3>
                      <p className="text-[11px] text-[#64748B]">Click any node to explore</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[10px] font-bold text-[#15803D]">
                    LIVE
                  </span>
                </div>

                {/* Interactive Nodes */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { key: "market", label: "Labour Market", sub: "Demand signals", icon: icons.briefcase, color: "#003B73" },
                    { key: "skills", label: "Skills Taxonomy", sub: "Competency mapping", icon: icons.bolt, color: "#005A9C" },
                    { key: "training", label: "Training & Curriculum", sub: "Institute coverage", icon: icons.academic, color: "#0369A1" },
                    { key: "outcomes", label: "Employment Outcomes", sub: "Placement tracking", icon: icons.chart, color: "#0284C7" },
                  ].map((node, idx) => (
                    <button
                      key={node.key}
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      className={`group relative flex flex-col gap-1.5 rounded-xl border-2 p-4 text-left transition-all duration-200 cursor-pointer ${
                        activeStep === idx
                          ? "border-[#005A9C] bg-[#EFF6FF] shadow-md"
                          : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#BFDBFE] hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        activeStep === idx ? "bg-[#005A9C] text-white" : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#E2E8F0]"
                      }`}>
                        {node.icon}
                      </div>
                      <span className="text-xs font-bold text-[#0F172A]">{node.label}</span>
                      <span className="text-[10px] text-[#64748B]">{node.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Connection Flow Arrows */}
                <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-[#94A3B8] mb-4">
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5">Collect</span>
                  <span>→</span>
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5">Validate</span>
                  <span>→</span>
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5">Analyse</span>
                  <span>→</span>
                  <span className="rounded bg-[#EFF6FF] px-2 py-0.5 text-[#005A9C]">Act</span>
                </div>

                {/* Selected Node Detail */}
                <div className="rounded-xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#F0F9FF] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#005A9C] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">{String(activeStep + 1).padStart(2, "0")}</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#003B73]">
                        {["Labour-Market Demand", "Skills & Competency Mapping", "Training & Curriculum Coverage", "Employment Outcomes"][activeStep]}
                      </h4>
                      <p className="text-xs text-[#475569] mt-1 leading-relaxed">
                        {[
                          "Understand employer demand, job vacancy frequency, hiring signals, and labour-market trends across regional sectors.",
                          "Map required skills, proficiency benchmarks, and qualification levels against standardized national competency frameworks.",
                          "Compare industry requirements with course module coverage, trainer readiness, and institute seat capacities.",
                          "Track candidate placement verification, post-training employment sustainability, and policy outcome signals.",
                        ][activeStep]}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — QUICK ACCESS PORTAL
          ═══════════════════════════════════════════════════════ */}
      <section className="border-y border-[#E2E8F0] bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: "01", title: "Skill Intelligence", desc: "Explore skills required for emerging roles across sectors.", href: "/skills", color: "#003B73" },
              { num: "02", title: "Demand & Supply", desc: "Understand workforce shortages, mismatches, and regional gaps.", href: "/gaps", color: "#005A9C" },
              { num: "03", title: "Curriculum Analysis", desc: "Compare training programs with current industry requirements.", href: "/curricula", color: "#0369A1" },
              { num: "04", title: "Recommendations", desc: "Evidence-based actionable guidance for decision-makers.", href: "/recommendations", color: "#0284C7" },
            ].map((item) => (
              <Link
                key={item.num}
                href={item.href}
                className="group relative flex items-start gap-4 rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] p-5 transition-all duration-200 hover:border-[#BFDBFE] hover:bg-white hover:shadow-md"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white transition-transform group-hover:scale-110"
                  style={{ backgroundColor: item.color }}
                >
                  {item.num}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-[#005A9C] transition-colors">{item.title}</h3>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#CBD5E1] opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
                  {icons.arrowRight}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — THE CHALLENGE
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E] mb-4">
              THE CHALLENGE
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              Bridging the Gap Between{" "}
              <span className="text-[#005A9C]">Skills and Demand</span>
            </h2>
            <p className="mt-4 text-base text-[#64748B] leading-relaxed">
              High demand does not automatically mean more training is the answer. Understanding <em>why</em> a gap exists determines the right intervention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Industry Demand", sub: "What employers need", icon: icons.briefcase, bg: "from-[#003B73] to-[#005A9C]" },
              { label: "Skills Available", sub: "What candidates have", icon: icons.bolt, bg: "from-[#005A9C] to-[#0369A1]" },
              { label: "Training Capacity", sub: "What institutions teach", icon: icons.academic, bg: "from-[#0369A1] to-[#0284C7]" },
              { label: "Employment Outcomes", sub: "What happens after training", icon: icons.chart, bg: "from-[#0284C7] to-[#0EA5E9]" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <div className={`mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br ${item.bg} flex items-center justify-center text-white mb-4 shadow-md transition-transform group-hover:scale-110`}>
                  {item.icon}
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{item.label}</h3>
                <p className="text-xs text-[#64748B] mt-1">{item.sub}</p>

                {idx < 3 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border-2 border-[#E2E8F0] items-center justify-center text-[#94A3B8]">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Insight callout */}
          <div className="mt-10 mx-auto max-w-3xl rounded-2xl border-l-4 border-[#005A9C] bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                {icons.lightbulb}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#003B73]">Key Insight</h4>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                  Training more people without matching what employers need leads to high certification rates but low employment outcomes. SkillPulse identifies <strong>why</strong> gaps exist — skill, curriculum, capacity, or geographic — so the right action is taken.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS (PIPELINE)
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#005A9C] mb-4">
              INTELLIGENCE PIPELINE
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              From Raw Data to{" "}
              <span className="text-[#005A9C]">Actionable Policy</span>
            </h2>
            <p className="mt-4 text-base text-[#64748B] leading-relaxed">
              Six rigorous stages transform fragmented workforce signals into evidence-based decisions.
            </p>
          </div>

          {/* Pipeline Steps */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 mb-8">
            {pipelineSteps.map((step, idx) => (
              <button
                key={step.num}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 cursor-pointer ${
                  activeStep === idx
                    ? "border-[#005A9C] bg-[#EFF6FF] shadow-md"
                    : "border-[#E2E8F0] bg-[#FAFBFC] hover:border-[#BFDBFE] hover:bg-white hover:shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  activeStep === idx
                    ? "bg-[#005A9C] text-white shadow-md"
                    : "bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#E2E8F0]"
                }`}>
                  <span className="text-xs font-bold">{step.num}</span>
                </div>
                <span className={`text-xs font-bold transition-colors ${
                  activeStep === idx ? "text-[#003B73]" : "text-[#475569]"
                }`}>
                  {step.name}
                </span>
              </button>
            ))}
          </div>

          {/* Active Step Detail */}
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#BFDBFE] bg-gradient-to-r from-[#EFF6FF] to-[#F0F9FF] p-8 shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#005A9C] flex items-center justify-center shrink-0 shadow-md">
                <span className="text-white text-sm font-bold">{pipelineSteps[activeStep].num}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#003B73]">
                  Stage {pipelineSteps[activeStep].num}: {pipelineSteps[activeStep].title}
                </h3>
                <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                  {pipelineSteps[activeStep].detail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — FROM DATA TO DECISION (SCENARIO)
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-start">
            {/* Left: Data Signal */}
            <div>
              <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E] mb-4">
                ILLUSTRATIVE EXAMPLE
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#0F172A] sm:text-3xl mb-6">
                From Data to{" "}
                <span className="text-[#005A9C]">Decision</span>
              </h2>

              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">What the Data Shows</h3>
                <div className="space-y-4">
                  {[
                    { label: "Labour Market Demand", value: "High", detail: "Strong hiring frequency in IT sector", color: "#15803D", bg: "#DCFCE7" },
                    { label: "Training Capacity", value: "High", detail: "Institute seats available and underutilized", color: "#0369A1", bg: "#E0F2FE" },
                    { label: "Curriculum Alignment", value: "Low", detail: "Practical module gap identified", color: "#B91C1C", bg: "#FEE2E2" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 rounded-xl border border-[#E2E8F0] p-4">
                      <span
                        className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: item.bg, color: item.color }}
                      >
                        {item.value}
                      </span>
                      <div>
                        <span className="text-sm font-semibold text-[#0F172A]">{item.label}</span>
                        <p className="text-xs text-[#64748B] mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Recommendation */}
            <div className="lg:pt-14">
              <div className="rounded-2xl border-2 border-[#005A9C] bg-white p-6 shadow-lg relative overflow-hidden">
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#005A9C]/5 rounded-bl-[4rem]" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#005A9C] flex items-center justify-center">
                      {icons.lightbulb}
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#005A9C]">
                      SkillPulse Recommends
                    </h3>
                  </div>

                  <div className="rounded-xl bg-[#EFF6FF] p-5 mb-4">
                    <span className="inline-block rounded-lg bg-[#005A9C] px-3 py-1.5 text-sm font-bold text-white mb-3">
                      UPDATE CURRICULUM
                    </span>
                    <p className="text-sm text-[#334155] leading-relaxed">
                      Improve existing practical training modules rather than creating additional training seats. Focus curriculum revision on employer-identified skill gaps.
                    </p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#15803D]">{icons.checkCircle}</span>
                      <span className="text-[#334155]"><strong>Confidence:</strong> Medium–High</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#005A9C]">{icons.checkCircle}</span>
                      <span className="text-[#334155]"><strong>Root Cause:</strong> Curriculum-employer mismatch</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#B45309]">{icons.checkCircle}</span>
                      <span className="text-[#334155]"><strong>Limitation:</strong> Evidence concentrated in select districts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — EVIDENCE & CONFIDENCE
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#15803D] mb-4">
              TRANSPARENCY
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              Evidence Before{" "}
              <span className="text-[#005A9C]">Assumptions</span>
            </h2>
            <p className="mt-4 text-base text-[#64748B] leading-relaxed">
              SkillPulse surfaces evidence quality and limitations instead of hiding uncertainty. Every recommendation carries a confidence index.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: "Multi-Source Validation",
                desc: "Cross-reference employer surveys, job portals, government databases, and training records.",
                icon: icons.shield,
                gradient: "from-[#003B73] to-[#005A9C]",
              },
              {
                title: "Confidence Scoring",
                desc: "Every insight carries a 0–100 confidence index based on data freshness, source reliability, and coverage.",
                icon: icons.chart,
                gradient: "from-[#005A9C] to-[#0369A1]",
              },
              {
                title: "Limitation Disclosure",
                desc: "Clearly states what the data cannot tell you — unknown status ≠ unemployed, missing data ≠ zero demand.",
                icon: icons.lightbulb,
                gradient: "from-[#0369A1] to-[#0284C7]",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-8 transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white mb-5 shadow-md transition-transform group-hover:scale-110`}>
                  {item.icon}
                </div>
                <h3 className="text-base font-bold text-[#0F172A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7 — STAKEHOLDERS
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#005A9C] mb-4">
              STAKEHOLDERS
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              One Platform.{" "}
              <span className="text-[#005A9C]">Multiple Perspectives.</span>
            </h2>
            <p className="mt-4 text-base text-[#64748B] leading-relaxed">
              Tailored intelligence for every stakeholder in the workforce ecosystem.
            </p>
          </div>

          {/* Stakeholder Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {stakeholders.map((sh, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStakeholder(idx)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  activeStakeholder === idx
                    ? "bg-[#003B73] text-white shadow-md"
                    : "bg-white text-[#475569] border border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#005A9C]"
                }`}
              >
                {sh.role}
              </button>
            ))}
          </div>

          {/* Active Stakeholder Card */}
          <div className="mx-auto max-w-4xl rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-lg transition-all">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ backgroundColor: stakeholders[activeStakeholder].accent }}
                >
                  {stakeholders[activeStakeholder].icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0F172A]">
                    {stakeholders[activeStakeholder].role}
                  </h3>
                  <p className="text-sm text-[#005A9C] font-medium mt-0.5">
                    {stakeholders[activeStakeholder].subtitle}
                  </p>
                  <p className="text-sm text-[#64748B] mt-1 italic">
                    &ldquo;{stakeholders[activeStakeholder].question}&rdquo;
                  </p>
                </div>
              </div>
              <Link
                href={stakeholders[activeStakeholder].href}
                className="inline-flex items-center gap-2 rounded-xl bg-[#005A9C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#003B73] hover:shadow-md shrink-0"
              >
                {stakeholders[activeStakeholder].linkText}
                {icons.arrowRight}
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stakeholders[activeStakeholder].items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] p-4 transition-all hover:bg-white hover:shadow-sm"
                >
                  <span className="text-[#005A9C]">{icons.checkCircle}</span>
                  <span className="text-sm font-medium text-[#334155]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8 — SCOPE & STATS
          ═══════════════════════════════════════════════════════ */}
      <section ref={statsRef.ref} className="py-16 lg:py-20 bg-white border-t border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E] mb-4">
              PILOT SCOPE
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl">
              Starting in{" "}
              <span className="text-[#005A9C]">Maharashtra</span>.
              Built for India.
            </h2>
            <p className="mt-4 text-base text-[#64748B] leading-relaxed">
              Maharashtra serves as the initial MVP and validation environment, while the architecture is designed to scale across India&apos;s diverse labour markets.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 mb-12">
            {[
              { value: c1, suffix: "", label: "Districts Covered", icon: icons.globe },
              { value: c2, suffix: "+", label: "Skill Domains Tracked", icon: icons.bolt },
              { value: c3, suffix: "", label: "Data Source Types", icon: icons.shield },
              { value: c4, suffix: "%", label: "Evidence-Based Signals", icon: icons.chart },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="group rounded-2xl border border-[#E2E8F0] bg-[#FAFBFC] p-6 text-center transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1"
              >
                <div className="mx-auto w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#005A9C] mb-3 transition-transform group-hover:scale-110">
                  {stat.icon}
                </div>
                <span className="block text-3xl font-extrabold text-[#003B73] tabular-nums">
                  {stat.value}{stat.suffix}
                </span>
                <span className="block text-xs font-medium text-[#64748B] mt-1">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Geographic Flow */}
          <div className="flex flex-wrap justify-center items-center gap-3 text-sm font-semibold text-[#475569]">
            {["Maharashtra", "36 Districts", "Training Institutes", "Employers", "Skills & Outcomes"].map((item, idx, arr) => (
              <React.Fragment key={item}>
                <span className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 shadow-sm transition-all hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#005A9C]">
                  {item}
                </span>
                {idx < arr.length - 1 && (
                  <span className="text-[#CBD5E1]">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 9 — FINAL CTA
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#003B73] via-[#005A9C] to-[#0369A1] py-20">
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Make Workforce Decisions With Better Evidence
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-[#BFDBFE] leading-relaxed">
            Join the intelligence-driven approach to workforce development. Explore skill gaps, validate evidence, and take informed action.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#003B73] shadow-lg transition-all hover:bg-[#EFF6FF] hover:shadow-xl active:scale-[0.98]"
            >
              Explore SkillPulse
              {icons.arrowRight}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/20 hover:border-white/50"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
