import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max = 100,
  className,
  tone,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "accent" | "warn" | "danger" | "neutral";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const inferredTone: "accent" | "warn" | "danger" =
    tone === "warn" || tone === "danger"
      ? tone
      : pct >= 100
      ? "danger"
      : pct >= 80
      ? "warn"
      : "accent";

  const barColor = {
    accent: "bg-accent",
    warn: "bg-amber-500",
    danger: "bg-red-500",
    neutral: "bg-ink-soft",
  }[tone && tone !== "warn" && tone !== "danger" ? tone : inferredTone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all", barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
