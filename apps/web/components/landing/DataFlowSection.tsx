"use client";

import { useInView } from "@/components/landing/useInView";
import { CheckIcon } from "@/components/landing/icons";

export function DataFlowSection() {
  const dataFlowRef = useInView(0.15);

  return (
    <section ref={dataFlowRef.ref} className="relative z-[2] py-16 lg:py-24 bg-white/20 backdrop-blur-[1px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-2xl mx-auto mb-14 transition-all duration-700 ${dataFlowRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl">
            Understanding the{" "}
            <span className="text-[#E85D2A]">Workforce Gap</span>
          </h2>
          <p className="mt-3 text-base text-[#64748B]">A high-demand occupation does not automatically mean more training seats are required.</p>
        </div>

        {/* Three-column infographic */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm transition-all duration-700 ${dataFlowRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* DATA */}
          <div className="bg-[#F5F7FA] p-8 border-b lg:border-b-0 lg:border-r border-[#E2E8F0]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E85D2A]">Data Sources</span>
            <h3 className="text-lg font-bold text-[#1F2933] mt-2 mb-4">Collect</h3>
            <div className="space-y-2">
              {["Labour Market", "Employer Surveys", "Training Records", "Curriculum Data", "Outcome Reports"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E85D2A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* INTELLIGENCE */}
          <div className="bg-[#FFF0E8] p-8 border-b lg:border-b-0 lg:border-r border-[#E5D9D0]">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1F2933]">Intelligence Engine</span>
            <h3 className="text-lg font-bold text-[#1F2933] mt-2 mb-4">Analyse</h3>
            <div className="space-y-2">
              {["Skill Mapping", "Demand vs Supply", "Gap Classification", "Evidence Confidence", "Root Cause Analysis"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[#334155]">
                  <CheckIcon className="w-3.5 h-3.5 text-[#E85D2A]" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* ACTION */}
          <div className="bg-[#1F2933] p-8 text-white">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FAD5C2]">Decision Support</span>
            <h3 className="text-lg font-bold mt-2 mb-4">Act</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Update", "Expand", "Reduce", "Pilot", "Train", "Monitor"].map((item) => (
                <div key={item} className="rounded-md border border-[#E85D2A] bg-[#E85D2A]/30 px-3 py-2 text-xs font-semibold text-center">
                  {item}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#F4B183] mt-4 leading-relaxed">Each recommendation includes confidence score, evidence sources, and known limitations.</p>
          </div>
        </div>

        {/* Gap types strip */}
        <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#F5F7FA] p-5">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#64748B] block mb-3">Gap types SkillPulse identifies</span>
          <div className="flex flex-wrap gap-2">
            {["Skill Mismatch", "Curriculum Gap", "Capacity Limitation", "Trainer Shortage", "Geographic Mismatch", "Insufficient Evidence"].map((gap) => (
              <span key={gap} className="rounded-full border border-[#D9E1E8] bg-white px-3.5 py-1.5 text-xs font-medium text-[#475569] transition-colors hover:border-[#E85D2A] hover:text-[#E85D2A]">
                {gap}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
