import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  progress?: number;
  tone?: "default" | "dark" | "red";
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  progress,
  tone = "default",
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "card-hover relative overflow-hidden rounded-xl border p-5 shadow-card",
        tone === "dark" && "border-transparent bg-markenny-ink text-white",
        tone === "red" && "border-transparent bg-primary text-white",
        tone === "default" && "border-border bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.2em]",
              tone === "default" ? "text-muted-foreground" : "text-white/50",
            )}
          >
            {label}
          </p>
          <p className="mt-2.5 font-display text-[32px] font-semibold leading-none tracking-tight tabular-nums">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md border",
            tone === "default"
              ? "border-border bg-muted/50 text-markenny-ink dark:text-foreground"
              : "border-white/15 bg-white/[0.06] text-white",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <p
        className={cn(
          "mt-4 text-[11px] leading-snug",
          tone === "default" ? "text-muted-foreground" : "text-white/45",
        )}
      >
        {hint}
      </p>

      {typeof progress === "number" && (
        <div
          className={cn(
            "mt-3 h-[3px] w-full overflow-hidden rounded-full",
            tone === "default" ? "bg-muted" : "bg-white/10",
          )}
        >
          <div
            className={cn(
              "h-full rounded-full",
              tone === "red" ? "bg-white" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {tone === "default" && (
        <span className="absolute right-0 top-0 h-10 w-10 bg-[linear-gradient(225deg,hsl(var(--primary)/0.14)_0%,transparent_55%)]" />
      )}
    </div>
  );
}
