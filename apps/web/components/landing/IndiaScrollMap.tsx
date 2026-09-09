"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════
   IndiaScrollMap — Global Scroll-Driven 3D Tricolor Relief India Map
   
   Renders the uploaded high-resolution "map of india.jpg" relief image
   that continuously pans from North → Central → South India as the user
   scrolls the landing page.
   
   Performance & Accessibility:
   - requestAnimationFrame scroll tracking with passive listeners
   - GPU-accelerated CSS transforms (translate3d)
   - Zero React re-renders during scroll
   - prefers-reduced-motion fallback
   - pointer-events: none, aria-hidden="true"
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
        // translateY: +14% (North India focused) → -30% (South India focused)
        const translateY = 14 - progress * 44;
        const scale = 1.05 + progress * 0.06;

        container.style.transform = `translate3d(0, ${translateY}%, 0) scale(${scale})`;
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
      {/* Scrollable Map Image Container — Oversized for continuous North→South travel */}
      <div
        ref={containerRef}
        className="absolute inset-x-0 -top-[20%] -bottom-[20%] w-full h-[140%] will-change-transform transition-transform duration-75 ease-out flex items-center justify-center"
        style={{
          transform: "translate3d(0, 14%, 0) scale(1.05)",
        }}
      >
        {/* Uploaded High-Resolution 3D Relief India Map Image */}
        <div className="relative w-full h-full max-w-[1400px] mx-auto mix-blend-multiply opacity-80 filter contrast-[1.12] brightness-[1.03] saturate-[1.1]">
          <Image
            src="/assets/map-of-india.jpg"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-contain object-center scale-110 sm:scale-125 lg:scale-135"
          />
        </div>

        {/* Subtle SkillPulse Warm Amber/Orange Radial Glow behind map outline (#F15A24) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(241,90,36,0.08)_0%,transparent_70%)] pointer-events-none" />
      </div>

      {/* Subtle Readability Vignette — keeps text sharp across all sections */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/30 pointer-events-none" />
    </div>
  );
}
