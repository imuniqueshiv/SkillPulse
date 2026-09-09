"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Show, SignInButton } from "@clerk/nextjs";
import { useInView } from "@/components/landing/useInView";
import { ArrowRight, SearchIcon } from "@/components/landing/icons";

export function HeroSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const heroRef = useInView(0.1);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes("course") || q.includes("capacity") || q.includes("training")) router.push("/courses");
    else if (q.includes("gap") || q.includes("shortage") || q.includes("supply")) router.push("/gaps");
    else if (q.includes("job") || q.includes("market") || q.includes("demand")) router.push("/jobs");
    else router.push("/skills");
  };

  return (
    <section ref={heroRef.ref} className="relative z-[2] overflow-hidden bg-[#160E0B] min-h-[100svh] -mt-[4.75rem] flex items-center">
      {/* Top Brand Accent Line */}
      <div className="absolute top-0 left-0 right-0 z-20 h-[3px] w-full bg-gradient-to-r from-[#E85D2A] via-[#F28C5B] to-[#E85D2A]" />

      {/* Full-bleed illustration with subtle zoom-in */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <div className="absolute inset-0 sp-hero-zoom will-change-transform">
          <Image
            src="/assets/hero_illustration_img.jpg"
            alt="Stylized warm skyline illustration of global landmarks under a sun with an airplane silhouette"
            fill
            priority
            quality={100}
            unoptimized
            sizes="100vw"
            className="object-cover object-[center_40%] scale-105"
          />
        </div>

        {/* Dark gradient for text readability over the illustration */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#160E0B]/75 via-[#160E0B]/45 to-[#160E0B]/20 z-10" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#160E0B] to-transparent opacity-60" />
      </div>

      {/* Content clears the sticky transparent navbar */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16 lg:pb-20 w-full">
        <div className="max-w-2xl">

          {/* Content Block */}
          <div className={`flex flex-col gap-4 transition-all duration-700 ${heroRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="inline-flex items-center gap-2 self-start text-[11px] font-bold uppercase tracking-[0.15em] text-[#F28C5B]">
              <span className="h-px w-8 bg-[#F28C5B]" />
              Skill &amp; Workforce Intelligence
            </span>

            <h1 className="text-[2.25rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-[3.25rem]">
              Turn Workforce Data Into{" "}
              <span className="text-[#F28C5B]">Better Decisions</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-[#E5DCD6] sm:text-base lg:text-lg">
              SkillPulse connects labour-market demand, skills, training and employment outcomes to identify workforce gaps and support evidence-based decisions.
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="flex max-w-md mt-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89C94]"><SearchIcon /></span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search skills, roles, courses..."
                  className="sp-interactive-glow w-full rounded-l-lg border border-[#4A3B35] bg-[#221612]/90 py-3 pl-11 pr-4 text-sm text-white placeholder-[#A89C94] backdrop-blur-md transition-colors focus:border-[#E85D2A] focus:bg-[#2A1D18] focus:outline-none"
                />
              </div>
              <button type="submit" className="sp-interactive-glow rounded-r-lg bg-[#E85D2A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C94A20] cursor-pointer shadow-md">
                Search
              </button>
            </form>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/skills" className="sp-interactive-glow inline-flex items-center gap-2 rounded-lg bg-[#E85D2A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#C94A20] hover:shadow-md">
                Explore Skill Intelligence <ArrowRight />
              </Link>
              <a href="#feature-section" className="sp-interactive-glow inline-flex items-center gap-2 rounded-lg border border-[#4A3B35] bg-[#221612]/80 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-[#E85D2A] hover:bg-[#34221C]">
                View Workforce Insights
              </a>
              <Show when="signed-out">
                <SignInButton>
                  <button className="sp-interactive-glow rounded-lg border border-[#4A3B35] bg-[#221612]/60 px-4 py-3 text-sm font-semibold text-[#D5C9C0] backdrop-blur-md transition-all hover:border-[#E85D2A] hover:text-white cursor-pointer">Sign In</button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="sp-interactive-glow rounded-lg bg-[#E85D2A] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#C94A20]">Open Dashboard</Link>
              </Show>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
