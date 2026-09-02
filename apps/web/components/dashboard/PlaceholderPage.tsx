import { EmptyState } from "@/components/ui/EmptyState";

function BriefcaseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="8" y2="6.01" />
      <line x1="16" y1="6" x2="16" y2="6.01" />
      <line x1="12" y1="6" x2="12" y2="6.01" />
      <line x1="8" y1="10" x2="8" y2="10.01" />
      <line x1="16" y1="10" x2="16" y2="10.01" />
      <line x1="12" y1="10" x2="12" y2="10.01" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

const SECTION_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    title: string;
    description: string;
    actionLabel: string;
    actionHref?: string;
  }
> = {
  Jobs: {
    icon: <BriefcaseIcon />,
    title: "No job postings yet",
    description:
      "Import or create job postings to start tracking in-demand skills and employment trends across sectors.",
    actionLabel: "Import Job Postings",
    actionHref: "/jobs",
  },
  Skills: {
    icon: <ZapIcon />,
    title: "No skills tracked",
    description:
      "Add your first skill taxonomy to begin mapping competencies across the workforce ecosystem.",
    actionLabel: "Add Skill Taxonomy",
    actionHref: "/skills",
  },
  Courses: {
    icon: <BookOpenIcon />,
    title: "No courses available",
    description:
      "Browse or upload training programs to connect learners with the skills employers need most.",
    actionLabel: "Browse Course Catalog",
    actionHref: "/courses",
  },
  Curricula: {
    icon: <LayersIcon />,
    title: "No curricula designed",
    description:
      "Design structured learning paths by combining courses, assessments, and milestones into curricula.",
    actionLabel: "Design a Curriculum",
    actionHref: "/curricula",
  },
  Gaps: {
    icon: <BarChartIcon />,
    title: "No gap analysis run",
    description:
      "Run a skill gap analysis to identify where workforce competencies fall short of employer demand.",
    actionLabel: "Run Gap Analysis",
    actionHref: "/gaps",
  },
  Recommendations: {
    icon: <CompassIcon />,
    title: "No recommendations yet",
    description:
      "Generate personalized learning path recommendations once skills and gaps are configured.",
    actionLabel: "Generate Recommendations",
    actionHref: "/recommendations",
  },
  Employers: {
    icon: <BuildingIcon />,
    title: "No employers connected",
    description:
      "Connect employer profiles to enrich the platform with real hiring requirements and labour-market signals.",
    actionLabel: "Connect Employer Profiles",
    actionHref: "/employers",
  },
  Outcomes: {
    icon: <TrendingUpIcon />,
    title: "No outcomes tracked",
    description:
      "Track learning outcomes — placement rates, skill improvements, and certification completions across cohorts.",
    actionLabel: "Track Learning Outcomes",
    actionHref: "/outcomes",
  },
};

export function PlaceholderPage({ title }: { title: string }) {
  const config = SECTION_CONFIG[title];

  if (!config) {
    return (
      <EmptyState
        icon={<BarChartIcon />}
        title={`${title} — Coming Soon`}
        description="This feature is currently being developed. Check back soon for updates."
      />
    );
  }

  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      actionLabel={config.actionLabel}
      actionHref={config.actionHref}
    />
  );
}
