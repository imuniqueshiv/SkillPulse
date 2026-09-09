export function EvidenceTrustSection() {
  return (
    <section className="relative z-[2] py-16 lg:py-20 bg-[#FFFCF9]/20 backdrop-blur-[1px] border-y border-[#E2E8F0]/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1F2933]">
            Evidence Before <span className="text-[#E85D2A]">Assumptions</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Source", desc: "Multi-platform verified" },
            { label: "Freshness", desc: "Temporal decay scoring" },
            { label: "Validation", desc: "Cross-reference checks" },
            { label: "Coverage", desc: "Geographic completeness" },
            { label: "Confidence", desc: "0–100 composite index" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5">
              <span className="text-sm font-bold text-[#1F2933]">{item.label}</span>
              <p className="text-[11px] text-[#64748B] mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl rounded-xl border border-[#E2E8F0] bg-white p-5 text-center">
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-semibold text-[#1F2933]">Missing data ≠ zero demand</span>
            <span className="text-[#D9E1E8]">·</span>
            <span className="font-semibold text-[#1F2933]">Unknown employment status ≠ unemployed</span>
          </div>
        </div>
      </div>
    </section>
  );
}
