"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════
   IndiaScrollMap — Global Scroll-Driven 3D Tricolor Relief India Map
   
   Full-Bleed Widescreen Implementation:
   - Spans 100% full page width (left to right) without column cutoffs
   - Continuous North → Central → South scroll travel
   - GPU accelerated translate3d transforms via requestAnimationFrame
   - prefers-reduced-motion fallback
   ═══════════════════════════════════════════════════════════════════ */

export function IndiaScrollMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function onScroll() {
      if (prefersReducedMotion) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!container) return;

        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = docHeight - viewportHeight;
        if (maxScroll <= 0) return;

        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

        // Pan map smoothly from North India (top) → Central India → South India (bottom)
        // translateY: +16% (North India focused) → -28% (South India focused)
        const translateY = 16 - progress * 44;

        container.style.transform = `translate3d(0, ${translateY}%, 0)`;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden bg-[#FBFBFA]"
      aria-hidden="true"
    >
      {/* Scrollable Map Image Container — Full Bleed 100% Widescreen */}
      <div
        ref={containerRef}
        className="absolute inset-x-0 -top-[25%] -bottom-[25%] w-full h-[150%] will-change-transform transition-transform duration-75 ease-out flex items-center justify-center"
        style={{
          transform: "translate3d(0, 16%, 0)",
        }}
      >
        {/* Full-Bleed Widescreen 3D Relief India Map Image */}
        <div className="relative w-full h-full mix-blend-multiply opacity-85 filter contrast-[1.14] brightness-[1.04] saturate-[1.12]">
          <Image
            src="/assets/skillpulse_bg_ind_map.png"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center scale-110 sm:scale-125 lg:scale-135"
          />
        </div>

        {/* Subtle SkillPulse Warm Orange Glow behind map (#F15A24) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(241,90,36,0.08)_0%,transparent_75%)] pointer-events-none" />
      </div>

      {/* Subtle Readability Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-white/20 pointer-events-none" />
    </div>
  );
}
