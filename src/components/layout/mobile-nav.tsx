"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  MoreHorizontal,
  Settings,
  BarChart2,
  Bell,
  FileText,
  FolderKanban,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/chatbot", label: "Assistant", icon: Bot },
  { href: "/clients", label: "Clients", icon: Users },
];

const SECONDARY_NAV = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/finance", label: "Finance", icon: FileText },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/drive", label: "Google Drive", icon: FolderKanban },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu — bottom sheet */}
      {moreOpen && (
        <div className="fixed bottom-[5.5rem] left-3 right-3 z-50 md:hidden">
          <div className="glass-card rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="mb-2 px-2 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Navigate</div>
            <div className="grid grid-cols-4 gap-1">
              {SECONDARY_NAV.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-all duration-200",
                      active
                        ? "bg-accent/15 text-accent-hover"
                        : "text-ink-soft active:bg-white/10"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar — single centered glass bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-3 mb-3">
          <div className="mobile-nav-glass flex items-center justify-around rounded-2xl px-2 py-2">
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200",
                    active
                      ? "text-accent"
                      : "text-ink-muted active:text-ink"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-none">
                    {item.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200",
                moreOpen
                  ? "text-accent"
                  : "text-ink-muted active:text-ink"
              )}
            >
              {moreOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <MoreHorizontal className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
