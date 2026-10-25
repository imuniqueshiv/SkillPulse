"use client";

import { useAuth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { TopBar } from "@/components/ui/TopBar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div
      className="h-[calc(100dvh-64px)] flex overflow-hidden w-full max-w-full"
      style={{ background: "var(--sp-bg-base)" }}
    >
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main content area */}
      <div
        className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-150 ease-out ${
          isCollapsed ? "lg:ml-[64px]" : "lg:ml-[256px]"
        }`}
        id="main-content"
      >
        <TopBar onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
