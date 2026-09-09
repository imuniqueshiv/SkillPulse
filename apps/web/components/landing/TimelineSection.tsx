"use client";

import { useState } from "react";
import { useInView } from "@/components/landing/useInView";

const timelineSteps = [
  { num: "01", name: "Collect", title: "Data Collection", detail: "Ingest job postings, employer surveys, curriculum data, and institute training capacity records from multiple verified sources." },
  { num: "02", name: "Validate", title: "Evidence Validation", detail: "Check freshness, reliability, duplicates, reposted vacancies, conflicting information, and coverage limits for every data point." },
  { num: "03", name: "Analyse", title: "Skill Analysis", detail: "Normalize job descriptions into standardized competency domains and qualification standards using NLP-driven extraction." },
  { num: "04", name: "Identify", title: "Gap Detection", detail: "Compare demand vs supply to distinguish between skill, curriculum, capacity, and geographic gaps across regions." },
  { num: "05", name: "Recommend", title: "Policy Guidance", detail: "Generate explainable recommendations specifying target action, root cause, confidence score, and data limitations." },
  { num: "06", name: "Measure", title: "Outcome Tracking", detail: "Track actual hiring results and post-intervention placement sustainability to refine future intelligence models." },
];

export function TimelineSection() {
  const [activeStep, setActiveStep] = useState(0);
  const timelineRef = useInView(0.15);

  return (
    <section id="how-it-works" ref={timelineRef.ref} className="relative z-[2] py-16 lg:py-24 bg-[#FFFCF9]/50 backdrop-blur-[1px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${timelineRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <span className="inline-flex items-center gap-2 justify-center text-[11px] font-bold uppercase tracking-[0.15em] text-[#E85D2A] mb-4">
            <span className="h-px w-6 bg-[#E85D2A]" />
            Intelligence Pipeline
            <span className="h-px w-6 bg-[#E85D2A]" />
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl">
            From Evidence to <span className="text-[#E85D2A]">Action</span>
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
                    ? "bg-[#E85D2A] text-white shadow-lg shadow-[#E85D2A]/25 scale-110"
                    : "bg-white text-[#64748B] border-2 border-[#D9E1E8] group-hover:border-[#E85D2A] group-hover:text-[#E85D2A]"
                }`}>
                  {step.num}
                </div>
                <span className={`text-xs font-semibold transition-colors ${activeStep === idx ? "text-[#1F2933]" : "text-[#64748B]"}`}>
                  {step.name}
                </span>
              </button>
            ))}
          </div>

          {/* Active detail */}
          <div className="mx-auto max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <span className="shrink-0 w-10 h-10 rounded-lg bg-[#FFF0E8] flex items-center justify-center text-sm font-bold text-[#E85D2A]">
                {timelineSteps[activeStep].num}
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1F2933]">{timelineSteps[activeStep].title}</h3>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">{timelineSteps[activeStep].detail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
