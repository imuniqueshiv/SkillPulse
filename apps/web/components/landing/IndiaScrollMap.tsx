"use client";

import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════════
   IndiaScrollMap — Global Scroll-Driven India SVG Geographic Map
   
   Renders an accurate SVG outline of India that continuously pans
   from North → Central → South as the user scrolls the landing page.
   
   Features:
   - Accurate India geographic SVG path
   - Subtle intelligence city points with pulse animation
   - requestAnimationFrame scroll tracking (no React re-renders)
   - GPU-accelerated CSS transforms
   - Passive scroll listeners with cleanup
   - prefers-reduced-motion support
   - Fully decorative (aria-hidden, pointer-events: none)
   ═══════════════════════════════════════════════════════════════════ */

/* ── City intelligence nodes ── */
const INTELLIGENCE_CITIES = [
  { name: "Delhi", x: 310, y: 180, size: 5 },
  { name: "Mumbai", x: 230, y: 430, size: 5 },
  { name: "Pune", x: 260, y: 450, size: 4 },
  { name: "Bengaluru", x: 290, y: 560, size: 5 },
  { name: "Hyderabad", x: 310, y: 480, size: 4.5 },
  { name: "Chennai", x: 340, y: 555, size: 4.5 },
  { name: "Kolkata", x: 440, y: 330, size: 5 },
  { name: "Ahmedabad", x: 215, y: 330, size: 4 },
  { name: "Jaipur", x: 270, y: 245, size: 4 },
  { name: "Lucknow", x: 355, y: 240, size: 4 },
  { name: "Chandigarh", x: 295, y: 155, size: 3.5 },
  { name: "Bhopal", x: 305, y: 345, size: 3.5 },
  { name: "Kochi", x: 275, y: 610, size: 3.5 },
  { name: "Thiruvananthapuram", x: 270, y: 645, size: 3 },
] as const;

/* ── Connection lines between major intelligence hubs ── */
const INTELLIGENCE_LINKS = [
  { from: "Delhi", to: "Mumbai" },
  { from: "Delhi", to: "Kolkata" },
  { from: "Mumbai", to: "Bengaluru" },
  { from: "Mumbai", to: "Hyderabad" },
  { from: "Bengaluru", to: "Chennai" },
  { from: "Hyderabad", to: "Bengaluru" },
  { from: "Delhi", to: "Jaipur" },
  { from: "Delhi", to: "Lucknow" },
  { from: "Kolkata", to: "Hyderabad" },
  { from: "Bengaluru", to: "Kochi" },
] as const;

