"use client";

import Link from "next/link";
import Image from "next/image";
import { useInView } from "@/components/landing/useInView";
import { ArrowRight } from "@/components/landing/icons";

export function FeatureSection() {
  const featureRef = useInView(0.15);

  return (
    <section id="feature-section" ref={featureRef.ref} className="relative z-[2] py-16 lg:py-24 bg-white/50 backdrop-blur-[1px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">

          {/* Image side */}
          <div className={`relative transition-all duration-700 ${featureRef.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
              <Image src="/assets/skills-training.png" alt="Indian students learning technical skills in a modern classroom" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1F2933]/30 via-transparent to-transparent" />
            </div>
            {/* Floating accent card */}
            <div className="absolute -bottom-4 -right-4 sm:bottom-6 sm:-right-6 rounded-xl bg-[#E85D2A] p-4 text-white shadow-xl max-w-[200px]">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Key Principle</span>
              <p className="text-sm font-semibold mt-1 leading-snug">Identify the gap.<br />Understand the cause.<br />Recommend action.</p>
            </div>
          </div>

          {/* Content side */}
          <div className={`flex flex-col gap-6 transition-all duration-700 delay-200 ${featureRef.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
            <span className="inline-flex items-center gap-2 self-start text-[11px] font-bold uppercase tracking-[0.15em] text-[#E85D2A]">
              <span className="h-px w-6 bg-[#E85D2A]" />
              Featured Intelligence
            </span>

            <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl leading-[1.15]">
              Where Skills Meet{" "}
              <span className="text-[#E85D2A]">Demand</span>
            </h2>

            <p className="text-base text-[#475569] leading-relaxed">
              SkillPulse maps the complete workforce intelligence chain — from what employers need to whether training produces employable graduates.
            </p>

            {/* Vertical chain */}
            <div className="space-y-0">
              {[
                { label: "Industry Demand", desc: "What employers need", color: "#1F2933" },
                { label: "Required Skills", desc: "What candidates must learn", color: "#E85D2A" },
                { label: "Training Supply", desc: "What institutions teach", color: "#C94A20" },
                { label: "Employment Outcomes", desc: "What happens after training", color: "#E85D2A" },
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

            <Link href="/gaps" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[#E85D2A] hover:text-[#C94A20] transition-colors">
              Explore Demand vs Supply <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
