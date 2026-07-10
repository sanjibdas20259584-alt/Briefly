"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  FileSignature,
  Bell,
  Bot,
  Settings,
  Sparkles,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/proposals", label: "Proposals", icon: FileSignature },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/drive", label: "Google Drive", icon: HardDrive },
  { href: "/openwa", label: "WhatsApp", icon: MessageSquare },
  { href: "/chatbot", label: "Assistant", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  ownerName,
  collapsed,
  onToggle,
}: {
  ownerName: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-surface-border bg-surface-raised transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-surface-border px-3",
          collapsed ? "justify-center" : "gap-2 px-4"
        )}
      >
        {!collapsed && (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold text-ink">Briefly</span>
          </>
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface text-ink-soft hover:bg-surface-raised hover:text-ink transition-colors",
            !collapsed && "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-subtle text-accent-hover"
                  : "text-ink-soft hover:bg-surface hover:text-ink",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-surface-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
              {ownerName.slice(0, 1).toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{ownerName}</p>
              <p className="truncate text-xs text-ink-muted">Owner</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
