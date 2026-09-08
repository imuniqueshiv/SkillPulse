# SkillPulse Web (`apps/web`)

The frontend application for **SkillPulse** — an India-wide skill-development and labour-market intelligence platform built with Next.js 16 (App Router), React 19, Tailwind CSS v4, and Clerk authentication.

---

## 🎨 Visual Identity & Design System

The portal uses a modern, high-trust **Saffron/Terracotta Orange and Warm Cream** theme tailored for public and institutional intelligence.

### Color Palette (Defined in `app/globals.css`)

| Role | Variable / Hex | Usage |
| :--- | :--- | :--- |
| **Primary Brand Accent** | `--sp-accent` / `--sp-nav-orange-primary` (`#E85D2A`) | Signal pulse logo, primary CTA buttons, search button, hero title highlights |
| **Dark / Hover Accent** | `--sp-accent-hover` / `--sp-nav-orange-dark` (`#C94A20`) | Button hover states, active navigation accents |
| **Light Orange Tint** | `--sp-nav-orange-light` (`#F28C5B`) | Secondary accent badges, signal nodes |
| **Pale Accent Tint** | `--sp-nav-orange-pale` (`#FFF0E8`) | Badge backgrounds (e.g. `Evidence Synergy +94.2%`), card highlights |
| **Warm Cream Surface** | `--sp-nav-cream` (`#FFF8F2`) / `--sp-nav-warm-white` (`#FFFCF9`) | Header background tints, decorative border accents |
| **Base Surface** | `--sp-bg-surface` (`#FFFFFF`) | Main cards, modals, content containers |
| **Base Background** | `--sp-bg-base` (`#F5F7FA`) | Page background neutral |
| **Warm Border Neutral** | `--sp-nav-border` (`#E5D9D0`) / `--sp-border` (`#D1D5DB`) | Card outlines, dividers, and inputs |
| **Text Primary** | `--sp-text-primary` (`#1F2937`) | Headings and primary body copy |
| **Text Secondary** | `--sp-text-secondary` (`#6B7280`) | Labels, subtitles, metadata |

---

## 🖥️ Page & Route Structure

```
apps/web/app/
├── (auth)/
│   ├── sign-in/[[...sign-in]]/page.tsx      # Clerk sign-in modal
│   └── sign-up/[[...sign-up]]/page.tsx      # Clerk sign-up modal
├── (dashboard)/
│   ├── layout.tsx                           # Authenticated shell (Sidebar + TopBar)
│   ├── dashboard/page.tsx                   # Executive / Role Overview Dashboard
│   ├── skills/page.tsx                      # Market demand & skill gaps table
│   ├── skills/[id]/page.tsx                 # Individual skill deep-dive
│   ├── programs/page.tsx                    # Training needs & institute intelligence
│   ├── programs/institutes/[orgId]/page.tsx # Institute-level intelligence
│   ├── decisions/page.tsx                   # Government decision signals table
│   ├── decisions/[signalId]/page.tsx        # Signal explanation & provenance
│   ├── quality/page.tsx                     # Data freshness, trust & quality scores
│   ├── jobs/page.tsx                        # Ingested job postings & skill extraction
│   ├── jobs/[id]/page.tsx                   # Job posting detail view
│   ├── courses/page.tsx                     # Course catalogue (Placeholder)
│   ├── courses/[id]/page.tsx                # Program intelligence by ID
│   ├── curricula/page.tsx                   # Curriculum analysis (Placeholder)
│   ├── gaps/page.tsx                        # Demand vs Supply gap explorer (Placeholder)
│   ├── recommendations/page.tsx             # Actionable policy guidance (Placeholder)
│   ├── employers/page.tsx                   # Employer intelligence & signals (Placeholder)
│   ├── outcomes/page.tsx                    # Placement & post-training tracking (Placeholder)
│   └── settings/page.tsx                    # User preferences, profile, and API key management
├── layout.tsx                               # Root layout with ClerkProvider, Navbar, Footer
└── page.tsx                                 # Public landing page
```

---

## 🌟 Key Frontend Features

### 1. Public Landing Page (`app/page.tsx`)
- **Navigation (`components/Navbar.tsx`):**
  - Brand logo with animated pulse signal (`#E85D2A`).
  - Dropdown menus: *Intelligence*, *Training & Curriculum*, *Outcomes*, *Recommendations*, *Dashboards*.
  - Search bar with integrated voice search (`webkitSpeechRecognition`).
  - Clerk-integrated Sign In / Register buttons.
- **Hero Section:**
  - *"Turn Workforce Data Into Better Decisions"* with orange accent typography.
  - Search bar routing directly to corresponding modules (`/courses`, `/skills`, `/jobs`, `/gaps`).
  - Interactive **Workforce Intelligence Flow**: Clickable nodes (*Labour Market*, *Skills Taxonomy*, *Training & Curriculum*, *Employment Outcomes*) that update live diagnostic context.
- **Featured Intelligence:**
  - *"Where Skills Meet Demand"* showcasing real-world vocational training imagery and step-by-step workforce pipeline indicators.
- **Interactive Methodology Timeline:**
  - 6-stage pipeline: *Collect* → *Validate* → *Analyse* → *Identify Gaps* → *Recommend* → *Measure*.
- **Data vs Decision Scenario Switcher:**
  - Toggle between raw market signals and SkillPulse diagnostic recommendations (e.g. `UPDATE_CURRICULUM` vs seat expansion).
- **Stakeholder Intelligence Hub:**
  - Tailored perspectives for *Government & Policymakers*, *Training Institutes*, *Employers & Industry*, and *Learners*.
- **Maharashtra MVP Scope:**
  - Highlights pilot coverage across all 36 districts of Maharashtra.

### 2. Executive Dashboard (`app/(dashboard)/`)
- **RoleDashboard (`components/dashboard/RoleDashboard.tsx`):**
  - Adapts views for `PLATFORM_ADMIN`, `GOVERNMENT_MANAGER`, `INSTITUTE_ADMIN`, `EMPLOYER`, `TRAINER`, and `LEARNER`.
  - Displays KPI stat cards: *High Demand Skills*, *Severe / High Gaps*, *Training → Employment*, *High Priority Signals*.
  - High-priority decision signals table with direct links to explainer pages.
  - Data quality snapshot highlighting fresh vs. stale evidence.

### 3. Reusable UI Components (`components/ui/`)
- `Sidebar.tsx` — Responsive, collapsible navigation sidebar.
- `TopBar.tsx` — Header with mobile drawer toggle and user status.
- `Card.tsx`, `StatCard.tsx`, `Badge.tsx`, `DataTable.tsx` — Core data presentation.
- `ProgressBar.tsx`, `ChartBar.tsx`, `HeatmapGrid.tsx` — Data visualization.
- `SkeletonLoader.tsx`, `EmptyState.tsx` — Polished fallback & loading states.
- `IntelligenceStates.tsx` — Specialized UI for `INSUFFICIENT_DATA`, `UNKNOWN`, errors, and priority tags.

---

## 🚀 Running Locally

From the **repository root**:

```bash
# Start the web development server (port 3000)
pnpm dev:web

# Or start web and API in parallel
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Key Environment Variables (`.env` in repo root)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key for authentication.
- `CLERK_SECRET_KEY` — Clerk secret key.
- `NEXT_PUBLIC_API_URL` — Express backend URL (defaults to `http://localhost:4000`).

### Quality & Verification Commands

```bash
# Run TypeScript typecheck
pnpm --filter web typecheck

# Run ESLint
pnpm --filter web lint

# Build for production
pnpm --filter web build
```
