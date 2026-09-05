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

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

/* -------------------------------------------------------------------------- */
/*                                SVG Icons                                   */
/* -------------------------------------------------------------------------- */

function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect width="32" height="32" rx="6" fill="#003B73" />
      {/* Waveform / Network nodes representing skill intelligence */}
      <path
        d="M6 18H10L13 9L17 23L21 14L23 18H26"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="9" r="2" fill="#60A5FA" />
      <circle cx="17" cy="23" r="2" fill="#93C5FD" />
      <circle cx="21" cy="14" r="2" fill="#60A5FA" />
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
  const recognitionRef = useRef<any>(null);

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
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
      // Escape closes dropdowns and mobile menus
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

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setSearchQuery(transcript);
      };

      recognition.onerror = (event: any) => {
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
      className="sticky top-0 z-50 w-full bg-[#FFFFFF] border-b border-[#D1D5DB] shadow-sm select-none"
    >
      {/* Official Government Portal Style Top Accent Stripe */}
      <div className="h-[3px] w-full bg-[#003B73]" />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[60px] gap-4">
          {/* ================================================================ */}
          {/* Left: SkillPulse Logo & Institutional Brand                      */}
          {/* ================================================================ */}
          <div className="flex items-center gap-6 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#005A9C] rounded-md py-1"
              aria-label="SkillPulse Home"
            >
              <LogoIcon className="w-8 h-8 shrink-0 transition-transform group-hover:scale-105 duration-150" />
              <div className="flex flex-col">
                <span className="text-[1.125rem] font-bold tracking-tight text-[#111827] leading-none">
                  Skill<span className="text-[#005A9C]">Pulse</span>
                </span>
                <span className="text-[0.625rem] font-medium uppercase tracking-[0.08em] text-[#6B7280] leading-tight mt-0.5 hidden sm:block">
                  Workforce Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* ================================================================ */}
          {/* Center: Desktop Navigation Links & Dropdowns                    */}
          {/* ================================================================ */}
          <nav
            className="hidden xl:flex items-center gap-1"
            role="navigation"
            aria-label="Main Navigation"
          >
            {/* 1. Home */}
            <Link
              href="/"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                pathname === "/"
                  ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                  : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
              }`}
            >
              Home
              {pathname === "/" && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                  isIntelligenceActive || activeDropdown === "intelligence"
                    ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                    : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
                }`}
                aria-expanded={activeDropdown === "intelligence"}
                aria-haspopup="true"
              >
                Intelligence
                <ChevronDownIcon className={activeDropdown === "intelligence" ? "rotate-180" : ""} />
                {isIntelligenceActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
                )}
              </button>

              {activeDropdown === "intelligence" && (
                <div
                  className="absolute left-0 mt-1 w-80 bg-white border border-[#D1D5DB] rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Intelligence menu"
                >
                  <div className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] mb-1">
                    Workforce & Skill Intelligence
                  </div>
                  {INTELLIGENCE_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3 py-2.5 text-xs transition-colors duration-150 ${
                          isItemActive ? "bg-[#F0F5FA] text-[#003B73]" : "text-[#1F2937] hover:bg-[#F5F7FA]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                            isItemActive ? "bg-[#005A9C] text-white" : "bg-[#F3F4F6] text-[#005A9C]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#111827] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#6B7280] mt-0.5 leading-normal">
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                  isTrainingActive || activeDropdown === "training"
                    ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                    : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
                }`}
                aria-expanded={activeDropdown === "training"}
                aria-haspopup="true"
              >
                Training & Curriculum
                <ChevronDownIcon className={activeDropdown === "training" ? "rotate-180" : ""} />
                {isTrainingActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
                )}
              </button>

              {activeDropdown === "training" && (
                <div
                  className="absolute left-0 mt-1 w-80 bg-white border border-[#D1D5DB] rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Training menu"
                >
                  <div className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] mb-1">
                    Learning Pathways & Standards
                  </div>
                  {TRAINING_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3 py-2.5 text-xs transition-colors duration-150 ${
                          isItemActive ? "bg-[#F0F5FA] text-[#003B73]" : "text-[#1F2937] hover:bg-[#F5F7FA]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                            isItemActive ? "bg-[#005A9C] text-white" : "bg-[#F3F4F6] text-[#005A9C]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#111827] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#6B7280] mt-0.5 leading-normal">
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
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                pathname.startsWith("/outcomes")
                  ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                  : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
              }`}
            >
              Outcomes
              {pathname.startsWith("/outcomes") && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
              )}
            </Link>

            {/* 5. Recommendations */}
            <Link
              href="/recommendations"
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                pathname.startsWith("/recommendations")
                  ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                  : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
              }`}
            >
              Recommendations
              {pathname.startsWith("/recommendations") && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
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
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 relative ${
                  isDashboardsActive || activeDropdown === "dashboards"
                    ? "text-[#003B73] font-semibold bg-[#F0F5FA]"
                    : "text-[#1F2937] hover:text-[#003B73] hover:bg-[#F5F7FA]"
                }`}
                aria-expanded={activeDropdown === "dashboards"}
                aria-haspopup="true"
              >
                Dashboards
                <ChevronDownIcon className={activeDropdown === "dashboards" ? "rotate-180" : ""} />
                {isDashboardsActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#005A9C] rounded-full" />
                )}
              </button>

              {activeDropdown === "dashboards" && (
                <div
                  className="absolute right-0 mt-1 w-80 bg-white border border-[#D1D5DB] rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  role="menu"
                  aria-label="Dashboards menu"
                >
                  <div className="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] mb-1">
                    Stakeholder Views & Control
                  </div>
                  {DASHBOARDS_ITEMS.map((item) => {
                    const isItemActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className={`flex items-start gap-3 px-3 py-2.5 text-xs transition-colors duration-150 ${
                          isItemActive ? "bg-[#F0F5FA] text-[#003B73]" : "text-[#1F2937] hover:bg-[#F5F7FA]"
                        }`}
                      >
                        <span
                          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                            isItemActive ? "bg-[#005A9C] text-white" : "bg-[#F3F4F6] text-[#005A9C]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <p className="font-semibold text-sm text-[#111827] leading-snug">
                            {item.label}
                          </p>
                          <p className="text-[0.75rem] text-[#6B7280] mt-0.5 leading-normal">
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
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                <SearchIcon className="absolute left-3 w-4 h-4 text-[#6B7280] pointer-events-none" />
                <input
                  id="nav-search-input"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder={isListening ? "Listening..." : "Search skills, roles, courses..."}
                  className={`w-44 lg:w-60 pl-9 pr-9 py-1.5 text-xs bg-[#FFFFFF] border rounded-md transition-all duration-150 text-[#1F2937] placeholder-[#6B7280] ${
                    isListening
                      ? "border-[#005A9C] ring-2 ring-[#005A9C]/30 bg-[#F0F5FA]"
                      : isSearchFocused
                      ? "border-[#005A9C] ring-2 ring-[#005A9C]/20 w-56 lg:w-68"
                      : "border-[#D1D5DB] hover:border-[#9CA3AF]"
                  }`}
                />
                
                {/* Voice Search Microphone Button inside Search Bar */}
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  aria-label={isListening ? "Stop voice search" : "Start voice search"}
                  title={isListening ? "Listening... Click to stop" : "Start voice search"}
                  className={`absolute right-2 p-1 rounded-full transition-all duration-150 ${
                    isListening
                      ? "text-[#DC2626] bg-[#FEE2E2] animate-pulse ring-2 ring-[#EF4444]"
                      : "text-[#6B7280] hover:text-[#003B73] hover:bg-[#F3F4F6]"
                  }`}
                >
                  <MicIcon className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Voice Error Notification Popup */}
              {voiceErrorMessage && (
                <div className="absolute top-full right-0 mt-1 z-50 bg-[#1E293B] text-white text-[0.7rem] px-2.5 py-1 rounded shadow-md whitespace-nowrap animate-in fade-in">
                  {voiceErrorMessage}
                </div>
              )}
            </div>

            {/* Mobile Search Icon Button */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
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
                    className="whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold text-[#005A9C] border border-[#005A9C] bg-white hover:bg-[#F0F5FA] rounded-md transition-colors duration-150 cursor-pointer shrink-0"
                  >
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button
                    type="button"
                    className="whitespace-nowrap px-3.5 py-1.5 text-xs font-semibold text-white bg-[#005A9C] hover:bg-[#003B73] rounded-md transition-colors duration-150 shadow-sm cursor-pointer shrink-0 hidden sm:block"
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
                  className="relative p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
                  aria-label="View notifications"
                >
                  <BellIcon className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#005A9C] rounded-full ring-2 ring-white" />
                </button>

                {/* Quick Dashboard Shortcut (if not on dashboard) */}
                {!pathname.startsWith("/dashboard") && (
                  <Link
                    href="/dashboard"
                    className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#005A9C] hover:bg-[#003B73] rounded-md transition-colors shadow-sm whitespace-nowrap"
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
                        avatarBox: "w-8 h-8 border border-[#D1D5DB]",
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
              className="xl:hidden p-2 text-[#1F2937] hover:bg-[#F3F4F6] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#005A9C]"
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
          <div className="md:hidden py-2.5 border-t border-[#E5E7EB] animate-in fade-in duration-150">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <label htmlFor="mobile-search-input" className="sr-only">
                Search skills, roles, courses
              </label>
              <SearchIcon className="absolute left-3 w-4 h-4 text-[#6B7280] pointer-events-none" />
              <input
                id="mobile-search-input"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isListening ? "Listening..." : "Search skills, roles, courses..."}
                autoFocus
                className={`w-full pl-9 pr-14 py-2 text-xs bg-[#FFFFFF] border rounded-md text-[#1F2937] focus:outline-none ${
                  isListening
                    ? "border-[#005A9C] ring-2 ring-[#005A9C]/30 bg-[#F0F5FA]"
                    : "border-[#D1D5DB] focus:border-[#005A9C] focus:ring-2 focus:ring-[#005A9C]/20"
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
                    : "text-[#6B7280] hover:text-[#003B73]"
                }`}
              >
                <MicIcon className="w-4 h-4" />
              </button>
            </form>

            {voiceErrorMessage && (
              <div className="mt-1 text-[0.7rem] text-[#DC2626] px-1 font-medium">
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
            className="fixed inset-0 bg-black/30 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-full max-w-xs bg-white h-full shadow-2xl border-r border-[#D1D5DB] overflow-y-auto animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#D1D5DB]">
              <div className="flex items-center gap-2">
                <LogoIcon className="w-7 h-7 shrink-0" />
                <span className="font-bold text-base text-[#111827]">
                  Skill<span className="text-[#005A9C]">Pulse</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-[#6B7280] hover:text-[#111827] rounded-md hover:bg-[#F3F4F6]"
                aria-label="Close menu"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex-1 px-4 py-4 space-y-1">
              {/* Home */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/" ? "bg-[#F0F5FA] text-[#003B73] font-semibold" : "text-[#1F2937] hover:bg-[#F5F7FA]"
                }`}
              >
                Home
              </Link>

              {/* Intelligence Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileAccordion((prev) => (prev === "intelligence" ? null : "intelligence"))
                  }
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-[#1F2937] hover:bg-[#F5F7FA] rounded-md"
                >
                  <span className={isIntelligenceActive ? "font-semibold text-[#003B73]" : ""}>
                    Intelligence
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "intelligence" ? "rotate-180" : ""}
                  />
                </button>
                {mobileAccordion === "intelligence" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#005A9C] ml-3 mt-1">
                    {INTELLIGENCE_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md ${
                          pathname === item.href
                            ? "bg-[#F0F5FA] text-[#003B73] font-semibold"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                        }`}
                      >
                        <span className="text-[#005A9C]">{item.icon}</span>
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
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-[#1F2937] hover:bg-[#F5F7FA] rounded-md"
                >
                  <span className={isTrainingActive ? "font-semibold text-[#003B73]" : ""}>
                    Training & Curriculum
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "training" ? "rotate-180" : ""}
                  />
                </button>
                {mobileAccordion === "training" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#005A9C] ml-3 mt-1">
                    {TRAINING_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md ${
                          pathname === item.href
                            ? "bg-[#F0F5FA] text-[#003B73] font-semibold"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                        }`}
                      >
                        <span className="text-[#005A9C]">{item.icon}</span>
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
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith("/outcomes")
                    ? "bg-[#F0F5FA] text-[#003B73] font-semibold"
                    : "text-[#1F2937] hover:bg-[#F5F7FA]"
                }`}
              >
                Outcomes
              </Link>

              {/* Recommendations */}
              <Link
                href="/recommendations"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  pathname.startsWith("/recommendations")
                    ? "bg-[#F0F5FA] text-[#003B73] font-semibold"
                    : "text-[#1F2937] hover:bg-[#F5F7FA]"
                }`}
              >
                Recommendations
              </Link>

              {/* Dashboards Accordion */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileAccordion((prev) => (prev === "dashboards" ? null : "dashboards"))
                  }
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-[#1F2937] hover:bg-[#F5F7FA] rounded-md"
                >
                  <span className={isDashboardsActive ? "font-semibold text-[#003B73]" : ""}>
                    Dashboards
                  </span>
                  <ChevronDownIcon
                    className={mobileAccordion === "dashboards" ? "rotate-180" : ""}
                  />
                </button>
                {mobileAccordion === "dashboards" && (
                  <div className="pl-4 pr-2 py-1 space-y-1 border-l-2 border-[#005A9C] ml-3 mt-1">
                    {DASHBOARDS_ITEMS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-md ${
                          pathname === item.href
                            ? "bg-[#F0F5FA] text-[#003B73] font-semibold"
                            : "text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111827]"
                        }`}
                      >
                        <span className="text-[#005A9C]">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Auth Bottom Section */}
            <div className="p-4 border-t border-[#D1D5DB] bg-[#F9FAFB]">
              {isLoaded && !isSignedIn && (
                <div className="flex flex-col gap-2">
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="w-full py-2 text-xs font-semibold text-[#005A9C] border border-[#005A9C] rounded-md bg-white hover:bg-[#F0F5FA] transition-colors whitespace-nowrap"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="w-full py-2 text-xs font-semibold text-white bg-[#005A9C] hover:bg-[#003B73] rounded-md transition-colors shadow-sm whitespace-nowrap"
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
                    <span className="text-xs font-medium text-[#111827]">My Account</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#005A9C] rounded-md hover:bg-[#003B73] whitespace-nowrap"
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
