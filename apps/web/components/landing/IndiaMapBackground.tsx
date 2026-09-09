"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * IndiaMapBackground — Global scroll-driven India satellite map background.
 *
 * Renders a fixed-position India satellite image that continuously pans
 * from North India → Central India → South India as the user scrolls
 * through the entire landing page.
 *
 * Performance:
 * - Uses requestAnimationFrame for throttled scroll updates
 * - Applies CSS transform (translate3d + scale) for GPU-accelerated rendering
 * - Passive scroll listener, no React state updates on scroll
 * - Proper cleanup of listeners and RAF on unmount
 *
 * Accessibility:
 * - Decorative: aria-hidden="true", alt=""
 * - pointer-events: none — never blocks clicks
 * - Respects prefers-reduced-motion: disable transitions, keep static
 */
export function IndiaMapBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    function onScroll() {
      if (prefersReducedMotion) return;

      // Cancel any pending frame
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!container) return;

        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = docHeight - viewportHeight;

        // Guard against division by zero
        if (maxScroll <= 0) return;

        // progress: 0 (top) → 1 (bottom)
        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

        // ── Map vertical travel ──
        // Pan from North India (top) to South India (bottom)
        // translateY range: 10% (top) → -35% (bottom) of the container
        const translateY = 10 - progress * 45;

        // ── Scale ──
        // Slightly zoom as user scrolls deeper into the page
        const scale = 1.05 + progress * 0.15;

        // ── Glow intensity ──
        // Subtle orange glow increases toward the middle of the page
        const glowPeak = 1 - Math.abs(progress - 0.5) * 2; // peaks at 50%
        const glowOpacity = 0.03 + glowPeak * 0.06;

        // ── Overall opacity ──
        // Slightly more visible in the middle sections
        const baseOpacity = 0.12 + glowPeak * 0.06;

        // Apply GPU-accelerated transforms via style mutation (no React re-render)
        container.style.transform = `translate3d(0, ${translateY}%, 0) scale(${scale})`;
        container.style.opacity = String(baseOpacity);

        // Update glow element
        const glowEl = container.querySelector(
          "[data-map-glow]"
        ) as HTMLElement | null;
        if (glowEl) {
          glowEl.style.opacity = String(glowOpacity);
        }
      });
    }

    // Initial position
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
      className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Map image container — oversized for scroll travel room */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full will-change-transform transition-none"
        style={{
          height: "180%",
          top: "-20%",
          opacity: 0.12,
          transform: "translate3d(0, 10%, 0) scale(1.05)",
        }}
      >
        {/* India satellite map image */}
        <Image
          src="/assets/skillpulse_bg_ind_map.png"
          alt=""
          fill
          quality={100}
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
          loading="lazy"
        />

        {/* Subtle orange glow overlay — SkillPulse brand accent */}
        <div
          data-map-glow=""
          className="absolute inset-0"
          style={{
            opacity: 0.04,
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(241, 90, 36, 0.6) 0%, rgba(241, 90, 36, 0.15) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* Content readability overlays — subtle cream/white fade so text stays crisp */}
      <div className="absolute inset-0 bg-white/75 sm:bg-white/70 lg:bg-white/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/50" />
    </div>
  );
}
