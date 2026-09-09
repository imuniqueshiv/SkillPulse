"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// SVG Icons
const IconDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
);
const IconJobs = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);
const IconSkills = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
);
const IconGaps = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
);
const IconCourses = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
);
const IconCurricula = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>
);
const IconRecommendations = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
);
const IconEmployers = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="15" y2="22"></line><line x1="8" y1="6" x2="8.01" y2="6"></line><line x1="16" y1="6" x2="16.01" y2="6"></line><line x1="12" y1="6" x2="12.01" y2="6"></line><line x1="12" y1="10" x2="12.01" y2="10"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="10" x2="16.01" y2="10"></line><line x1="16" y1="14" x2="16.01" y2="14"></line><line x1="8" y1="10" x2="8.01" y2="10"></line><line x1="8" y1="14" x2="8.01" y2="14"></line></svg>
);
const IconOutcomes = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const IconSettings = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const IconToggleCollapse = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 18l-6-6 6-6"></path></svg>
);
const IconToggleExpand = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 18l6-6-6-6"></path></svg>
);

const navGroups = [
  {
    group: "Overview",
    items: [
      { label: "Overview", href: "/dashboard", icon: IconDashboard },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "Labour Demand", href: "/demand", icon: IconJobs },
      { label: "Skills", href: "/skills", icon: IconSkills },
      { label: "Skill Gaps", href: "/gaps", icon: IconGaps },
      { label: "Training & Programs", href: "/programs", icon: IconCourses },
      { label: "Outcomes", href: "/outcomes", icon: IconOutcomes },
      { label: "Decision Signals", href: "/decisions", icon: IconRecommendations },
      { label: "Data Quality", href: "/quality", icon: IconCurricula },
    ],
  },
  {
    group: "Catalogue (DEMO)",
    items: [
      { label: "Jobs (DEMO)", href: "/jobs", icon: IconEmployers },
      { label: "Courses (DEMO)", href: "/courses", icon: IconCurricula },
    ],
  },
];

export interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const emptySubscribe = () => () => {};

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  if (!mounted) {
    return <div className="hidden lg:flex w-[256px] h-full" />;
  }

  const sidebarWidth = isCollapsed ? "w-[64px]" : "w-[256px]";
  const navItemClasses = "flex items-center w-full px-3 py-2 my-1 rounded-[var(--sp-radius-md)] transition-all duration-150 ease-out text-[14px] font-medium border-l-[3px] border-transparent group";
  const getActiveClasses = (isActive: boolean) => 
    isActive 
      ? "bg-[var(--sp-accent-muted)] border-l-[var(--sp-accent)] text-[var(--sp-accent)]" 
      : "text-[var(--sp-text-secondary)] hover:bg-[var(--sp-bg-hover)] hover:text-[var(--sp-text-primary)]";
      
  const getIconColorClasses = (isActive: boolean) =>
    isActive
      ? "text-[var(--sp-accent)]"
      : "text-[var(--sp-text-secondary)] group-hover:text-[var(--sp-text-primary)]";

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 top-[63px] bg-black/30 z-30 lg:hidden transition-all duration-150 ease-out"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed left-0 top-[63px] h-[calc(100vh-63px)] flex flex-col bg-[var(--sp-bg-surface)] border-r border-[var(--sp-border)] z-40 transition-all duration-150 ease-out ${sidebarWidth} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Workspace Section Indicator */}
        <div className="flex items-center px-4 h-[44px] border-b border-[var(--sp-border)] shrink-0">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--sp-text-tertiary)] truncate">
            {isCollapsed ? "WS" : "Workspace Navigator"}
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1 overflow-x-hidden">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="mb-2">
              {!isCollapsed && group.group !== "Overview" && (
                <div className="px-3 pb-1 pt-3 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-[var(--sp-text-tertiary)] transition-opacity duration-150 ease-out">
                  {group.group}
                </div>
              )}
              {group.items.map((item, iIdx) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const Icon = item.icon;
                return (
                  <Link
                    key={iIdx}
                    href={item.href}
                    className={`${navItemClasses} ${getActiveClasses(isActive)}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[20px] h-[20px] shrink-0 ${getIconColorClasses(isActive)}`} />
                    {!isCollapsed && (
                      <span className="ml-3 truncate transition-opacity duration-150 ease-out">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="my-2 h-[1px] bg-[var(--sp-border)] mx-2" />

          {/* System Group */}
          <div className="mb-2">
            {!isCollapsed && (
              <div className="px-3 pb-1 pt-3 text-[0.6875rem] font-medium uppercase tracking-[0.05em] text-[var(--sp-text-tertiary)] transition-opacity duration-150 ease-out">
                System
              </div>
            )}
            <Link
              href="/settings"
              className={`${navItemClasses} ${getActiveClasses(pathname === "/settings")}`}
              title={isCollapsed ? "Settings" : undefined}
            >
              <IconSettings className={`w-[20px] h-[20px] shrink-0 ${getIconColorClasses(pathname === "/settings")}`} />
              {!isCollapsed && (
                <span className="ml-3 truncate transition-opacity duration-150 ease-out">
                  Settings
                </span>
              )}
            </Link>
          </div>
        </nav>

        {/* Bottom Section (Collapse Toggle) */}
        <div className="p-2 border-t border-[var(--sp-border)] shrink-0">
          <button
            onClick={toggleCollapse}
            className={`w-full flex items-center p-2 rounded-[var(--sp-radius-md)] text-[var(--sp-text-secondary)] hover:bg-[var(--sp-bg-hover)] hover:text-[var(--sp-text-primary)] transition-all duration-150 ease-out ${isCollapsed ? 'justify-center' : 'justify-end'}`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <IconToggleExpand className="w-[20px] h-[20px]" />
            ) : (
              <IconToggleCollapse className="w-[20px] h-[20px]" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
