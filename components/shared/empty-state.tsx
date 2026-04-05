"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  icon: Icon,
  primaryAction,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  primaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      ) : null}
      {primaryAction ? (
        <Button className={cn("mt-4")} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-10 text-center">
      <div className="text-sm font-semibold">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      ) : null}
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
