"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "@/components/landing/useInView";
import { ArrowRight, CheckIcon } from "@/components/landing/icons";

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

export function StakeholdersSection() {
  const [activeStakeholder, setActiveStakeholder] = useState(0);
  const stakeholderRef = useInView(0.15);

  return (
    <section ref={stakeholderRef.ref} className="relative z-[2] py-16 lg:py-24 bg-white/20 backdrop-blur-[1px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-2xl mx-auto mb-12 transition-all duration-700 ${stakeholderRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl">
            One Platform.{" "}
            <span className="text-[#E85D2A]">Multiple Stakeholders.</span>
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
                  ? "bg-[#1F2933] text-white shadow-md"
                  : "bg-[#F5F7FA] text-[#475569] border border-[#E2E8F0] hover:border-[#E85D2A] hover:text-[#E85D2A]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-[#1F2933]/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="rounded-md bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-[#1F2933]">
                {stakeholders[activeStakeholder].role}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <p className="text-sm font-medium text-[#64748B] mb-1">{stakeholders[activeStakeholder].subtitle}</p>
            <h3 className="text-xl font-bold text-[#1F2933] mb-2">{stakeholders[activeStakeholder].role}</h3>
            <p className="text-base text-[#475569] italic mb-6">&ldquo;{stakeholders[activeStakeholder].question}&rdquo;</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {stakeholders[activeStakeholder].items.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] p-3.5 transition-colors hover:bg-white hover:border-[#E5D9D0]">
                  <CheckIcon className="w-4 h-4 text-[#E85D2A] shrink-0 mt-0.5" />
                  <span className="text-sm text-[#334155]">{item}</span>
                </div>
              ))}
            </div>

            <Link href={stakeholders[activeStakeholder].href} className="inline-flex items-center gap-2 rounded-lg bg-[#E85D2A] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#C94A20]">
              {stakeholders[activeStakeholder].linkText} <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
