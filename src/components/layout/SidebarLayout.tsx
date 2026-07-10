"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

export function SidebarLayout({
  children,
  ownerName,
}: {
  children: React.ReactNode;
  ownerName: string;
}) {
  // Default expanded (user preference)
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    if (stored === "false") setCollapsed(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("sidebar-collapsed", collapsed ? "true" : "false");
  }, [collapsed, mounted]);

  const marginLeft = collapsed ? "4rem" : "16rem";

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden md:block">
        <Sidebar
          ownerName={ownerName}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>
      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out md:ml-[var(--sidebar-w)]"
        style={
          {
            ["--sidebar-w" as string]: mounted ? marginLeft : "16rem",
          } as React.CSSProperties
        }
      >
        <Topbar
          ownerName={ownerName}
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
