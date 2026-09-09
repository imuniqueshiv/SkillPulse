export function SkillPulseHeroArtwork() {
  return (
    <div className="relative w-full h-full min-h-[260px] sm:min-h-[290px] flex items-center justify-center select-none overflow-hidden rounded-2xl border border-[#E8D4C5] bg-gradient-to-br from-[#FFF7EF] via-[#FCEFE4] to-[#F4E2D2] p-4 sm:p-5 shadow-md shadow-[#A94F3D]/5">
      {/* Subtle background dot grid pattern */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#A94F3D_0.75px,transparent_0.75px)] [background-size:14px_14px]" />

      {/* Ambient background glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#E85D2A]/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#A94F3D]/10 blur-2xl pointer-events-none" />

      {/* Main Vector Illustration Canvas */}
      <svg className="relative w-full h-full max-h-[270px]" viewBox="0 0 520 340" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Industry / Tech Facilities Silhouette Background */}
        <path d="M30 260 L30 195 L65 195 L65 220 L95 220 L95 175 L135 175 L135 260 Z" fill="#E8D4C5" opacity="0.45" />
        <path d="M370 260 L370 165 L410 165 L410 185 L445 185 L445 145 L485 145 L485 260 Z" fill="#E8D4C5" opacity="0.4" />

        {/* Data flow connections (Curved dashed vector paths) */}
        <path d="M95 175 Q 180 110, 260 160 T 425 145" stroke="#E85D2A" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.65" />
        <path d="M125 220 Q 220 270, 335 205 T 435 215" stroke="#A94F3D" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.55" />

        {/* Central Pulse / Synergy Hub */}
        <circle cx="260" cy="160" r="44" fill="url(#hero-hub-grad)" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="260" cy="160" r="56" stroke="#E85D2A" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.45" />

        {/* Central Pulse Wave Icon */}
        <path d="M234 160 L246 160 L252 147 L260 175 L267 153 L273 163 L278 160 L286 160" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Network Nodes with Icons */}
        {/* Node 1: Industry / Demand (Top Left) */}
        <g transform="translate(95, 110)">
          <circle cx="0" cy="0" r="21" fill="#FFFFFF" stroke="#E8D4C5" strokeWidth="2" />
          <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#A94F3D" opacity="0.15" />
          <path d="M-5 5 L-5 -2 L-1 -4 L-1 0 L3 -2 L3 5 Z" fill="#A94F3D" />
        </g>

        {/* Node 2: Skills / Training (Bottom Left) */}
        <g transform="translate(125, 220)">
          <circle cx="0" cy="0" r="19" fill="#FFFFFF" stroke="#E8D4C5" strokeWidth="2" />
          <path d="M-6 -2 L0 -6 L6 -2 L0 2 Z M-4 1 L-4 4 Q0 7 4 4 L4 1" stroke="#E85D2A" strokeWidth="1.5" fill="none" />
        </g>

        {/* Node 3: Workforce / People (Top Right) */}
        <g transform="translate(425, 110)">
          <circle cx="0" cy="0" r="21" fill="#FFFFFF" stroke="#E8D4C5" strokeWidth="2" />
          <circle cx="0" cy="-4" r="5" fill="#3A2A25" />
          <path d="M-7 7 C-7 3, -4 2, 0 2 C4 2, 7 3, 7 7" fill="#3A2A25" />
        </g>

        {/* Node 4: Employment Outcomes (Bottom Right) */}
        <g transform="translate(395, 215)">
          <circle cx="0" cy="0" r="19" fill="#FFFFFF" stroke="#E8D4C5" strokeWidth="2" />
          <path d="M-5 3 L-1 -1 L2 1 L5 -4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 -4 H5 V-1" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Vector Bar Chart Dashboard Component */}
        <g transform="translate(205, 230)">
          <rect x="0" y="0" width="110" height="44" rx="8" fill="#FFFFFF" fillOpacity="0.95" stroke="#E8D4C5" strokeWidth="1.5" />
          <rect x="14" y="20" width="10" height="15" rx="2" fill="#F4E2D2" />
          <rect x="30" y="14" width="10" height="21" rx="2" fill="#A94F3D" />
          <rect x="46" y="8" width="10" height="27" rx="2" fill="#E85D2A" />
          <rect x="62" y="16" width="10" height="19" rx="2" fill="#3A2A25" />
          <rect x="78" y="6" width="10" height="29" rx="2" fill="#10B981" />
        </g>

        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="hero-hub-grad" x1="216" y1="116" x2="304" y2="204" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E85D2A" />
            <stop offset="1" stopColor="#A94F3D" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating Info Pills / Badges over Vector Artwork */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm border border-[#E8D4C5] flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#E85D2A] animate-pulse" />
        <span className="text-[10px] font-bold tracking-wider text-[#3A2A25] uppercase">Workforce Intelligence</span>
      </div>

      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-sm border border-[#E8D4C5] flex items-center gap-2">
        <span className="text-[10px] font-semibold text-[#3A2A25]">Evidence Synergy</span>
        <span className="text-[10px] font-bold text-[#E85D2A] bg-[#FFF0E8] px-1.5 py-0.5 rounded-[#sp-radius-sm]">+94.2%</span>
      </div>
    </div>
  );
}
