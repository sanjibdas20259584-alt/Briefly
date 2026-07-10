"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function AppShell({ children, ownerName }: { children: React.ReactNode; ownerName: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("sidebar-collapsed", collapsed.toString());
  }, [collapsed, mounted]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        ownerName={ownerName}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <div
        className="flex min-w-0 flex-1 flex-col"
        style={{
          marginLeft: collapsed ? "4rem" : "16rem",
          transition: "margin-left 0.3s ease",
        }}
      >
        <Topbar ownerName={ownerName} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}