"use client";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "preferences", label: "Preferences" },
  { key: "account", label: "Account" },
  { key: "api", label: "API" },
] as const;

export type SettingsTab = (typeof TABS)[number]["key"];

export function SettingsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}) {
  return (
    <div
      className="flex gap-1 p-1 rounded-lg"
      style={{ background: "var(--sp-bg-surface)" }}
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
          className="px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ease-out cursor-pointer"
          style={{
            color:
              activeTab === tab.key
                ? "var(--sp-text-primary)"
                : "var(--sp-text-secondary)",
            background:
              activeTab === tab.key ? "var(--sp-bg-elevated)" : "transparent",
            boxShadow:
              activeTab === tab.key ? "var(--sp-shadow-sm)" : "none",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
