"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  LogOut,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const TITLES: Record<string, string> = {
  "": "Dashboard",
  clients: "Clients",
  projects: "Projects",
  invoices: "Invoices",
  proposals: "Proposals",
  reminders: "Reminders",
  chatbot: "Assistant",
  settings: "Settings",
  analytics: "Analytics",
  activity: "Activity",
  drive: "Google Drive",
};

function titleFor(pathname: string): string {
  const seg = pathname.split("/")[1] ?? "";
  return TITLES[seg] ?? "Briefly";
}

export function Topbar({
  ownerName,
  onToggleSidebar,
  collapsed = false,
}: {
  ownerName: string;
  onToggleSidebar: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const seg = pathname.split("/")[1];
    if (
      seg === "clients" ||
      seg === "projects" ||
      seg === "invoices" ||
      seg === "proposals"
    ) {
      router.push(`/${seg}?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-border bg-surface-raised/80 px-4 backdrop-blur md:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="hidden h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-surface hover:text-ink md:flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </button>

      <div className="flex items-center gap-2 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <h1 className="text-base font-semibold text-ink">{titleFor(pathname)}</h1>

      <form onSubmit={onSearch} className="ml-auto hidden items-center sm:flex">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-9 w-56 rounded-lg border border-surface-border bg-surface-raised pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <ThemeToggle compact />
        <span className="hidden text-sm text-ink-soft sm:inline">{ownerName}</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-surface hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
