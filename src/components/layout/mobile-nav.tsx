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
  { href: "/reminders", label: "Reminders", icon: Bell },
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

      {/* More menu popup */}
      {moreOpen && (
        <div className="fixed bottom-28 left-4 right-4 z-50 md:hidden">
          <div className="glass-card rounded-2xl border border-white/20 p-2 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
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
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-accent/10 text-accent-hover"
                      : "text-ink-soft hover:bg-white/10 hover:text-ink"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom navigation bar — two floating pieces */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-end justify-between gap-3 md:hidden">
        {/* Primary nav — 3 buttons */}
        <div className="glass-bar flex flex-1 items-center justify-around rounded-2xl px-2 py-2">
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
                  "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200",
                  active
                    ? "bg-accent/15 text-accent-hover scale-105"
                    : "text-ink-muted hover:text-ink hover:bg-white/10"
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
              "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200",
              moreOpen
                ? "bg-accent/15 text-accent-hover scale-105"
                : "text-ink-muted hover:text-ink hover:bg-white/10"
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

        {/* Secondary floating button — Assistant shortcut */}
        <Link
          href="/chatbot"
          className={cn(
            "glass-bar flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95",
            pathname.startsWith("/chatbot")
              ? "bg-accent text-white shadow-lg shadow-accent/30"
              : "bg-white/20 text-ink hover:bg-white/30"
          )}
        >
          <Bot className="h-6 w-6" />
        </Link>
      </div>
    </>
  );
}
