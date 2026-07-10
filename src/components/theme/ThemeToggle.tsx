"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const next =
      theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-ink-soft transition-colors hover:bg-surface hover:text-ink"
        aria-label={`Theme: ${theme}. Click to switch.`}
        title={`Theme: ${theme}`}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-surface-border bg-surface p-1">
      {(
        [
          { value: "light" as const, icon: Sun, label: "Light" },
          { value: "dark" as const, icon: Moon, label: "Dark" },
          { value: "system" as const, icon: Monitor, label: "System" },
        ] as const
      ).map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-accent text-white"
                : "text-ink-soft hover:bg-surface-raised hover:text-ink"
            )}
            aria-label={option.label}
            aria-pressed={active}
            title={option.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
