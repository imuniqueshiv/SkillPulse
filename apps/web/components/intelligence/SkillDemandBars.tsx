"use client";

export function SkillDemandBars({
  rows,
}: {
  rows: Array<{
    skillId: string;
    canonicalName: string;
    jobCount: number;
    weightedDemand: string | number;
  }>;
}) {
  const max = Math.max(...rows.map((r) => r.jobCount), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      {rows.map((row, idx) => {
        const width = Math.max(8, Math.round((row.jobCount / max) * 100));
        return (
          <div key={row.skillId || row.canonicalName} style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                fontSize: "0.875rem",
                fontWeight: idx < 3 ? 600 : 400,
              }}
            >
              {row.skillId ? (
                <a
                  href={`/skills/${encodeURIComponent(row.skillId)}`}
                  className="text-[var(--sp-accent)] underline truncate"
                >
                  {row.canonicalName}
                </a>
              ) : (
                <span className="truncate">{row.canonicalName}</span>
              )}
              <span style={{ whiteSpace: "nowrap", color: "var(--sp-text-secondary)" }}>
                {row.jobCount} jobs · {row.weightedDemand}
              </span>
            </div>
            <div
              style={{
                marginTop: "0.25rem",
                height: "0.5rem",
                borderRadius: "999px",
                background: "var(--sp-bg-hover)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${width}%`,
                  height: "100%",
                  background: idx < 3 ? "var(--sp-accent)" : "#64748b",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
