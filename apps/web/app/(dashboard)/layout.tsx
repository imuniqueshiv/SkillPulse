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

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--sp-bg-base)" }}
    >
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[var(--sp-sidebar-width)]" id="main-content">
        <TopBar onMobileMenuToggle={() => setMobileMenuOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
