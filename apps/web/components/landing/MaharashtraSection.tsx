"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useInView } from "@/components/landing/useInView";
import { ArrowRight } from "@/components/landing/icons";

export function MaharashtraSection() {
  const maharashtraRef = useInView(0.15);

  return (
    <section ref={maharashtraRef.ref} className="relative z-[2] py-16 lg:py-24 bg-white/20 backdrop-blur-[1px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Image */}
          <div className={`relative rounded-2xl overflow-hidden shadow-xl aspect-[16/10] transition-all duration-700 ${maharashtraRef.inView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}>
            <Image src="/assets/maharashtra-cityscape.png" alt="Maharashtra industrial and commercial landscape" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1F2933]/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <span className="rounded-md bg-[#E85D2A] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">Pilot Scope</span>
            </div>
          </div>

          {/* Content */}
          <div className={`transition-all duration-700 delay-200 ${maharashtraRef.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933] sm:text-4xl mb-4">
              Starting in <span className="text-[#E85D2A]">Maharashtra</span>. Built for India.
            </h2>
            <p className="text-base text-[#475569] leading-relaxed mb-6">
              Maharashtra serves as the initial MVP and validation environment, with an architecture designed for future expansion across India&apos;s diverse labour markets.
            </p>

            {/* Flow */}
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#475569] mb-6">
              {["Maharashtra", "Districts", "Institutions", "Employers", "Skills"].map((item, idx, arr) => (
                <React.Fragment key={item}>
                  <span className="rounded-lg border border-[#E2E8F0] bg-[#F5F7FA] px-3.5 py-2 transition-colors hover:border-[#E85D2A] hover:text-[#E85D2A]">{item}</span>
                  {idx < arr.length - 1 && <span className="text-[#D9E1E8]">→</span>}
                </React.Fragment>
              ))}
            </div>

            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-[#E85D2A] hover:text-[#C94A20] transition-colors">
              View Executive Dashboard <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
