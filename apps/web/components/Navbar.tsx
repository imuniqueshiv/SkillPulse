"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useAuth,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

interface ISpeechRecognitionResult {
  0: { transcript: string };
  length: number;
}
interface ISpeechRecognitionResultList {
  [index: number]: ISpeechRecognitionResult;
  length: number;
}
interface ISpeechRecognitionEvent {
  results: ISpeechRecognitionResultList;
  error?: string;
}
interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

/* -------------------------------------------------------------------------- */
/*                                SVG Icons                                   */
/* -------------------------------------------------------------------------- */

function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="36" height="36" rx="10" fill="#E85D2A" />
      {/* Abstract SkillPulse Signal & Network Nodes */}
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

function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BarChartNavIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  );
}

function GraduationCapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function TrendingUpNavIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function LightbulbNavIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.6 2.97 1.5 4 .76.76 1.23 1.52 1.41 2.5" />
    </svg>
  );
}

function GridNavIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ChevronDownIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MicIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// Section Item Icons
function BriefcaseIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function LayoutDashboardIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Navigation Configuration                           */
/* -------------------------------------------------------------------------- */

interface NavItem {
  label: string;
  href: string;
  description: string;
  icon: React.ReactNode;
}

const INTELLIGENCE_ITEMS: NavItem[] = [
  {
    label: "Labour Market & Jobs",
    href: "/jobs",
    description: "Real-time hiring demand, employer openings & qualifications",
    icon: <BriefcaseIcon />,
  },
  {
    label: "Skill Intelligence",
    href: "/skills",
    description: "Standardized taxonomy, demand volume & coverage analysis",
    icon: <ZapIcon />,
  },
  {
    label: "Skill Gaps & Disparities",
    href: "/gaps",
    description: "Supply-demand deficit evaluation & regional heatmaps",
    icon: <BarChartIcon />,
  },
  {
    label: "Employer Network",
    href: "/employers",
    description: "Industry hiring partners providing live demand validation",
    icon: <BuildingIcon />,
  },
];

const TRAINING_ITEMS: NavItem[] = [
  {
    label: "Course Catalog & Programs",
    href: "/courses",
    description: "NSQF-aligned courses, training institutes & completion metrics",
    icon: <BookOpenIcon />,
  },
  {
    label: "Curricula & Qualification Packs",
    href: "/curricula",
    description: "Structured learning pathways, modules & competency milestones",
    icon: <LayersIcon />,
  },
];

const DASHBOARDS_ITEMS: NavItem[] = [
  {
    label: "Overview Dashboard",
    href: "/dashboard",
    description: "Executive KPI metrics, demand trends & live intelligence stream",
    icon: <LayoutDashboardIcon />,
  },
  {
    label: "Settings & Preferences",
    href: "/settings",
    description: "Profile configuration, notification alerts & API controls",
    icon: <SettingsIcon />,
  },
];

