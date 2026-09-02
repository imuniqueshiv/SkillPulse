"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SettingsTabs, type SettingsTab } from "@/components/settings/SettingsTabs";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { ApiSection } from "@/components/settings/ApiSection";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences, and integrations"
      />

      <SettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-3xl">
        {activeTab === "profile" && <ProfileSection />}
        {activeTab === "preferences" && <PreferencesSection />}
        {activeTab === "account" && <AccountSection />}
        {activeTab === "api" && <ApiSection />}
      </div>
    </div>
  );
}
