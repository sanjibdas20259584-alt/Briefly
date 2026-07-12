"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  "Overview",
  "Projects",
  "Invoices",
  "Proposals",
  "Interactions",
  "Custom Fields",
  "Notes",
  "Files",
] as const;
type Tab = (typeof TABS)[number];

export function ClientDetailTabs({
  Overview,
  Projects,
  Invoices,
  Proposals,
  Interactions,
  CustomFields,
  Notes,
  Files,
}: {
  Overview: ReactNode;
  Projects: ReactNode;
  Invoices: ReactNode;
  Proposals: ReactNode;
  Interactions: ReactNode;
  CustomFields: ReactNode;
  Notes: ReactNode;
  Files: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const map: Record<Tab, ReactNode> = {
    Overview,
    Projects,
    Invoices,
    Proposals,
    Interactions,
    "Custom Fields": CustomFields,
    Notes,
    Files,
  };
  return (
    <div>
      <div className="flex gap-1 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t
                ? "border-accent text-accent-hover"
                : "border-transparent text-ink-soft hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="pt-6">{map[tab]}</div>
    </div>
  );
}
