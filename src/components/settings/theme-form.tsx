"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/lib/types";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces, dark text",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light, easy on the eyes",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your OS preference",
    icon: Monitor,
  },
];

export function ThemeForm() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              active
                ? "border-accent bg-accent-subtle"
                : "border-surface-border bg-surface hover:border-accent/40"
            )}
            aria-pressed={active}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-accent-hover" : "text-ink-muted"
              )}
            />
            <div>
              <p className="text-sm font-medium text-ink">{opt.label}</p>
              <p className="mt-0.5 text-xs text-ink-soft">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
