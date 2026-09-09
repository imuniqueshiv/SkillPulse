import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "@/components/landing/icons";

export function FinalCTASection() {
  return (
    <section className="relative z-[2] overflow-hidden">
      <div className="bg-gradient-to-br from-[#FFF0E8] via-[#FFF8F2] to-[#FFF0E8] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#E85D2A] mb-4">
                <span className="h-px w-6 bg-[#E85D2A]" />
                Get Started
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl mb-4">
                Better Workforce Decisions Start With Better Evidence
              </h2>
              <p className="text-base text-[#475569] leading-relaxed mb-6 max-w-lg">
                SkillPulse brings labour-market, skills, training and employment signals together to support informed workforce decisions.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/skills" className="inline-flex items-center gap-2 rounded-lg bg-[#E85D2A] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#C94A20] hover:shadow-md">
                  Explore Skill Intelligence <ArrowRight />
                </Link>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-[#D9E1E8] bg-white px-6 py-3 text-sm font-semibold text-[#1F2933] transition-all hover:border-[#E85D2A] hover:bg-[#FFF0E8]">
                  Open Dashboard
                </Link>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[16/10]">
              <Image src="/assets/banner-employment.png" alt="Indian professionals in a modern workspace environment" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#FFF8EF]/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