/* -------------------------------------------------------------------------- */
/*                              Component                                     */
/* -------------------------------------------------------------------------- */

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // State
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  // Close menus on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Global keyboard shortcuts (⌘K or Ctrl+K for search, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
        if (searchInputRef.current) {
          searchInputRef.current.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Dropdown Hover / Focus
  const handleDropdownToggle = (key: string) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  };

  const handleMouseEnter = (key: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(key);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  // Search Submit
  const executeSearch = (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    const encoded = encodeURIComponent(trimmed);
    setSearchQuery("");
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
    router.push(`/skills?q=${encoded}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  // Browser Speech Recognition Logic for Voice Search
  const toggleVoiceSearch = () => {
    setVoiceErrorMessage(null);

    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceErrorMessage("Voice search is not supported in this browser.");
      setTimeout(() => setVoiceErrorMessage(null), 4000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceErrorMessage(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const results = event.results;
        let transcript = "";
        for (let i = 0; i < results.length; i++) {
          transcript += results[i][0].transcript;
        }
        setSearchQuery(transcript);
      };

      recognition.onerror = (event: ISpeechRecognitionEvent) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setVoiceErrorMessage("Microphone permission is required for voice search.");
        } else if (event.error === "no-speech") {
          setVoiceErrorMessage("No speech detected. Please try again.");
        } else {
          setVoiceErrorMessage("Voice search is not supported or failed.");
        }
        setTimeout(() => setVoiceErrorMessage(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (searchQuery.trim()) {
          executeSearch(searchQuery);
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceErrorMessage("Voice search is not supported in this browser.");
      setTimeout(() => setVoiceErrorMessage(null), 4000);
    }
  };

  // Check if a section or link is active
  const isIntelligenceActive = INTELLIGENCE_ITEMS.some((item) => pathname.startsWith(item.href));
  const isTrainingActive = TRAINING_ITEMS.some((item) => pathname.startsWith(item.href));
  const isDashboardsActive = DASHBOARDS_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 w-full bg-gradient-to-b from-[#FFF8F2] via-[#FFF5EE]/90 to-[#FFF8F2]/60 pb-3.5 pt-2.5 relative select-none border-b border-[#E5D9D0]/50 shadow-xs overflow-hidden"
    >
      {/* ------------------------------------------------------------------ */}
      {/* BACKGROUND DECORATIONS (Soft arcs, wave background & pulse line)  */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft pale orange bottom-left arc */}
        <div className="absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-gradient-to-tr from-[#FFF0E8] via-[#FAD5C2]/40 to-transparent blur-2xl opacity-80" />
        
        {/* Soft top-right cream/orange wave circle */}
        <div className="absolute -right-12 -top-16 w-80 h-80 rounded-full bg-gradient-to-bl from-[#FFF0E8] via-[#FAD5C2]/30 to-transparent blur-3xl opacity-80" />

        {/* Integrated SkillPulse Workforce Pulse / Data Signal Line */}
        <svg
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-14 opacity-20 pointer-events-none"
          viewBox="0 0 1440 48"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 24 H400 L420 14 L440 34 L460 6 L480 40 L500 18 L520 28 L540 24 H900 L920 12 L940 36 L960 16 L980 32 L1000 24 H1440"
            stroke="#E85D2A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Subtle Institutional Watermark Backdrop (Right side) */}
        <div className="hidden lg:flex flex-col items-end absolute right-8 top-3 pointer-events-none opacity-30 select-none">
          <span className="text-[0.625rem] font-serif italic tracking-wider text-[#64748B] uppercase">
            Empowering
          </span>
          <span className="text-[0.6875rem] font-medium tracking-tight text-[#E85D2A]">
            Maharashtra&apos;s Workforce
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FLOATING SOFT NAVBAR CONTAINER                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E5D9D0] rounded-full sm:rounded-[32px] px-4 sm:px-6 py-2 flex items-center justify-between gap-3 shadow-[0_8px_25px_-4px_rgba(232,93,42,0.06),0_3px_10px_rgba(0,0,0,0.03)] h-[62px] transition-all duration-200">
          
          {/* ================================================================ */}
          {/* Left: SkillPulse Logo & Institutional Brand                      */}
          {/* ================================================================ */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D2A] rounded-full py-1 pr-2"
              aria-label="SkillPulse Home"
            >
              <LogoIcon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 transition-transform group-hover:scale-105 duration-200 shadow-xs" />
              <div className="flex flex-col">
                <span className="text-[1.125rem] sm:text-[1.25rem] font-bold tracking-tight text-[#1F2933] leading-none">
                  Skill<span className="text-[#E85D2A]">Pulse</span>
                </span>
                <span className="text-[0.5625rem] sm:text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-[#64748B] leading-tight mt-0.5 hidden sm:block">
                  Workforce Intelligence
                </span>
              </div>
            </Link>

            {/* Subtle Brand Tagline Badge */}
            <div className="hidden 2xl:flex items-center pl-3 border-l border-[#E5D9D0] h-7">
              <span className="text-[#E85D2A] text-[0.75rem] font-serif italic tracking-wide opacity-90 whitespace-nowrap">
                Skills Stronger Futures
              </span>
            </div>
          </div>

          {/* ================================================================ */}
          {/* Center: Desktop Navigation Links & Dropdowns                    */}
          {/* ================================================================ */}
          <nav
            className="hidden xl:flex items-center gap-1.5"
            role="navigation"
            aria-label="Main Navigation"
          >
            {/* 1. Home */}
            <Link
              href="/"
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative inline-flex items-center gap-1.5 ${
                pathname === "/"
                  ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2] shadow-2xs"
                  : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
              }`}
            >
              <HomeIcon className={`w-4 h-4 ${pathname === "/" ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
              Home
              {pathname === "/" && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
              )}
            </Link>

            {/* 2. Intelligence Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("intelligence")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => handleDropdownToggle("intelligence")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative ${
                  isIntelligenceActive || activeDropdown === "intelligence"
                    ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                    : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
                }`}
                aria-expanded={activeDropdown === "intelligence"}
                aria-haspopup="true"
              >
                <BarChartNavIcon className={`w-4 h-4 ${isIntelligenceActive ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
                Intelligence
                <ChevronDownIcon className={activeDropdown === "intelligence" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"} />
                {isIntelligenceActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
                )}
              </button>

              {activeDropdown === "intelligence" && (
                <div
                  className="absolute left-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E5D9D0] rounded-2xl shadow-[0_12px_30px_-5px_rgba(232,93,42,0.1),0_4px_12px_rgba(0,0,0,0.05)] py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Intelligence menu"
                >
                  <div className="px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E5D9D0]/60 mb-1">
                    Workforce & Skill Intelligence
                  </div>
                  {INTELLIGENCE_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3.5 py-2.5 text-xs rounded-xl mx-1 transition-colors duration-150 ${
                          isItemActive ? "bg-[#FFF0E8] text-[#E85D2A]" : "text-[#1F2933] hover:bg-[#FFF8F2]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-lg mt-0.5 shrink-0 transition-colors ${
                            isItemActive ? "bg-[#E85D2A] text-white" : "bg-[#FFF0E8] text-[#E85D2A]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#1F2933] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#64748B] mt-0.5 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Training & Curriculum Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("training")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => handleDropdownToggle("training")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative ${
                  isTrainingActive || activeDropdown === "training"
                    ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                    : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
                }`}
                aria-expanded={activeDropdown === "training"}
                aria-haspopup="true"
              >
                <GraduationCapIcon className={`w-4 h-4 ${isTrainingActive ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
                Training & Curriculum
                <ChevronDownIcon className={activeDropdown === "training" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"} />
                {isTrainingActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
                )}
              </button>

              {activeDropdown === "training" && (
                <div
                  className="absolute left-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E5D9D0] rounded-2xl shadow-[0_12px_30px_-5px_rgba(232,93,42,0.1),0_4px_12px_rgba(0,0,0,0.05)] py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Training menu"
                >
                  <div className="px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E5D9D0]/60 mb-1">
                    Learning Pathways & Standards
                  </div>
                  {TRAINING_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3.5 py-2.5 text-xs rounded-xl mx-1 transition-colors duration-150 ${
                          isItemActive ? "bg-[#FFF0E8] text-[#E85D2A]" : "text-[#1F2933] hover:bg-[#FFF8F2]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-lg mt-0.5 shrink-0 transition-colors ${
                            isItemActive ? "bg-[#E85D2A] text-white" : "bg-[#FFF0E8] text-[#E85D2A]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#1F2933] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#64748B] mt-0.5 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Outcomes */}
            <Link
              href="/outcomes"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative inline-flex items-center gap-1.5 ${
                pathname.startsWith("/outcomes")
                  ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                  : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
              }`}
            >
              <TrendingUpNavIcon className={`w-4 h-4 ${pathname.startsWith("/outcomes") ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
              Outcomes
              {pathname.startsWith("/outcomes") && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
              )}
            </Link>

            {/* 5. Recommendations */}
            <Link
              href="/recommendations"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative inline-flex items-center gap-1.5 ${
                pathname.startsWith("/recommendations")
                  ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                  : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
              }`}
            >
              <LightbulbNavIcon className={`w-4 h-4 ${pathname.startsWith("/recommendations") ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
              Recommendations
              {pathname.startsWith("/recommendations") && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
              )}
            </Link>

            {/* 6. Dashboards Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("dashboards")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                onClick={() => handleDropdownToggle("dashboards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 relative ${
                  isDashboardsActive || activeDropdown === "dashboards"
                    ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                    : "text-[#1F2933] hover:text-[#E85D2A] hover:bg-[#FFF0E8]/60"
                }`}
                aria-expanded={activeDropdown === "dashboards"}
                aria-haspopup="true"
              >
                <GridNavIcon className={`w-4 h-4 ${isDashboardsActive ? "text-[#E85D2A]" : "text-[#64748B]"}`} />
                Dashboards
                <ChevronDownIcon className={activeDropdown === "dashboards" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"} />
                {isDashboardsActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E85D2A] rounded-full shadow-xs" />
                )}
              </button>

              {activeDropdown === "dashboards" && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-[#FFFFFF] border border-[#E5D9D0] rounded-2xl shadow-[0_12px_30px_-5px_rgba(232,93,42,0.1),0_4px_12px_rgba(0,0,0,0.05)] py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Dashboards menu"
                >
                  <div className="px-3.5 py-1.5 text-[0.6875rem] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#E5D9D0]/60 mb-1">
                    Stakeholder Views & Control
                  </div>
                  {DASHBOARDS_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3.5 py-2.5 text-xs rounded-xl mx-1 transition-colors duration-150 ${
                          isItemActive ? "bg-[#FFF0E8] text-[#E85D2A]" : "text-[#1F2933] hover:bg-[#FFF8F2]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-lg mt-0.5 shrink-0 transition-colors ${
                            isItemActive ? "bg-[#E85D2A] text-white" : "bg-[#FFF0E8] text-[#E85D2A]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#1F2933] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#64748B] mt-0.5 leading-normal">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* ================================================================ */}
          {/* Right: Search + Auth + Actions                                  */}
          {/* ================================================================ */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Desktop Search Bar with Voice Microphone */}
            <div className="relative hidden md:flex flex-col items-end">
              <form
                onSubmit={handleSearchSubmit}
                className="relative flex items-center"
                role="search"
              >
                <label htmlFor="nav-search-input" className="sr-only">
                  Search skills, roles, courses
                </label>
                <SearchIcon className="absolute left-3.5 w-4 h-4 text-[#64748B] pointer-events-none" />
                <input
                  id="nav-search-input"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={isListening ? "Listening..." : "Search skills, roles, courses..."}
                  className={`w-40 lg:w-56 xl:w-64 pl-9 pr-10 py-1.5 text-xs bg-[#FFFFFF] border rounded-full transition-all duration-150 text-[#1F2933] placeholder-[#64748B] shadow-2xs ${
                    isListening
                      ? "border-[#E85D2A] ring-2 ring-[#E85D2A]/30 bg-[#FFF0E8]"
                      : isSearchFocused
                      ? "border-[#E85D2A] ring-2 ring-[#E85D2A]/20 w-52 lg:w-64 xl:w-72 bg-[#FFFCF9]"
                      : "border-[#E5D9D0] hover:border-[#F28C5B]"
                  }`}
                />
                
                {/* Micro vertical divider & Voice Search Microphone Button */}
                <div className="absolute right-2 flex items-center gap-1">
                  <span className="h-3.5 w-[1px] bg-[#E5D9D0]" />
                  <button
                    type="button"
                    onClick={toggleVoiceSearch}
                    aria-label={isListening ? "Stop voice search" : "Start voice search"}
                    title={isListening ? "Listening... Click to stop" : "Start voice search"}
                    className={`p-1 rounded-full transition-all duration-150 ${
                      isListening
                        ? "text-[#DC2626] bg-[#FEE2E2] animate-pulse ring-2 ring-[#EF4444]"
                        : "text-[#E85D2A] hover:bg-[#FFF0E8]"
                    }`}
                  >
                    <MicIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Voice Error Notification Popup */}
              {voiceErrorMessage && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-[#1E293B] text-white text-[0.7rem] px-2.5 py-1 rounded-lg shadow-md whitespace-nowrap animate-in fade-in">
                  {voiceErrorMessage}
                </div>
              )}
            </div>

            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 text-[#64748B] hover:text-[#1F2933] hover:bg-[#FFF0E8] rounded-full transition-colors"
              aria-label="Toggle search input"
            >
              <SearchIcon className="w-5 h-5" />
            </button>

            {/* Authentication States via Clerk */}
            {isLoaded && !isSignedIn && (
              <div className="flex items-center gap-2 shrink-0">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="whitespace-nowrap px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#E85D2A] border border-[#E85D2A] bg-white hover:bg-[#FFF0E8] rounded-full transition-all duration-150 cursor-pointer shrink-0 shadow-2xs"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="whitespace-nowrap px-4 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#E85D2A] hover:bg-[#C94A20] rounded-full transition-all duration-150 shadow-xs cursor-pointer shrink-0"
                  >
                    Register
                  </button>
                </SignUpButton>
              </div>
            )}

            {isLoaded && isSignedIn && (
              <div className="flex items-center gap-2.5 shrink-0">
                {/* Notification Bell */}
                <button
                  type="button"
                  className="relative p-2 text-[#64748B] hover:text-[#1F2933] hover:bg-[#FFF0E8] rounded-full transition-colors"
                  aria-label="View notifications"
                >
                  <BellIcon className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#E85D2A] rounded-full ring-2 ring-white" />
                </button>

                {/* Quick Dashboard Shortcut (if not on dashboard) */}
                {!pathname.startsWith("/dashboard") && (
                  <Link
                    href="/dashboard"
                    className="hidden lg:inline-flex items-center gap-1.5 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-[#E85D2A] hover:bg-[#C94A20] rounded-full transition-colors shadow-xs whitespace-nowrap"
                  >
                    <LayoutDashboardIcon />
                    Dashboard
                  </Link>
                )}

                {/* Clerk User Button */}
                <div className="flex items-center pl-1 shrink-0">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 border border-[#E5D9D0] rounded-full",
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 text-[#1F2933] hover:bg-[#FFF0E8] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#E85D2A]"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Mobile Expandable Search Bar with Voice Control                  */}
        {/* ================================================================ */}
        {mobileSearchOpen && (
          <div className="md:hidden mt-2 py-2 px-1 animate-in fade-in duration-150">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <label htmlFor="mobile-search-input" className="sr-only">
                Search skills, roles, courses
              </label>
              <SearchIcon className="absolute left-3.5 w-4 h-4 text-[#64748B] pointer-events-none" />
              <input
                id="mobile-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isListening ? "Listening..." : "Search skills, roles, courses..."}
                autoFocus
                className={`w-full pl-9 pr-14 py-2 text-xs bg-[#FFFFFF] border rounded-full text-[#1F2933] focus:outline-none shadow-xs ${
                  isListening
                    ? "border-[#E85D2A] ring-2 ring-[#E85D2A]/30 bg-[#FFF0E8]"
                    : "border-[#E5D9D0] focus:border-[#E85D2A] focus:ring-2 focus:ring-[#E85D2A]/20"
                }`}
              />
              
              {/* Voice Microphone Button for Mobile */}
              <button
                type="button"
                onClick={toggleVoiceSearch}
                aria-label={isListening ? "Stop voice search" : "Start voice search"}
                className={`absolute right-3 p-1 rounded-full transition-all ${
                  isListening
                    ? "text-[#DC2626] bg-[#FEE2E2] animate-pulse ring-2 ring-[#EF4444]"
                    : "text-[#E85D2A] hover:bg-[#FFF0E8]"
                }`}
              >
                <MicIcon className="w-4 h-4" />
              </button>
            </form>

            {voiceErrorMessage && (
              <div className="mt-1 text-[0.7rem] text-[#DC2626] px-2 font-medium">
                {voiceErrorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Mobile Navigation Drawer / Overlay                               */}
      {/* ================================================================ */}
      {mobileMenuOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-full max-w-xs bg-[#FFFFFF] h-full shadow-2xl border-r border-[#E5D9D0] overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#E5D9D0] bg-[#FFF8F2]">
              <div className="flex items-center gap-2.5">
                <LogoIcon className="w-7 h-7 shrink-0" />
                <span className="font-bold text-base text-[#1F2933]">
                  Skill<span className="text-[#E85D2A]">Pulse</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#64748B] hover:text-[#1F2933] rounded-full hover:bg-[#FFF0E8]"
                aria-label="Close menu"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 px-4 py-4 space-y-1.5">
              {/* Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  pathname === "/" ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]" : "text-[#1F2933] hover:bg-[#FFF8F2]"
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>

              {/* Intelligence Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileAccordion((prev) => (prev === "intelligence" ? null : "intelligence"))
                  }
                  className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium text-[#1F2933] hover:bg-[#FFF8F2] rounded-xl"
                >
                  <span className={`flex items-center gap-2.5 ${isIntelligenceActive ? "font-semibold text-[#E85D2A]" : ""}`}>
                    <BarChartNavIcon className="w-4 h-4" />
                    Intelligence
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "intelligence" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"}
                  />
                </button>
                {mobileAccordion === "intelligence" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#E85D2A] ml-4 mt-1">
                    {INTELLIGENCE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg ${
                          pathname === item.href
                            ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold"
                            : "text-[#64748B] hover:bg-[#FFF8F2] hover:text-[#1F2933]"
                        }`}
                      >
                        <span className="text-[#E85D2A]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Training & Curriculum Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileAccordion((prev) => (prev === "training" ? null : "training"))
                  }
                  className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium text-[#1F2933] hover:bg-[#FFF8F2] rounded-xl"
                >
                  <span className={`flex items-center gap-2.5 ${isTrainingActive ? "font-semibold text-[#E85D2A]" : ""}`}>
                    <GraduationCapIcon className="w-4 h-4" />
                    Training & Curriculum
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "training" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"}
                  />
                </button>
                {mobileAccordion === "training" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#E85D2A] ml-4 mt-1">
                    {TRAINING_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg ${
                          pathname === item.href
                            ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold"
                            : "text-[#64748B] hover:bg-[#FFF8F2] hover:text-[#1F2933]"
                        }`}
                      >
                        <span className="text-[#E85D2A]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Outcomes */}
              <Link
                href="/outcomes"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  pathname.startsWith("/outcomes")
                    ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                    : "text-[#1F2933] hover:bg-[#FFF8F2]"
                }`}
              >
                <TrendingUpNavIcon className="w-4 h-4" />
                Outcomes
              </Link>

              {/* Recommendations */}
              <Link
                href="/recommendations"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  pathname.startsWith("/recommendations")
                    ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold border border-[#FAD5C2]"
                    : "text-[#1F2933] hover:bg-[#FFF8F2]"
                }`}
              >
                <LightbulbNavIcon className="w-4 h-4" />
                Recommendations
              </Link>

              {/* Dashboards Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileAccordion((prev) => (prev === "dashboards" ? null : "dashboards"))
                  }
                  className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm font-medium text-[#1F2933] hover:bg-[#FFF8F2] rounded-xl"
                >
                  <span className={`flex items-center gap-2.5 ${isDashboardsActive ? "font-semibold text-[#E85D2A]" : ""}`}>
                    <GridNavIcon className="w-4 h-4" />
                    Dashboards
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "dashboards" ? "rotate-180 text-[#E85D2A]" : "text-[#64748B]"}
                  />
                </button>
                {mobileAccordion === "dashboards" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#E85D2A] ml-4 mt-1">
                    {DASHBOARDS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg ${
                          pathname === item.href
                            ? "bg-[#FFF0E8] text-[#E85D2A] font-semibold"
                            : "text-[#64748B] hover:bg-[#FFF8F2] hover:text-[#1F2933]"
                        }`}
                      >
                        <span className="text-[#E85D2A]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Auth Bottom Section */}
            <div className="p-4 border-t border-[#E5D9D0] bg-[#FFF8F2]">
              {isLoaded && !isSignedIn && (
                <div className="flex flex-row gap-2">
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="flex-1 py-2 text-xs font-semibold text-[#E85D2A] border border-[#E85D2A] rounded-full bg-white hover:bg-[#FFF0E8] transition-colors whitespace-nowrap shadow-2xs"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="flex-1 py-2 text-xs font-semibold text-white bg-[#E85D2A] hover:bg-[#C94A20] rounded-full transition-colors shadow-xs whitespace-nowrap"
                    >
                      Register
                    </button>
                  </SignUpButton>
                </div>
              )}

              {isLoaded && isSignedIn && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <UserButton />
                    <span className="text-xs font-medium text-[#1F2933]">My Account</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#E85D2A] rounded-full hover:bg-[#C94A20] whitespace-nowrap shadow-xs"
                  >
                    Dashboard
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
