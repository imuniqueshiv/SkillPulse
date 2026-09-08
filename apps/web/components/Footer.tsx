"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* SkillPulse Logo SVG Mark */
function SkillPulseLogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#E85D2A" />
      <path
        d="M7 20H11L14.5 10L19 26L23.5 15L26 20H29"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14.5" cy="10" r="2.2" fill="#F28C5B" />
      <circle cx="19" cy="26" r="2.2" fill="#FFF0E8" />
      <circle cx="23.5" cy="15" r="2.2" fill="#F28C5B" />
    </svg>
  );
}

/* Compact Integrated Indian Landmark Architectural Skyline Base Graphic */
function CompactIndianLandmarkBase() {
  return (
    <div className="absolute bottom-0 inset-x-0 w-full pointer-events-none z-0 overflow-hidden select-none" aria-hidden="true">
      <svg
        className="w-full h-16 sm:h-20 md:h-24 block opacity-65 transition-opacity"
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* ================================================================== */}
        {/* BACK LAYER: Warm Beige Distant Domes & Minarets (#F4E2D2)          */}
        {/* ================================================================== */}
        <g fill="#F4E2D2" opacity="0.8">
          {/* Qutub Minar Silhouette (Far Left) */}
          <path d="M50 120 L55 20 L59 20 L64 120 Z" />
          <rect x="53" y="45" width="8" height="2" rx="0.5" />
          <rect x="54" y="70" width="6" height="2" rx="0.5" />
          <rect x="54.5" y="95" width="5" height="2" rx="0.5" />
          <polygon points="57 10, 55 20, 59 20" />

          {/* Distant Heritage Domes & Cupolas (Left-Center) */}
          <path d="M140 120 V75 Q160 55 180 75 V120 Z" />
          <path d="M210 120 V85 Q222 70 234 85 V120 Z" />

          {/* India Gate Silhouette (Center-Left) */}
          <rect x="360" y="45" width="80" height="75" />
          <rect x="350" y="37" width="100" height="10" rx="1.5" />
          <rect x="368" y="28" width="64" height="10" rx="1.5" />
          <path d="M384 120 V80 A16 16 0 0 1 416 80 V120 Z" fill="#FFF7EF" />

          {/* Parliament / Classical Colonnade Dome (Center) */}
          <path d="M680 120 V75 A40 40 0 0 1 760 75 V120 Z" />
          <rect x="672" y="75" width="96" height="6" rx="1" />
          <polygon points="720 50, 716 75, 724 75" />

          {/* Taj Mahal Central Dome & Side Minarets (Right-Center) */}
          <path d="M960 120 V70 Q995 40 1030 70 V120 Z" />
          <polygon points="995 28, 991 42, 999 42" />
          <path d="M925 120 L927 50 L931 50 L933 120 Z" />
          <path d="M1057 120 L1059 50 L1063 50 L1065 120 Z" />

          {/* Heritage Fort Towers (Far Right) */}
          <path d="M1240 120 V78 Q1258 60 1276 78 V120 Z" />
        </g>

        {/* ================================================================== */}
        {/* MIDDLE LAYER: Muted Terracotta Silhouettes (#C8705C)                */}
        {/* ================================================================== */}
        <g fill="#C8705C" opacity="0.85">
          {/* Heritage Chhatri / Pavilion (Left) */}
          <rect x="95" y="85" width="24" height="35" />
          <path d="M91 85 Q107 70 123 85 Z" />
          <polygon points="107 60, 104 70, 110 70" />

          {/* Gateway Arch (Center-Left) */}
          <rect x="470" y="65" width="56" height="55" />
          <path d="M486 120 V85 A12 12 0 0 1 510 85 V120 Z" fill="#FFF7EF" />
          <rect x="464" y="58" width="68" height="8" rx="1" />

          {/* Taj Mahal Main Facade & Side Domes (Right-Center) */}
          <rect x="970" y="82" width="50" height="38" />
          <path d="M983 120 V95 A12 12 0 0 1 1007 95 V120 Z" fill="#FFF7EF" />
          <path d="M958 90 Q970 76 982 90 Z" />
          <path d="M1008 90 Q1020 76 1032 90 Z" />

          {/* Fort Battlement Wall (Far Right) */}
          <rect x="1160" y="80" width="120" height="40" />
          <rect x="1164" y="73" width="10" height="8" />
          <rect x="1180" y="73" width="10" height="8" />
          <rect x="1196" y="73" width="10" height="8" />
          <rect x="1212" y="73" width="10" height="8" />
          <rect x="1228" y="73" width="10" height="8" />
          <rect x="1244" y="73" width="10" height="8" />
          <rect x="1260" y="73" width="10" height="8" />
        </g>

        {/* ================================================================== */}
        {/* FRONT LAYER: Primary Terracotta Monuments (#A94F3D)                 */}
        {/* ================================================================== */}
        <g fill="#A94F3D" opacity="0.95">
          {/* Base Line */}
          <rect x="0" y="117" width="1440" height="3" />

          {/* Red Fort Front Wall (Left) */}
          <rect x="0" y="98" width="75" height="22" />
          <rect x="4" y="92" width="8" height="8" />
          <rect x="18" y="92" width="8" height="8" />
          <rect x="32" y="92" width="8" height="8" />
          <rect x="46" y="92" width="8" height="8" />
          <rect x="60" y="92" width="8" height="8" />

          {/* India Gate Foreground Arch (Center-Left) */}
          <rect x="372" y="55" width="56" height="65" />
          <rect x="364" y="47" width="72" height="9" rx="1" />
          <rect x="378" y="39" width="44" height="9" rx="1" />
          <path d="M388 120 V84 A12 12 0 0 1 412 84 V120 Z" fill="#FFF7EF" />

          {/* High Central Heritage Dome (Center) */}
          <path d="M590 120 V90 Q610 70 630 90 V120 Z" />
          <polygon points="610 56, 607 70, 613 70" />

          {/* Classical Columned Monument (Center-Right) */}
          <rect x="800" y="88" width="90" height="32" />
          <rect x="792" y="82" width="106" height="7" rx="1" />
          <path d="M824 120 V98 A9 9 0 0 1 842 98 V120 Z" fill="#FFF7EF" />
          <path d="M854 120 V98 A9 9 0 0 1 872 98 V120 Z" fill="#FFF7EF" />

          {/* Gateway Turret (Far Right) */}
          <rect x="1330" y="90" width="55" height="30" />
          <path d="M1342 90 Q1357 74 1372 90 Z" />
          <polygon points="1357 64, 1354 75, 1360 75" />
        </g>
      </svg>
    </div>
  );
}

