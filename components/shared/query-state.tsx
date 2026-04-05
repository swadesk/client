"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/empty-state";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

type QueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  empty: boolean;
  loadingSkeleton: React.ReactNode;
  errorFallbackMessage: string;
  /** Overrides default "Something went wrong" on error */
  errorTitle?: string;
  emptyState?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Standard loading / error / empty / success wrapper for TanStack Query UIs.
 */
export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  empty,
  loadingSkeleton,
  errorFallbackMessage,
  errorTitle,
  emptyState,
  children,
  className,
}: QueryStateProps) {
  if (isLoading) {
    return <div className={cn(className)}>{loadingSkeleton}</div>;
  }
  if (isError) {
    return (
      <ErrorState
        title={errorTitle}
        description={getErrorMessage(error, errorFallbackMessage)}
        onRetry={onRetry}
      />
    );
  }
  if (empty) {
    return <>{emptyState ?? null}</>;
  }
  return <div className={cn(className)}>{children}</div>;
}

export function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton key={idx} className="h-44 rounded-xl" />
      ))}
    </div>
  );
}

export function OrderGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton key={idx} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}

export function TableGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, idx) => (
        <Skeleton key={idx} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}

export function KitchenBoardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <Skeleton key={idx} className="h-[70vh] rounded-xl" />
      ))}
    </div>
  );
}

export function QrMenuSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex gap-3 rounded-2xl border border-black/[0.04] bg-card p-3 dark:border-white/[0.06]"
        >
          <Skeleton className="size-[4.75rem] shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-full max-w-[220px]" />
          </div>
          <Skeleton className="size-10 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
