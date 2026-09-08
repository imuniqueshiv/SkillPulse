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

/* Layered Indian Landmark Architectural Skyline Illustration */
function IndianLandmarkSkyline() {
  return (
    <div className="w-full relative overflow-hidden select-none pt-4 bg-[#FFF7EF]" aria-hidden="true">
      <svg
        className="w-full h-28 sm:h-36 md:h-44 lg:h-48 block text-[#A94F3D]"
        viewBox="0 0 1440 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* ================================================================== */}
        {/* BACK LAYER: Light Warm Beige Monuments & Distant Domes (#F4E2D2)   */}
        {/* ================================================================== */}
        <g fill="#F4E2D2" opacity="0.85">
          {/* Qutub Minar Silhouette (Far Left) */}
          <path d="M60 180 L66 40 L70 40 L76 180 Z" />
          <rect x="63" y="70" width="10" height="3" rx="1" />
          <rect x="64" y="100" width="8" height="3" rx="1" />
          <rect x="65" y="130" width="6" height="3" rx="1" />
          <polygon points="68 30, 66 40, 70 40" />

          {/* Distant Heritage Domes & Cupolas (Left-Center) */}
          <path d="M160 180 V110 Q180 85 200 110 V180 Z" />
          <path d="M230 180 V120 Q245 100 260 120 V180 Z" />

          {/* India Gate Silhouette (Center-Left) */}
          <rect x="360" y="70" width="100" height="110" />
          <rect x="348" y="60" width="124" height="12" rx="2" />
          <rect x="370" y="48" width="80" height="14" rx="2" />
          <path d="M390 180 V120 A20 20 0 0 1 430 120 V180 Z" fill="#FFF7EF" />

          {/* Parliament / Classical Colonnade Dome (Center-Right) */}
          <path d="M720 180 V110 A50 50 0 0 1 820 110 V180 Z" />
          <rect x="710" y="110" width="120" height="8" rx="2" />
          <polygon points="770 75, 765 110, 775 110" />

          {/* Taj Mahal Central Dome & Side Minarets (Right-Center) */}
          <path d="M1020 180 V105 Q1060 65 1100 105 V180 Z" />
          <polygon points="1060 50, 1055 68, 1065 68" />
          <path d="M980 180 L983 75 L987 75 L990 180 Z" />
          <path d="M1130 180 L1133 75 L1137 75 L1140 180 Z" />

          {/* Heritage Fort Towers (Far Right) */}
          <path d="M1300 180 V115 Q1320 95 1340 115 V180 Z" />
        </g>

        {/* ================================================================== */}
        {/* MIDDLE LAYER: Muted Terracotta Silhouettes (#C8705C)                */}
        {/* ================================================================== */}
        <g fill="#C8705C" opacity="0.9">
          {/* Heritage Chhatri / Pavilion (Left) */}
          <rect x="110" y="130" width="30" height="50" />
          <path d="M105 130 Q125 110 145 130 Z" />
          <polygon points="125 100, 122 112, 128 112" />

          {/* Gateway Arch (Center-Left) */}
          <rect x="490" y="100" width="70" height="80" />
          <path d="M510 180 V130 A15 15 0 0 1 540 130 V180 Z" fill="#FFF7EF" />
          <rect x="482" y="90" width="86" height="10" rx="1" />

          {/* Taj Mahal Main Facade & Side Domes (Right-Center) */}
          <rect x="1030" y="125" width="60" height="55" />
          <path d="M1045 180 V140 A15 15 0 0 1 1075 140 V180 Z" fill="#FFF7EF" />
          <path d="M1015 135 Q1030 118 1045 135 Z" />
          <path d="M1075 135 Q1090 118 1105 135 Z" />

          {/* Fort Battlement Wall (Far Right) */}
          <rect x="1220" y="120" width="140" height="60" />
          {/* Crenellations */}
          <rect x="1225" y="112" width="12" height="10" />
          <rect x="1245" y="112" width="12" height="10" />
          <rect x="1265" y="112" width="12" height="10" />
          <rect x="1285" y="112" width="12" height="10" />
          <rect x="1305" y="112" width="12" height="10" />
          <rect x="1325" y="112" width="12" height="10" />
          <rect x="1345" y="112" width="12" height="10" />
        </g>

        {/* ================================================================== */}
        {/* FRONT LAYER: Primary Terracotta Monuments (#A94F3D)                 */}
        {/* ================================================================== */}
        <g fill="#A94F3D">
          {/* Base Horizon Line */}
          <rect x="0" y="176" width="1440" height="4" />

          {/* Red Fort Central Gate & Towers (Left Side) */}
          <rect x="0" y="145" width="90" height="35" />
          {/* Crenellations */}
          <rect x="5" y="137" width="10" height="10" />
          <rect x="23" y="137" width="10" height="10" />
          <rect x="41" y="137" width="10" height="10" />
          <rect x="59" y="137" width="10" height="10" />
          <rect x="77" y="137" width="10" height="10" />

          {/* India Gate Foreground Arch (Center-Left) */}
          <rect x="375" y="85" width="70" height="95" />
          <rect x="365" y="75" width="90" height="12" rx="2" />
          <rect x="382" y="65" width="56" height="12" rx="2" />
          <path d="M395 180 V130 A15 15 0 0 1 425 130 V180 Z" fill="#FFF7EF" />

          {/* High Heritage Dome (Center) */}
          <path d="M620 180 V135 Q645 110 670 135 V180 Z" />
          <polygon points="645 92, 642 110, 648 110" />
          <rect x="612" y="135" width="56" height="6" rx="1" />

          {/* Classical Columned Monument (Center-Right) */}
          <rect x="850" y="130" width="110" height="50" />
          <rect x="840" y="122" width="130" height="10" rx="1" />
          <path d="M880 180 V145 A12 12 0 0 1 904 145 V180 Z" fill="#FFF7EF" />
          <path d="M916 180 V145 A12 12 0 0 1 940 145 V180 Z" fill="#FFF7EF" />

          {/* Gateway Turret (Far Right) */}
          <rect x="1370" y="135" width="70" height="45" />
          <path d="M1385 135 Q1405 115 1425 135 Z" />
          <polygon points="1405 102, 1402 116, 1408 116" />
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
      className={`w-full bg-[#FFF7EF] border-t border-[#E8D4C5] transition-all duration-150 text-[#3A2A25] select-none ${
        isDashboardRoute ? "lg:ml-[var(--sp-sidebar-width,256px)]" : "w-full"
      }`}
      aria-label="Site Footer"
    >
      {/* 1. Top Terracotta/Orange Line */}
      <div className="h-[2px] w-full bg-[#E85D2A]" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
        {/* 2. Main Content Grid (3 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-8">
          
          {/* Column 1: BRAND */}
          <div className="lg:col-span-6 flex flex-col gap-3 pr-0 lg:pr-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group w-fit">
              <SkillPulseLogoMark className="h-8 w-8 shrink-0 transition-transform group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-[#3A2A25] leading-none">
                  Skill<span className="text-[#E85D2A]">Pulse</span>
                </span>
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[#A94F3D] leading-tight mt-0.5">
                  Workforce Intelligence
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-[#75645D] leading-relaxed max-w-md mt-1">
              Evidence-driven skill and workforce intelligence for better decisions.
            </p>
          </div>

          {/* Column 2: PLATFORM */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A94F3D] mb-3.5 border-b border-[#E8D4C5] pb-1.5 w-fit">
              Platform
            </h3>
            <ul className="flex flex-col gap-2">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-[#3A2A25] transition-colors duration-150 hover:text-[#E85D2A] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: RESOURCES */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A94F3D] mb-3.5 border-b border-[#E8D4C5] pb-1.5 w-fit">
              Resources
            </h3>
            <ul className="flex flex-col gap-2">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-xs sm:text-sm text-[#3A2A25] transition-colors duration-150 hover:text-[#E85D2A] focus-visible:outline-2 focus-visible:outline-[#E85D2A]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 3. Copyright & Utility Links Bar */}
        <div className="border-t border-[#E8D4C5] pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#75645D]">
          <p>© {currentYear} SkillPulse. All rights reserved.</p>
          <div className="flex items-center gap-4">
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

      {/* 4. Indian Landmark Architectural Skyline Illustration Strip */}
      <IndianLandmarkSkyline />
    </footer>
  );
}
