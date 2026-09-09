"use client";

import { useState, type ReactNode } from "react";
import { useInView } from "@/components/landing/useInView";

const insightTabs: { label: string; content: ReactNode }[] = [
  {
    label: "What Data Shows",
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-[#DCFCE7] px-3 py-1.5 text-xs font-bold text-[#15803D]">HIGH</span>
          <div><span className="text-sm font-semibold text-[#0F172A]">Labour Market Demand</span><p className="text-xs text-[#64748B]">Strong hiring frequency in IT sector across multiple districts</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="shrink-0 rounded-md bg-[#FFF0E8] px-3 py-1.5 text-xs font-bold text-[#C94A20]">HIGH</span>
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
        <div className="rounded-xl bg-[#FFF0E8] border border-[#E5D9D0] p-5">
          <span className="inline-block rounded-md bg-[#E85D2A] px-3 py-1.5 text-sm font-bold text-white mb-3">UPDATE CURRICULUM</span>
          <p className="text-sm text-[#334155] leading-relaxed">
            Improve existing practical training modules rather than creating additional seats. Focus curriculum revision on employer-identified skill gaps in the IT sector.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#1F2933]">Confidence</strong><p className="text-[#64748B] mt-0.5">Medium–High</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#1F2933]">Coverage</strong><p className="text-[#64748B] mt-0.5">3 districts verified</p></div>
          <div className="rounded-lg border border-[#E2E8F0] p-3"><strong className="text-[#1F2933]">Limitation</strong><p className="text-[#64748B] mt-0.5">Regional concentration</p></div>
        </div>
      </div>
    ),
  },
];

export function InsightSection() {
  const [activeInsight, setActiveInsight] = useState(0);
  const insightRef = useInView(0.15);

  return (
    <section ref={insightRef.ref} className="relative z-[2] py-16 lg:py-24 bg-[#FFF8F2]/20 backdrop-blur-[1px]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className={`mb-10 transition-all duration-700 ${insightRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#E85D2A] mb-3">
                <span className="h-px w-6 bg-[#E85D2A]" />
                Interactive Example
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933]">
                See What the Evidence <span className="text-[#E85D2A]">Means</span>
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
                    ? "bg-[#1F2933] text-white"
                    : "bg-[#F5F7FA] text-[#64748B] hover:bg-[#FFF0E8] hover:text-[#E85D2A]"
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
  );
}
