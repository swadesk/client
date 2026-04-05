"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  href?: string;
}) {
  const content = (
    <div className="group relative flex h-full overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] sm:p-6 dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/90">
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                  trend.positive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {trend.value}
              </span>
            ) : null}
            {hint ? <span className="truncate opacity-80">{hint}</span> : null}
          </div>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
          <Icon className="size-6" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
}
