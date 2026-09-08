"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/* ── City intelligence nodes positioned over satellite map ── */
const INTELLIGENCE_CITIES = [
  { name: "Delhi", top: "26%", left: "47%" },
  { name: "Mumbai", top: "52%", left: "34%" },
  { name: "Pune", top: "55%", left: "37%" },
  { name: "Bengaluru", top: "72%", left: "44%" },
  { name: "Hyderabad", top: "62%", left: "47%" },
  { name: "Chennai", top: "73%", left: "53%" },
  { name: "Kolkata", top: "42%", left: "70%" },
  { name: "Ahmedabad", top: "44%", left: "31%" },
  { name: "Jaipur", top: "34%", left: "41%" },
  { name: "Lucknow", top: "33%", left: "54%" },
] as const;

export function IndiaScrollMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const mapEl = mapRef.current;
    if (!mapEl) return;

    function onScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!mapEl) return;

        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        const maxScroll = docHeight - viewportHeight;
        if (maxScroll <= 0) return;

        const progress = Math.min(1, Math.max(0, scrollY / maxScroll));

        // Pan map smoothly from North India (top) to South India (bottom)
        // translateY goes from +10% (showing North India) to -30% (showing South India)
        const translateY = 10 - progress * 40;
        const scale = 1.05 + progress * 0.08;

        mapEl.style.transform = `translate3d(0, ${translateY}%, 0) scale(${scale})`;
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
      className="fixed inset-0 z-[1] pointer-events-none select-none overflow-hidden bg-slate-950"
      aria-hidden="true"
    >
      {/* Scrollable Map Container */}
      <div
        ref={mapRef}
        className="absolute inset-x-0 -top-[20%] -bottom-[20%] w-full h-[140%] will-change-transform transition-transform duration-100 ease-out"
        style={{
          transform: "translate3d(0, 10%, 0) scale(1.05)",
        }}
      >
        {/* High-Resolution Satellite Night Lights India Map Image (Ultra Crisp & Vivid) */}
        <Image
          src="/assets/india-map-bg.jpg"
          alt="India Map Night Satellite View"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-100 filter contrast-[1.45] brightness-[1.3] saturate-[1.25]"
        />

        {/* Soft subtle edge gradients only */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/30" />

        {/* Pulsing City Intelligence Nodes across India */}
        {INTELLIGENCE_CITIES.map((city) => (
          <div
            key={city.name}
            className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{ top: city.top, left: city.left }}
          >
            <span className="absolute w-8 h-8 rounded-full bg-amber-400/60 animate-ping" />
            <span className="absolute w-4 h-4 rounded-full bg-amber-300 shadow-[0_0_12px_#fbbf24]" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#ffffff]" />
          </div>
        ))}
      </div>
    </div>
  );
}
