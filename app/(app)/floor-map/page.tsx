"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LayoutGrid } from "lucide-react";
import { api } from "@/lib/api";
import { normalizeTablesResponse } from "@/lib/tables-normalize";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useRealtimeOrders } from "@/lib/realtime";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState, TableGridSkeleton } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Table, TableStatus } from "@/types/table";

type FloorFilter = "All" | TableStatus;

function TableNode({ table, waiterName }: { table: Table; waiterName?: string | null }) {
  const statusStyles: Record<TableStatus, string> = {
    Available:
      "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-200/60 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    Occupied:
      "border-amber-200 bg-amber-50 text-amber-800 shadow-amber-200/60 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    Billing:
      "border-blue-200 bg-blue-50 text-blue-800 shadow-blue-200/60 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  };

  return (
    <Link
      href="/tables"
      className={cn(
        "group flex min-h-32 flex-col justify-between rounded-[26px] border-2 p-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.18)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_32px_-18px_rgba(0,0,0,0.22)]",
        statusStyles[table.status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
          Table
        </span>
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] dark:bg-white/10">
          {table.status}
        </span>
      </div>
      <div>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">T{table.number}</div>
        <div className="mt-1 text-xs font-medium opacity-80">{table.seats} seats</div>
        {waiterName ? (
          <div className="mt-2 text-[11px] font-medium opacity-80">{waiterName}</div>
        ) : null}
        <div className="mt-3 flex items-center justify-between text-[11px] font-medium opacity-70">
          <span>{table.status}</span>
          <span className="transition-transform group-hover:translate-x-0.5">Open</span>
        </div>
      </div>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "blue";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      : tone === "blue"
        ? "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
        : "bg-white text-foreground dark:bg-white/[0.03]";

  return (
    <div className={cn("rounded-2xl border border-black/[0.04] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06]", toneClass)}>
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default function FloorMapPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  useRealtimeOrders(restaurantId);
  const [filter, setFilter] = React.useState<FloorFilter>("All");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.adminTables(restaurantId ?? ""),
    queryFn: async () => {
      const raw = await api.admin.tables(restaurantId!);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId,
  });

  const { data: waitersData } = useQuery({
    queryKey: qk.adminWaiters(restaurantId ?? ""),
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId,
  });

  const tables = data ?? [];
  const waiters = waitersData ?? [];
  const waiterIdToName = React.useMemo(
    () => new Map(waiters.map((w) => [w.id, w.name])),
    [waiters],
  );
  const filteredTables =
    filter === "All" ? tables : tables.filter((table) => table.status === filter);
  const sortedTables = [...filteredTables].sort((a, b) => {
    const priority: Record<TableStatus, number> = {
      Occupied: 0,
      Billing: 1,
      Available: 2,
    };
    if (filter !== "All") return a.number - b.number;
    return priority[a.status] - priority[b.status] || a.number - b.number;
  });

  if (!restaurantId) {
    return (
      <div className="space-y-12">
        <PageHeader
          title="Floor map"
          description="Visual layout of tables and seating on your floor."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to view its floor plan."
        />
      </div>
    );
  }

  const occupiedCount = tables.filter((table) => table.status === "Occupied").length;
  const billingCount = tables.filter((table) => table.status === "Billing").length;
  const activeCount = occupiedCount + billingCount;
  const occupancy = tables.length === 0 ? 0 : Math.round((activeCount / tables.length) * 100);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Floor map"
        description="Visual layout of tables and seating on your floor."
        actions={
          <Link
            href="/tables"
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage tables
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        <SummaryCard label="Occupancy" value={`${occupancy}%`} />
        <SummaryCard label="Active tables" value={`${activeCount}`} tone="amber" />
        <SummaryCard label="Billing now" value={`${billingCount}`} tone="blue" />
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        empty={!isLoading && !isError && tables.length === 0}
        errorFallbackMessage="Failed to load floor map."
        loadingSkeleton={<TableGridSkeleton />}
        emptyState={
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-12 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <EmptyState
              title="No tables"
              description="Add tables to see your floor map."
              primaryAction={{ label: "Add tables", onClick: () => router.push("/tables") }}
            />
          </div>
        }
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Live floor board</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Scan active tables fast and jump into management with one tap.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["All", "Available", "Occupied", "Billing"] as const).map((item) => (
                    <Button
                      key={item}
                      variant={filter === item ? "default" : "secondary"}
                      className={cn(filter === item && "shadow-sm")}
                      onClick={() => setFilter(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.05))] p-4 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.05))]">
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-black/[0.04] bg-white/80 px-4 py-3 backdrop-blur dark:border-white/[0.06] dark:bg-white/[0.03]">
                  <span className="text-sm font-medium text-foreground">{sortedTables.length} tables in view</span>
                  <span className="text-xs text-muted-foreground">{activeCount} currently active</span>
                  <span className="text-xs text-muted-foreground">{billingCount} billing</span>
                </div>

                {sortedTables.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-white/70 px-4 py-12 text-center text-sm text-muted-foreground dark:bg-white/[0.03]">
                    No tables match this filter
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {sortedTables.map((table: Table) => (
                      <TableNode
                        key={table.id}
                        table={table}
                        waiterName={table.waiterId ? waiterIdToName.get(table.waiterId) ?? null : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-black/[0.04] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                  <LayoutGrid className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Operations summary</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use filters to isolate active areas and jump into table management quickly.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {([
                  { label: "Available", className: "bg-emerald-500" },
                  { label: "Occupied", className: "bg-amber-500" },
                  { label: "Billing", className: "bg-blue-500" },
                ] as const).map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-muted/30 px-4 py-3">
                    <span className={cn("size-3 rounded-full", item.className)} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl bg-muted/30 p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Quick action
                </div>
                <Link
                  href="/tables"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  Manage tables
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