function getCityCoords(name: string) {
  const city = INTELLIGENCE_CITIES.find((c) => c.name === name);
  return city ? { x: city.x, y: city.y } : { x: 0, y: 0 };
}

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

        // Pan from North India (top) → South India (bottom)
        // The SVG is tall (~750 units). We translate the container to reveal different regions.
        const translateY = 15 - progress * 50; // 15% → -35%
        const scale = 1.0 + progress * 0.12;

        // Glow peaks at ~50% scroll
        const glowPeak = 1 - Math.abs(progress - 0.5) * 2;
        const mapOpacity = 0.18 + glowPeak * 0.1;

        container.style.transform = `translate3d(-5%, ${translateY}%, 0) scale(${scale})`;
        container.style.opacity = String(mapOpacity);
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
      className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Map container — oversized to allow scroll travel */}
      <div
        ref={containerRef}
        className="absolute w-full will-change-transform"
        style={{
          height: "200%",
          top: "-30%",
          opacity: 0.18,
          transform: "translate3d(-5%, 15%, 0) scale(1.0)",
        }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 600 750"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Orange glow filter for the map outline */}
            <filter id="india-map-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feFlood floodColor="#F15A24" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radial glow for intelligence points */}
            <radialGradient id="city-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F15A24" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#F15A24" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F15A24" stopOpacity="0" />
            </radialGradient>

            {/* Subtle fill gradient for India landmass */}
            <linearGradient id="india-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F15A24" stopOpacity="0.04" />
              <stop offset="50%" stopColor="#FFF7F0" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#F15A24" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* ── India Geographic Outline (Accurate SVG Path) ── */}
          <g filter="url(#india-map-glow)">
            <path
              d={INDIA_OUTLINE_PATH}
              fill="url(#india-fill)"
              stroke="#F15A24"
              strokeWidth="1.2"
              strokeOpacity="0.35"
              strokeLinejoin="round"
            />
          </g>

          {/* ── Kashmir / Northern Region Detail ── */}
          <path
            d={KASHMIR_PATH}
            fill="none"
            stroke="#F15A24"
            strokeWidth="0.8"
            strokeOpacity="0.2"
            strokeDasharray="3 3"
          />

          {/* ── Intelligence Connection Lines ── */}
          <g opacity="0.2">
            {INTELLIGENCE_LINKS.map((link, i) => {
              const from = getCityCoords(link.from);
              const to = getCityCoords(link.to);
              const midX = (from.x + to.x) / 2;
              const midY = (from.y + to.y) / 2 - 20;
              return (
                <path
                  key={i}
                  d={`M${from.x},${from.y} Q${midX},${midY} ${to.x},${to.y}`}
                  stroke="#F15A24"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                  fill="none"
                  opacity="0.6"
                />
              );
            })}
          </g>

          {/* ── Intelligence City Points ── */}
          {INTELLIGENCE_CITIES.map((city) => (
            <g key={city.name}>
              {/* Outer pulse ring */}
              <circle
                cx={city.x}
                cy={city.y}
                r={city.size * 2.5}
                fill="url(#city-glow)"
                className="animate-[indiaPulse_3s_ease-in-out_infinite]"
                style={{ animationDelay: `${(city.x * 17) % 2000}ms` }}
              />
              {/* Core dot */}
              <circle
                cx={city.x}
                cy={city.y}
                r={city.size * 0.7}
                fill="#F15A24"
                opacity="0.6"
              />
              {/* Inner bright center */}
              <circle
                cx={city.x}
                cy={city.y}
                r={city.size * 0.3}
                fill="#FFFFFF"
                opacity="0.7"
              />
            </g>
          ))}

          {/* ── Subtle State/Region Boundaries ── */}
          <g opacity="0.08" stroke="#F15A24" strokeWidth="0.5">
            {/* Horizontal region dividers (decorative) */}
            <line x1="200" y1="200" x2="450" y2="200" strokeDasharray="2 4" />
            <line x1="180" y1="350" x2="460" y2="350" strokeDasharray="2 4" />
            <line x1="220" y1="500" x2="400" y2="500" strokeDasharray="2 4" />
          </g>
        </svg>
      </div>

      {/* ── Content readability overlay ── */}
      <div className="absolute inset-0 bg-white/[0.78] sm:bg-white/[0.74] lg:bg-white/[0.70]" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/40" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   India Geographic SVG Outline Paths
   Accurate representation of India's borders
   ═══════════════════════════════════════════════════════════════════ */

const INDIA_OUTLINE_PATH = [
  // Northwest — Gujarat coast
  "M 185 290",
  "L 175 310 L 165 340 L 170 360 L 160 380",
  "L 155 400 L 170 410 L 175 395 L 190 385",
  "L 200 395 L 195 410 L 200 425",
  // West coast — Maharashtra, Goa, Karnataka, Kerala
  "L 210 440 L 220 445 L 225 460 L 235 470",
  "L 240 485 L 245 500 L 250 510 L 248 525",
  "L 255 540 L 260 555 L 265 570 L 268 585",
  "L 272 600 L 270 615 L 265 630 L 260 645",
  "L 265 655 L 275 660",
  // Southern tip — Kanyakumari
  "L 285 665 L 295 660 L 300 650",
  // East coast — Tamil Nadu, Andhra Pradesh
  "L 310 640 L 320 625 L 335 610 L 345 595",
  "L 355 575 L 360 555 L 365 540 L 370 520",
  "L 380 500 L 385 480 L 390 460 L 395 440",
  // East coast — Odisha
  "L 400 420 L 410 400 L 420 385 L 425 370",
  "L 435 355 L 440 340",
  // Northeast — West Bengal, Bangladesh border indent
  "L 445 325 L 448 310 L 440 300 L 435 290",
  "L 445 280 L 455 270",
  // Northeast states — Assam, Meghalaya, etc.
  "L 465 260 L 475 255 L 490 250 L 500 245",
  "L 510 240 L 515 235 L 520 225 L 515 215",
  "L 505 210 L 495 215 L 485 220 L 475 218",
  "L 465 222 L 455 225 L 448 220",
  // Back west along northern border — Bihar, UP
  "L 440 215 L 430 210 L 420 208 L 410 205",
  "L 400 200 L 390 198 L 380 195 L 370 190",
  // Northern border — Uttarakhand
  "L 360 185 L 350 178 L 340 170 L 330 165",
  // Himachal Pradesh, J&K
  "L 320 158 L 310 150 L 300 145 L 295 138",
  "L 290 130 L 285 122 L 280 115 L 275 108",
  "L 270 100 L 268 92",
  // Kashmir region
  "L 265 85 L 260 78 L 255 72 L 252 68",
  "L 248 75 L 245 82 L 240 90",
  // Northwest — Punjab, Rajasthan
  "L 235 100 L 230 110 L 228 120 L 225 130",
  "L 222 142 L 218 155 L 215 168 L 210 180",
  "L 205 195 L 200 210 L 195 225 L 190 240",
  "L 188 255 L 185 270 L 185 280 L 185 290",
  "Z",
].join(" ");

const KASHMIR_PATH = [
  "M 252 68",
  "L 258 60 L 265 55 L 272 52 L 280 55",
  "L 288 60 L 295 65 L 300 72 L 305 80",
  "L 310 88 L 308 95 L 302 100 L 295 105",
  "L 290 112 L 285 118",
].join(" ");