const PLATFORM_LINKS = [
  { label: "Intelligence", href: "/skills" },
  { label: "Training & Curriculum", href: "/curricula" },
  { label: "Outcomes", href: "/outcomes" },
  { label: "Recommendations", href: "/recommendations" },
  { label: "Dashboards", href: "/dashboard" },
];

const RESOURCE_LINKS = [
  { label: "Skills", href: "/skills" },
  { label: "Workforce Insights", href: "/jobs" },
  { label: "About SkillPulse", href: "/quality" },
  { label: "Contact", href: "/settings" },
];

export function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  const isDashboardRoute =
    pathname !== "/" &&
    !pathname?.startsWith("/sign-in") &&
    !pathname?.startsWith("/sign-up");

  return (
    <footer
      className={`w-full bg-[#FFF7EF] border-t border-[#E8D4C5] relative overflow-hidden select-none text-[#3A2A25] transition-all duration-150 ${
        isDashboardRoute ? "lg:ml-[var(--sp-sidebar-width,256px)]" : "w-full"
      }`}
      aria-label="Site Footer"
    >
      {/* 1. Top Terracotta/Orange Accent Bar */}
      <div className="h-[2px] w-full bg-[#E85D2A] relative z-10" />

      {/* 2. Main Content Container (Compact Padding & Height) */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-3 relative z-10">
        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-10 pb-5">
          
          {/* Column 1: BRAND */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 pr-0 lg:pr-8">
            <Link href="/" className="inline-flex items-center gap-2 group w-fit">
              <SkillPulseLogoMark className="h-7 w-7 shrink-0 transition-transform group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-bold tracking-tight text-[#3A2A25] leading-none">
                  Skill<span className="text-[#E85D2A]">Pulse</span>
                </span>
                <span className="text-[0.5625rem] font-bold uppercase tracking-[0.14em] text-[#A94F3D] leading-tight mt-0.5">
                  Workforce Intelligence
                </span>
              </div>
            </Link>

            <p className="text-xs text-[#75645D] leading-relaxed max-w-md">
              Evidence-driven skill and workforce intelligence for better decisions.
            </p>
          </div>

          {/* Column 2: PLATFORM */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A94F3D] mb-2.5 border-b border-[#E8D4C5] pb-1 w-fit">
              Platform
            </h3>
            <ul className="flex flex-col gap-1.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-[#3A2A25] transition-colors duration-150 hover:text-[#E85D2A] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: RESOURCES */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A94F3D] mb-2.5 border-b border-[#E8D4C5] pb-1 w-fit">
              Resources
            </h3>
            <ul className="flex flex-col gap-1.5">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-[#3A2A25] transition-colors duration-150 hover:text-[#E85D2A] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3. Copyright & Utility Links Bar (Integrated on top of the skyline base) */}
        <div className="border-t border-[#E8D4C5]/80 pt-3 pb-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#75645D]">
          <p>© {currentYear} SkillPulse. All rights reserved.</p>
          <div className="flex items-center gap-3 font-medium">
            <Link href="/settings" className="hover:text-[#E85D2A] transition-colors">
              Privacy
            </Link>
            <span className="text-[#E8D4C5]">|</span>
            <Link href="/settings" className="hover:text-[#E85D2A] transition-colors">
              Accessibility
            </Link>
            <span className="text-[#E8D4C5]">|</span>
            <Link href="/settings" className="hover:text-[#E85D2A] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Integrated Compact Indian Landmark Architectural Skyline Base */}
      <CompactIndianLandmarkBase />
    </footer>
  );
}
