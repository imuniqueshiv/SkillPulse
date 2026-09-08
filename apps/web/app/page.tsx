"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════
   Utility Hooks
   ═══════════════════════════════════════════════════════ */

function useInView(threshold = 0.15) {
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

/* ═══════════════════════════════════════════════════════
   Inline SVG Icons (no external dependencies)
   ═══════════════════════════════════════════════════════ */

function ArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════ */

const timelineSteps = [
  { num: "01", name: "Collect", title: "Data Collection", detail: "Ingest job postings, employer surveys, curriculum data, and institute training capacity records from multiple verified sources." },
  { num: "02", name: "Validate", title: "Evidence Validation", detail: "Check freshness, reliability, duplicates, reposted vacancies, conflicting information, and coverage limits for every data point." },
  { num: "03", name: "Analyse", title: "Skill Analysis", detail: "Normalize job descriptions into standardized competency domains and qualification standards using NLP-driven extraction." },
  { num: "04", name: "Identify", title: "Gap Detection", detail: "Compare demand vs supply to distinguish between skill, curriculum, capacity, and geographic gaps across regions." },
  { num: "05", name: "Recommend", title: "Policy Guidance", detail: "Generate explainable recommendations specifying target action, root cause, confidence score, and data limitations." },
  { num: "06", name: "Measure", title: "Outcome Tracking", detail: "Track actual hiring results and post-intervention placement sustainability to refine future intelligence models." },
];

const stakeholders = [
  {
    role: "Government & Policymakers",
    subtitle: "Strategic workforce planning & resource allocation",
    question: "Where should public skill development funds be deployed?",
    items: ["District-level skill gap heatmaps", "Emerging occupation tracking", "Institute capacity optimization", "Evidence-based priority interventions"],
    href: "/dashboard",
    linkText: "Executive Dashboard",
    image: "/assets/employer-meeting.png",
  },
  {
    role: "Training Institutes",
    subtitle: "Curriculum alignment & training quality",
    question: "Does training match what employers actually need?",
    items: ["Curriculum module alignment scoring", "Course relevance health indicators", "Trainer upskilling requirements", "Equipment & lab planning insights"],
    href: "/courses",
    linkText: "Explore Courses",
    image: "/assets/skills-training.png",
  },
  {
    role: "Employers & Industry",
    subtitle: "Talent pipeline intelligence & skill signaling",
    question: "How can industry signal future skill requirements?",
    items: ["Direct skill demand signaling", "Proficiency benchmark definition", "Curriculum feedback integration", "Candidate readiness assessment"],
    href: "/employers",
    linkText: "Employer Intelligence",
    image: "/assets/employer-meeting.png",
  },
  {
    role: "Learners & Job Seekers",
    subtitle: "Career pathway navigation & skill development",
    question: "What skills are required for target career roles?",
    items: ["Target role skill requirements", "Personalized skill gap identification", "High-alignment accredited courses", "Regional career pathway mapping"],
    href: "/skills",
    linkText: "Skill Intelligence",
    image: "/assets/skills-training.png",
  },
];

const insightTabs = [
  {
    label: "What Data Shows",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-[#DCFCE7] px-3 py-1.5 text-xs font-bold text-[#15803D]">HIGH</span>
          <div><span className="text-sm font-semibold text-[#0F172A]">Labour Market Demand</span><p className="text-xs text-[#64748B]">Strong hiring frequency in IT sector across multiple districts</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-[#E0F2FE] px-3 py-1.5 text-xs font-bold text-[#0369A1]">HIGH</span>
          <div><span className="text-sm font-semibold text-[#0F172A]">Training Capacity</span><p className="text-xs text-[#64748B]">Institute seats available and partially underutilized</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-[#FEE2E2] px-3 py-1.5 text-xs font-bold text-[#B91C1C]">LOW</span>
          <div><span className="text-sm font-semibold text-[#0F172A]">Curriculum Alignment</span><p className="text-xs text-[#64748B]">Practical module gap identified in current syllabus</p></div>
        </div>
      </div>
    ),
  },
  {
    label: "What It Means",
    content: (
      <div className="space-y-3">
        <p className="text-sm text-[#334155] leading-relaxed">
          Training infrastructure exists and capacity is available, but <strong>course content may not adequately cover the practical skills employers require</strong>.
        </p>
        <p className="text-sm text-[#334155] leading-relaxed">
          The gap is not a <em>capacity</em> problem — it is a <em>curriculum alignment</em> problem. Adding more training seats without updating content will not close this gap.
        </p>
        <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3 text-xs text-[#9A3412]">
          <strong>Root Cause:</strong> Curriculum-employer skill mismatch in practical training modules
        </div>
      </div>
    ),
  },
  {
    label: "What To Do",
    content: (
      <div className="space-y-4">
        <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-5">
          <span className="inline-block rounded-md bg-[#005A9C] px-3 py-1.5 text-sm font-bold text-white mb-3">UPDATE CURRICULUM</span>
          <p className="text-sm text-[#334155] leading-relaxed">
            Improve existing practical training modules rather than creating additional seats. Focus curriculum revision on employer-identified skill gaps in the IT sector.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#003B73]">Confidence</strong><p className="text-[#64748B] mt-0.5">Medium–High</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#003B73]">Coverage</strong><p className="text-[#64748B] mt-0.5">3 districts verified</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#003B73]">Limitation</strong><p className="text-[#64748B] mt-0.5">Regional concentration</p></div>
        </div>
      </div>
    ),
  },
];

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [activeStakeholder, setActiveStakeholder] = useState(0);
  const [activeInsight, setActiveInsight] = useState(0);

  const heroRef = useInView(0.1);
  const featureRef = useInView(0.15);
  const timelineRef = useInView(0.15);
  const dataFlowRef = useInView(0.15);
  const insightRef = useInView(0.15);
  const stakeholderRef = useInView(0.15);
  const maharashtraRef = useInView(0.15);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes("course") || q.includes("capacity") || q.includes("training")) router.push("/courses");
    else if (q.includes("gap") || q.includes("shortage") || q.includes("supply")) router.push("/gaps");
    else if (q.includes("job") || q.includes("market") || q.includes("demand")) router.push("/jobs");
    else router.push("/skills");
  };

  return (
    <div className="flex flex-1 flex-col bg-white font-sans text-[#1F2937] antialiased">

      {/* ═══════════════════════════════════════════════════════
          S1 — HERO
          ═══════════════════════════════════════════════════════ */}
      <section ref={heroRef.ref} className="relative overflow-hidden bg-white">
        <div className="h-[3px] w-full bg-gradient-to-r from-[#003B73] via-[#005A9C] to-[#E9783B]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">

            {/* Left */}
            <div className={`flex flex-col gap-5 transition-all duration-700 ${heroRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              <span className="inline-flex items-center gap-2 self-start text-[11px] font-bold uppercase tracking-[0.15em] text-[#005A9C]">
                <span className="h-px w-8 bg-[#005A9C]" />
                Skill &amp; Workforce Intelligence
              </span>

              <h1 className="text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-[#0B1F33] sm:text-5xl lg:text-[3.25rem]">
                Turn Workforce Data Into{" "}
                <span className="text-[#005A9C]">Better Decisions</span>
              </h1>

              <p className="max-w-lg text-base leading-relaxed text-[#475569] lg:text-lg">
                SkillPulse connects labour-market demand, skills, training and employment outcomes to identify workforce gaps and support evidence-based decisions.
              </p>

              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="flex max-w-md">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><SearchIcon /></span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search skills, roles, courses..."
                    className="w-full rounded-l-lg border border-[#D9E1E8] bg-[#F5F7FA] py-3 pl-10 pr-4 text-sm text-[#1F2937] placeholder-[#94A3B8] transition-colors focus:border-[#005A9C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005A9C]/10"
                  />
                </div>
                <button type="submit" className="rounded-r-lg bg-[#005A9C] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#003B73] cursor-pointer">
                  Search
                </button>
              </form>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link href="/skills" className="inline-flex items-center gap-2 rounded-lg bg-[#003B73] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0B1F33] hover:shadow-md">
                  Explore Skill Intelligence <ArrowRight />
                </Link>
                <a href="#feature-section" className="inline-flex items-center gap-2 rounded-lg border border-[#D9E1E8] bg-white px-6 py-3 text-sm font-semibold text-[#003B73] transition-all hover:border-[#005A9C] hover:bg-[#EFF6FF]">
                  View Workforce Insights
                </a>
                <Show when="signed-out">
                  <SignInButton>
                    <button className="rounded-lg border border-[#D9E1E8] px-5 py-3 text-sm font-semibold text-[#475569] transition-all hover:border-[#005A9C] hover:text-[#003B73] cursor-pointer">Sign In</button>
                  </SignInButton>
                </Show>
                <Show when="signed-in">
                  <Link href="/dashboard" className="rounded-lg bg-[#005A9C] px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-[#003B73]">Open Dashboard</Link>
                </Show>
              </div>
            </div>

            {/* Right — Editorial Image */}
            <div className={`relative transition-all duration-700 delay-200 ${heroRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                <Image src="/assets/hero-workforce.png" alt="Indian workforce training in modern industrial facility" fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33]/70 via-transparent to-transparent" />
                {/* Floating info panel */}
                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-white/95 backdrop-blur-sm p-4 shadow-lg border border-white/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="h-2 w-2 rounded-full bg-[#005A9C]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#005A9C]">SkillPulse Intelligence</span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#475569]">
                    <span className="font-semibold text-[#003B73]">Demand</span>
                    <span className="text-[#D9E1E8]">·</span>
                    <span className="font-semibold text-[#003B73]">Skills</span>
                    <span className="text-[#D9E1E8]">·</span>
                    <span className="font-semibold text-[#003B73]">Training</span>
                    <span className="text-[#D9E1E8]">·</span>
                    <span className="font-semibold text-[#003B73]">Outcomes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S2 — AT A GLANCE
          ═══════════════════════════════════════════════════════ */}
      <section className="border-y border-[#E2E8F0] bg-[#F5F7FA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs">
            <span className="font-bold uppercase tracking-[0.15em] text-[#003B73]">SkillPulse at a Glance</span>
            <span className="hidden sm:block h-4 w-px bg-[#D9E1E8]" />
            {["Maharashtra MVP", "Evidence-Driven", "Multi-Source Intelligence", "Confidence-Aware", "Decision Support"].map((item, i) => (
              <React.Fragment key={item}>
                <span className="text-[#64748B] font-medium">{item}</span>
                {i < 4 && <span className="hidden sm:block h-4 w-px bg-[#D9E1E8]" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S3 — WHERE SKILLS MEET DEMAND (Feature)
          ═══════════════════════════════════════════════════════ */}
      <section id="feature-section" ref={featureRef.ref} className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">

            {/* Image side */}
            <div className={`relative transition-all duration-700 ${featureRef.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
              <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
                <Image src="/assets/skills-training.png" alt="Indian students learning technical skills in a modern classroom" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#003B73]/30 via-transparent to-transparent" />
              </div>
              {/* Floating accent card */}
              <div className="absolute -bottom-4 -right-4 sm:bottom-6 sm:-right-6 rounded-xl bg-[#003B73] p-4 text-white shadow-xl max-w-[200px]">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Key Principle</span>
                <p className="text-sm font-semibold mt-1 leading-snug">Identify the gap.<br />Understand the cause.<br />Recommend action.</p>
              </div>
            </div>

            {/* Content side */}
            <div className={`flex flex-col gap-6 transition-all duration-700 delay-200 ${featureRef.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
              <span className="inline-flex items-center gap-2 self-start text-[11px] font-bold uppercase tracking-[0.15em] text-[#E9783B]">
                <span className="h-px w-6 bg-[#E9783B]" />
                Featured Intelligence
              </span>

              <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl leading-[1.15]">
                Where Skills Meet{" "}
                <span className="text-[#005A9C]">Demand</span>
              </h2>

              <p className="text-base text-[#475569] leading-relaxed">
                SkillPulse maps the complete workforce intelligence chain — from what employers need to whether training produces employable graduates.
              </p>

              {/* Vertical chain */}
              <div className="space-y-0">
                {[
                  { label: "Industry Demand", desc: "What employers need", color: "#003B73" },
                  { label: "Required Skills", desc: "What candidates must learn", color: "#005A9C" },
                  { label: "Training Supply", desc: "What institutions teach", color: "#0369A1" },
                  { label: "Employment Outcomes", desc: "What happens after training", color: "#E9783B" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full border-2 transition-colors group-hover:scale-125" style={{ borderColor: item.color, backgroundColor: idx === 3 ? item.color : "transparent" }} />
                      {idx < 3 && <div className="w-px h-8 bg-[#D9E1E8]" />}
                    </div>
                    <div className="pb-2">
                      <span className="text-sm font-bold" style={{ color: item.color }}>{item.label}</span>
                      <p className="text-xs text-[#64748B]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/gaps" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#005A9C] hover:text-[#003B73] transition-colors">
                Explore Demand vs Supply <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S4 — FROM EVIDENCE TO ACTION (Timeline)
          ═══════════════════════════════════════════════════════ */}
      <section id="how-it-works" ref={timelineRef.ref} className="py-16 lg:py-24 bg-[#F5F7FA]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${timelineRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="inline-flex items-center gap-2 justify-center text-[11px] font-bold uppercase tracking-[0.15em] text-[#005A9C] mb-4">
              <span className="h-px w-6 bg-[#005A9C]" />
              Intelligence Pipeline
              <span className="h-px w-6 bg-[#005A9C]" />
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl">
              From Evidence to <span className="text-[#005A9C]">Action</span>
            </h2>
            <p className="mt-3 text-base text-[#64748B]">Six rigorous stages transform fragmented workforce signals into evidence-based decisions.</p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Horizontal connector line */}
            <div className="hidden lg:block absolute top-[22px] left-[8.33%] right-[8.33%] h-px bg-[#D9E1E8]" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-0 mb-8">
              {timelineSteps.map((step, idx) => (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className="group flex flex-col items-center gap-2 cursor-pointer relative"
                >
                  <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    activeStep === idx
                      ? "bg-[#005A9C] text-white shadow-lg shadow-[#005A9C]/25 scale-110"
                      : "bg-white text-[#64748B] border-2 border-[#D9E1E8] group-hover:border-[#005A9C] group-hover:text-[#005A9C]"
                  }`}>
                    {step.num}
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${activeStep === idx ? "text-[#003B73]" : "text-[#64748B]"}`}>
                    {step.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Active detail */}
            <div className="mx-auto max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-all">
              <div className="flex items-start gap-4">
                <span className="shrink-0 w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-sm font-bold text-[#005A9C]">
                  {timelineSteps[activeStep].num}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#003B73]">{timelineSteps[activeStep].title}</h3>
                  <p className="text-sm text-[#475569] mt-1 leading-relaxed">{timelineSteps[activeStep].detail}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S5 — DATA → INTELLIGENCE → ACTION (Infographic)
          ═══════════════════════════════════════════════════════ */}
      <section ref={dataFlowRef.ref} className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-2xl mx-auto mb-14 transition-all duration-700 ${dataFlowRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl">
              Understanding the{" "}
              <span className="text-[#005A9C]">Workforce Gap</span>
            </h2>
            <p className="mt-3 text-base text-[#64748B]">A high-demand occupation does not automatically mean more training seats are required.</p>
          </div>

          {/* Three-column infographic */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm transition-all duration-700 ${dataFlowRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            {/* DATA */}
            <div className="bg-[#F5F7FA] p-8 border-b lg:border-b-0 lg:border-r border-[#E2E8F0]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#005A9C]">Data Sources</span>
              <h3 className="text-lg font-bold text-[#0B1F33] mt-2 mb-4">Collect</h3>
              <div className="space-y-2">
                {["Labour Market", "Employer Surveys", "Training Records", "Curriculum Data", "Outcome Reports"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#475569]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#005A9C]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* INTELLIGENCE */}
            <div className="bg-[#EFF6FF] p-8 border-b lg:border-b-0 lg:border-r border-[#BFDBFE]">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#003B73]">Intelligence Engine</span>
              <h3 className="text-lg font-bold text-[#0B1F33] mt-2 mb-4">Analyse</h3>
              <div className="space-y-2">
                {["Skill Mapping", "Demand vs Supply", "Gap Classification", "Evidence Confidence", "Root Cause Analysis"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-[#334155]">
                    <CheckIcon className="w-3.5 h-3.5 text-[#005A9C]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* ACTION */}
            <div className="bg-[#003B73] p-8 text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#BFDBFE]">Decision Support</span>
              <h3 className="text-lg font-bold mt-2 mb-4">Act</h3>
              <div className="grid grid-cols-2 gap-2">
                {["Update", "Expand", "Reduce", "Pilot", "Train", "Monitor"].map((item) => (
                  <div key={item} className="rounded-md border border-[#005A9C] bg-[#005A9C]/30 px-3 py-2 text-xs font-semibold text-center">
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#93C5FD] mt-4 leading-relaxed">Each recommendation includes confidence score, evidence sources, and known limitations.</p>
            </div>
          </div>

          {/* Gap types strip */}
          <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] p-5">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] block mb-3">Gap types SkillPulse identifies</span>
            <div className="flex flex-wrap gap-2">
              {["Skill Mismatch", "Curriculum Gap", "Capacity Limitation", "Trainer Shortage", "Geographic Mismatch", "Insufficient Evidence"].map((gap) => (
                <span key={gap} className="rounded-full border border-[#D9E1E8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#005A9C] hover:text-[#005A9C]">
                  {gap}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S6 — INTERACTIVE INSIGHT
          ═══════════════════════════════════════════════════════ */}
      <section ref={insightRef.ref} className="py-16 lg:py-24 bg-[#F5F7FA]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className={`mb-10 transition-all duration-700 ${insightRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#E9783B] mb-3">
                  <span className="h-px w-6 bg-[#E9783B]" />
                  Interactive Example
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33]">
                  See What the Evidence <span className="text-[#005A9C]">Means</span>
                </h2>
              </div>
              <span className="rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9A3412] shrink-0">
                Illustrative Example
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="flex border-b border-[#E2E8F0]">
              {insightTabs.map((tab, idx) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveInsight(idx)}
                  className={`flex-1 px-4 py-3.5 text-sm font-semibold transition-all cursor-pointer ${
                    activeInsight === idx
                      ? "bg-[#003B73] text-white"
                      : "bg-[#F5F7FA] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#005A9C]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-6 sm:p-8">
              {insightTabs[activeInsight].content}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S7 — STAKEHOLDERS
          ═══════════════════════════════════════════════════════ */}
      <section ref={stakeholderRef.ref} className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${stakeholderRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl">
              One Platform.{" "}
              <span className="text-[#005A9C]">Multiple Stakeholders.</span>
            </h2>
            <p className="mt-3 text-base text-[#64748B]">Tailored intelligence for every participant in the workforce ecosystem.</p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {stakeholders.map((sh, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveStakeholder(idx)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all cursor-pointer ${
                  activeStakeholder === idx
                    ? "bg-[#003B73] text-white shadow-md"
                    : "bg-[#F5F7FA] text-[#475569] border border-[#E2E8F0] hover:border-[#005A9C] hover:text-[#005A9C]"
                }`}
              >
                {sh.role}
              </button>
            ))}
          </div>

          {/* Active content */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Image */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg aspect-[4/3] relative">
              <Image src={stakeholders[activeStakeholder].image} alt={stakeholders[activeStakeholder].role} fill className="object-cover transition-all duration-500" sizes="(max-width: 768px) 100vw, 40vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1F33]/60 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <span className="rounded-md bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-[#003B73]">
                  {stakeholders[activeStakeholder].role}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <p className="text-sm font-medium text-[#64748B] mb-1">{stakeholders[activeStakeholder].subtitle}</p>
              <h3 className="text-xl font-bold text-[#0B1F33] mb-2">{stakeholders[activeStakeholder].role}</h3>
              <p className="text-base text-[#475569] italic mb-6">&ldquo;{stakeholders[activeStakeholder].question}&rdquo;</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {stakeholders[activeStakeholder].items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] p-3.5 transition-colors hover:bg-white hover:border-[#BFDBFE]">
                    <CheckIcon className="w-4 h-4 text-[#005A9C] shrink-0 mt-0.5" />
                    <span className="text-sm text-[#334155]">{item}</span>
                  </div>
                ))}
              </div>

              <Link href={stakeholders[activeStakeholder].href} className="inline-flex items-center gap-2 rounded-lg bg-[#005A9C] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#003B73]">
                {stakeholders[activeStakeholder].linkText} <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S8 — EVIDENCE & TRUST
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16 lg:py-20 bg-[#F5F7FA] border-y border-[#E2E8F0]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33]">
              Evidence Before <span className="text-[#005A9C]">Assumptions</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Source", desc: "Multi-platform verified" },
              { label: "Freshness", desc: "Temporal decay scoring" },
              { label: "Validation", desc: "Cross-reference checks" },
              { label: "Coverage", desc: "Geographic completeness" },
              { label: "Confidence", desc: "0–100 composite index" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
                <span className="text-sm font-bold text-[#003B73]">{item.label}</span>
                <p className="text-[11px] text-[#64748B] mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-5 text-center">
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm">
              <span className="font-semibold text-[#003B73]">Missing data ≠ zero demand</span>
              <span className="text-[#D9E1E8]">·</span>
              <span className="font-semibold text-[#003B73]">Unknown employment status ≠ unemployed</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S9 — MAHARASHTRA MVP
          ═══════════════════════════════════════════════════════ */}
      <section ref={maharashtraRef.ref} className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Image */}
            <div className={`relative rounded-2xl overflow-hidden shadow-xl aspect-[16/10] transition-all duration-700 ${maharashtraRef.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
              <Image src="/assets/maharashtra-cityscape.png" alt="Maharashtra industrial and commercial landscape" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B1F33]/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="rounded-md bg-[#E9783B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Pilot Scope</span>
              </div>
            </div>

            {/* Content */}
            <div className={`transition-all duration-700 delay-200 ${maharashtraRef.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl mb-4">
                Starting in <span className="text-[#005A9C]">Maharashtra</span>. Built for India.
              </h2>
              <p className="text-base text-[#475569] leading-relaxed mb-6">
                Maharashtra serves as the initial MVP and validation environment, with an architecture designed for future expansion across India&apos;s diverse labour markets.
              </p>

              {/* Flow */}
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#475569] mb-6">
                {["Maharashtra", "Districts", "Institutions", "Employers", "Skills"].map((item, idx, arr) => (
                  <React.Fragment key={item}>
                    <span className="rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] px-3.5 py-2 transition-colors hover:border-[#005A9C] hover:text-[#005A9C]">{item}</span>
                    {idx < arr.length - 1 && <span className="text-[#D9E1E8]">→</span>}
                  </React.Fragment>
                ))}
              </div>

              <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#005A9C] hover:text-[#003B73] transition-colors">
                View Executive Dashboard <ArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          S10 — FINAL CTA BANNER
          ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-br from-[#FFF8EF] via-[#FFF1E0] to-[#FFF8EF] py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#E9783B] mb-4">
                  <span className="h-px w-6 bg-[#E9783B]" />
                  Get Started
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-[#0B1F33] sm:text-4xl mb-4">
                  Better Workforce Decisions Start With Better Evidence
                </h2>
                <p className="text-base text-[#475569] leading-relaxed mb-6 max-w-lg">
                  SkillPulse brings labour-market, skills, training and employment signals together to support informed workforce decisions.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/skills" className="inline-flex items-center gap-2 rounded-lg bg-[#003B73] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0B1F33] hover:shadow-md">
                    Explore Skill Intelligence <ArrowRight />
                  </Link>
                  <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-[#D9E1E8] bg-white px-6 py-3 text-sm font-semibold text-[#003B73] transition-all hover:border-[#005A9C] hover:bg-[#EFF6FF]">
                    Open Dashboard
                  </Link>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[16/10]">
                <Image src="/assets/banner-opportunity.png" alt="Indian professionals in a modern workspace environment" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#FFF8EF]/30" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
