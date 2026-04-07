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

export function QrMenuSkeleton({ cells = 8 }: { cells?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {Array.from({ length: cells }).map((_, idx) => (
        <div
          key={idx}
          className="relative isolate w-full overflow-hidden rounded-2xl border border-black/[0.04] bg-muted/80 dark:border-white/[0.06]"
        >
          <div className="relative w-full pb-[125%]">
            <Skeleton className="absolute inset-0 rounded-none" />
            <Skeleton className="absolute right-2 top-2 z-30 size-9 rounded-full border border-white/15 bg-black/40 backdrop-blur-md" />
            <div className="absolute inset-x-0 bottom-0 flex w-full flex-col justify-end">
              <div className="rounded-t-md rounded-b-2xl border-t border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
                <Skeleton className="h-2.5 w-[90%] bg-white/25" />
                <Skeleton className="mt-1 h-2.5 w-12 bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
