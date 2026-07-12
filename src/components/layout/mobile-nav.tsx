"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Users,
  FolderKanban,
  MoreHorizontal,
  Settings,
  BarChart2,
  Bell,
  FileText,
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

  // Close more menu on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!mounted) return null;

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu popup — bottom sheet */}
      {moreOpen && (
        <div className="fixed bottom-24 left-3 right-3 z-50 md:hidden">
          <div className="glass-card rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="mb-2 px-2 text-xs font-medium text-ink-muted uppercase tracking-wider">Navigate</div>
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

      {/* Bottom navigation bar — two floating pieces */}
      <div className="fixed bottom-3 left-3 right-3 z-50 flex items-end justify-between gap-2 md:hidden">
        {/* Primary nav — 3 buttons + More */}
        <div className="glass-bar flex flex-1 items-center justify-around rounded-2xl px-1 py-1.5">
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
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200 min-w-[3.5rem]",
                  active
                    ? "bg-accent/15 text-accent-hover"
                    : "text-ink-muted active:text-ink active:bg-white/10"
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
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200 min-w-[3.5rem]",
              moreOpen
                ? "bg-accent/15 text-accent-hover"
                : "text-ink-muted active:text-ink active:bg-white/10"
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

        {/* Floating Assistant button */}
        <Link
          href="/chatbot"
          className={cn(
            "glass-bar flex h-13 w-13 items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 shrink-0",
            pathname.startsWith("/chatbot")
              ? "bg-accent text-white shadow-lg shadow-accent/30"
              : "text-ink-muted active:text-ink"
          )}
        >
          <Bot className="h-5 w-5" />
        </Link>
      </div>
    </>
  );
}
