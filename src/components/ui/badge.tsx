import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "warn" | "danger" | "muted";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-ink-soft border border-surface-border",
  accent: "bg-accent-subtle text-accent-hover border border-accent/30",
  warn: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
  muted: "bg-surface text-ink-muted border border-surface-border",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
