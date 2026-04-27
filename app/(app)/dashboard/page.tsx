"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  Flame,
  IndianRupee,
  RefreshCw,
  Soup,
  Table2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/features/dashboard/stat-card";
import { OrderCard } from "@/components/features/orders/order-card";
import { TableCard } from "@/components/features/tables/table-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { fetchKitchenOrdersList } from "@/lib/floor-orders";
import { normalizeTablesResponse } from "@/lib/tables-normalize";
import { formatMoneyFromCents } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import { useRestaurantStore } from "@/store/restaurant-store";
import { useAuthStore } from "@/store/auth-store";
import { useRealtimeOrders } from "@/lib/realtime";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { QueryState, OrderGridSkeleton } from "@/components/shared/query-state";
import { canAccessRouteForUser } from "@/components/layout/nav-items";
import { getPostAuthRedirectPath } from "@/lib/auth-routing";
import { computeOrderMoneyTotals } from "@/lib/order-pricing";

const OrdersPerHourChart = dynamic(
  () =>
    import("@/components/features/charts/orders-hour-chart").then((m) => m.OrdersPerHourChart),
  { ssr: false },
);
const TopItemsChart = dynamic(
  () => import("@/components/features/charts/top-items-chart").then((m) => m.TopItemsChart),
  { ssr: false },
);
const IST_OFFSET_MINUTES = 330;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
const IST_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});

function as2(value: number) {
  return value.toString().padStart(2, "0");
}

function getIstDateKeyFromEpoch(epochMs: number): string {
  const istDate = new Date(epochMs + IST_OFFSET_MS);
  return `${istDate.getUTCFullYear()}-${as2(istDate.getUTCMonth() + 1)}-${as2(istDate.getUTCDate())}`;
}

function getIstTodayDateKey(): string {
  return getIstDateKeyFromEpoch(Date.now());
}

function parseDateKeyUtcCalendar(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0));
}

function getIstDayWindowIso(dateKey: string): { fromIso: string; toIso: string } {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  const startUtcMs = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0) - IST_OFFSET_MS;
  const endUtcMs = Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59, 999) - IST_OFFSET_MS;
  return { fromIso: new Date(startUtcMs).toISOString(), toIso: new Date(endUtcMs).toISOString() };
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = parseDateKeyUtcCalendar(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${as2(date.getUTCMonth() + 1)}-${as2(date.getUTCDate())}`;
}

function clampDateToToday(dateKey: string): string {
  const today = getIstTodayDateKey();
  return dateKey > today ? today : dateKey;
}

function orderTotalCents(order: import("@/types/order").Order): number {
  return computeOrderMoneyTotals(order).totalCents;
}

function formatIstTime(date: Date): string {
  return `${IST_TIME_FORMATTER.format(date)} IST`;
}

function buildTrendValue(current: number, previous: number): { value: string; positive: boolean } {
  if (previous <= 0) {
    if (current <= 0) return { value: "No change", positive: true };
    return { value: "New vs prev day", positive: true };
  }
  const deltaPct = ((current - previous) / previous) * 100;
  const sign = deltaPct >= 0 ? "+" : "";
  return {
    value: `${sign}${deltaPct.toFixed(1)}% vs prev day`,
    positive: deltaPct >= 0,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const restaurantId = useRestaurantStore((s) => s.activeRestaurantId);
  const user = useAuthStore((s) => s.user);
  const canViewDashboard = canAccessRouteForUser(user, "/dashboard");
  const [selectedDate, setSelectedDate] = React.useState(() => getIstTodayDateKey());
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  useRealtimeOrders(restaurantId);
  const currentDayWindow = React.useMemo(() => getIstDayWindowIso(selectedDate), [selectedDate]);
  const previousDayWindow = React.useMemo(
    () => getIstDayWindowIso(shiftDateKey(selectedDate, -1)),
    [selectedDate],
  );

  React.useEffect(() => {
    if (user && !canViewDashboard) router.replace(getPostAuthRedirectPath(user));
  }, [user, canViewDashboard, router]);

  const ordersQuery = useQuery({
    queryKey: qk.kitchenOrders(restaurantId ?? ""),
    queryFn: () => fetchKitchenOrdersList(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const tablesQuery = useQuery({
    queryKey: qk.adminTables(restaurantId ?? ""),
    queryFn: async () => {
      const raw = await api.admin.tables(restaurantId!);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const waitersQuery = useQuery({
    queryKey: qk.adminWaiters(restaurantId ?? ""),
    queryFn: () => api.admin.waiters(restaurantId!),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const restaurantProfileQuery = useQuery({
    queryKey: ["restaurant-profile", restaurantId],
    queryFn: () => api.restaurants.get(restaurantId!),
    enabled: !!restaurantId,
    staleTime: 60_000,
  });

  const dayOrdersQuery = useQuery({
    queryKey: ["dashboard.orders.day", restaurantId, selectedDate],
    queryFn: () =>
      api.admin.orders(restaurantId!, {
        from: currentDayWindow.fromIso,
        to: currentDayWindow.toIso,
      }),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const previousDayOrdersQuery = useQuery({
    queryKey: ["dashboard.orders.previous-day", restaurantId, selectedDate],
    queryFn: () =>
      api.admin.orders(restaurantId!, {
        from: previousDayWindow.fromIso,
        to: previousDayWindow.toIso,
      }),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const topItemsQuery = useQuery({
    queryKey: ["dashboard.top-items.day", restaurantId, selectedDate],
    queryFn: () =>
      api.admin.analytics.topItems(
        restaurantId!,
        currentDayWindow.fromIso,
        currentDayWindow.toIso,
        7,
      ),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const orders = ordersQuery.data ?? [];
  const dayOrders = dayOrdersQuery.data ?? [];
  const previousDayOrders = previousDayOrdersQuery.data ?? [];
  const tables = tablesQuery.data ?? [];
  const waiters = waitersQuery.data ?? [];
  const waiterIdToName = React.useMemo(
    () => new Map(waiters.map((w) => [w.id, w.name])),
    [waiters],
  );

  const isLoading =
    ordersQuery.isLoading ||
    tablesQuery.isLoading ||
    dayOrdersQuery.isLoading ||
    previousDayOrdersQuery.isLoading;
  const isError =
    ordersQuery.isError ||
    tablesQuery.isError ||
    dayOrdersQuery.isError ||
    previousDayOrdersQuery.isError;
  const error =
    ordersQuery.error ??
    tablesQuery.error ??
    dayOrdersQuery.error ??
    previousDayOrdersQuery.error;

  React.useEffect(() => {
    if (
      ordersQuery.isSuccess &&
      tablesQuery.isSuccess &&
      dayOrdersQuery.isSuccess &&
      previousDayOrdersQuery.isSuccess
    ) {
      setLastSyncedAt(new Date());
    }
  }, [
    ordersQuery.isSuccess,
    tablesQuery.isSuccess,
    dayOrdersQuery.isSuccess,
    previousDayOrdersQuery.isSuccess,
    selectedDate,
  ]);

  const ordersToday = dayOrders.length;
  const previousOrdersCount = previousDayOrders.length;
  const revenuePaise = dayOrders.reduce((sum, order) => sum + orderTotalCents(order), 0);
  const previousRevenuePaise = previousDayOrders.reduce(
    (sum, order) => sum + orderTotalCents(order),
    0,
  );
  const activeTables = tables.filter((t) => t.status !== "Available").length;
  const pendingKitchen = orders.filter((o) => o.status === "Pending").length;
  const ordersTrend = buildTrendValue(ordersToday, previousOrdersCount);
  const revenueTrend = buildTrendValue(revenuePaise, previousRevenuePaise);
  const topItemsChartData = topItemsQuery.data?.data ?? [];
  const topItem = topItemsChartData[0] ?? null;
  const ordersByHourData = React.useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${as2(hour)}:00`, orders: 0 }));
    for (const order of dayOrders) {
      const createdAtMs = Date.parse(order.createdAt);
      if (Number.isNaN(createdAtMs)) continue;
      const istDate = new Date(createdAtMs + IST_OFFSET_MS);
      const hour = istDate.getUTCHours();
      buckets[hour].orders += 1;
    }
    return buckets;
  }, [dayOrders]);
  const peakHour = React.useMemo(
    () => ordersByHourData.reduce((best, slot) => (slot.orders > best.orders ? slot : best), ordersByHourData[0]),
    [ordersByHourData],
  );
  const avgOrderValueCents = ordersToday > 0 ? Math.round(revenuePaise / ordersToday) : 0;
  const todayDateKey = getIstTodayDateKey();
  const previousDateKey = shiftDateKey(todayDateKey, -1);
  const isTodayActive = selectedDate === todayDateKey;
  const isPreviousDayActive = selectedDate === previousDateKey;

  const refreshAll = React.useCallback(() => {
    void ordersQuery.refetch();
    void tablesQuery.refetch();
    void dayOrdersQuery.refetch();
    void previousDayOrdersQuery.refetch();
    void topItemsQuery.refetch();
  }, [
    ordersQuery,
    tablesQuery,
    dayOrdersQuery,
    previousDayOrdersQuery,
    topItemsQuery,
  ]);

  const isRefreshing =
    ordersQuery.isRefetching ||
    tablesQuery.isRefetching ||
    dayOrdersQuery.isRefetching ||
    previousDayOrdersQuery.isRefetching ||
    topItemsQuery.isRefetching;

  if (!restaurantId) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Dashboard"
          description="Live snapshot of today’s service — orders, revenue, and floor status."
        />
        <EmptyState
          title="Select a restaurant"
          description="Choose a restaurant in the header to see its dashboard."
        />
      </div>
    );
  }
  if (user && !canViewDashboard) {
    return (
      <EmptyState
        title="Dashboard is restricted"
        description="You are being redirected to your allowed workspace."
      />
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        title="Dashboard"
        description="Live snapshot of today’s service — orders, revenue, and floor status."
      />

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/[0.04] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            max={getIstTodayDateKey()}
            onChange={(e) => {
              if (!e.target.value) return;
              setSelectedDate(clampDateToToday(e.target.value));
            }}
            className="h-8 w-[170px]"
          />
        </div>
        <Button
          size="sm"
          variant={isTodayActive ? "default" : "ghost"}
          onClick={() => setSelectedDate(todayDateKey)}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant={isPreviousDayActive ? "default" : "ghost"}
          onClick={() => setSelectedDate(shiftDateKey(selectedDate, -1))}
        >
          Previous day
        </Button>
        <Button size="sm" variant="outline" onClick={refreshAll} disabled={isRefreshing}>
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
        <Badge variant="outline" className="ml-auto">
          {lastSyncedAt
            ? `Last synced ${formatIstTime(lastSyncedAt)}`
            : "Syncing..."}
        </Badge>
      </div>

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refreshAll}
        empty={false}
        errorFallbackMessage="Failed to load dashboard data."
        loadingSkeleton={<OrderGridSkeleton />}
        className="space-y-12"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Orders today"
            value={`${ordersToday}`}
            icon={Flame}
            hint={`IST business date ${selectedDate}`}
            trend={ordersTrend}
            href="/orders"
          />
          <StatCard
            label="Revenue today"
            value={formatMoneyFromCents(revenuePaise)}
            icon={IndianRupee}
            hint="Gross sales (incl. GST)"
            trend={revenueTrend}
            href="/orders"
          />
          <StatCard
            label="Active tables"
            value={`${activeTables}`}
            icon={Table2}
            hint="Occupied or billing"
            href="/tables"
          />
          <StatCard
            label="Pending kitchen"
            value={`${pendingKitchen}`}
            icon={Soup}
            hint="Needs attention"
            trend={{ value: "SLA", positive: false }}
            href="/kitchen"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="px-6 pt-6 pb-4">
            <SectionHeader
              title="Room sections"
              description="Dining areas from your onboarding request, available after super-admin approval."
            />
          </div>
          <div className="px-6 pb-6">
            {restaurantProfileQuery.isLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ) : restaurantProfileQuery.isError ? (
              <p className="text-sm text-muted-foreground">Could not load venue profile.</p>
            ) : restaurantProfileQuery.data?.roomSections?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {restaurantProfileQuery.data.roomSections}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No room sections on file yet. They appear here once saved from onboarding and your venue is active.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Orders per hour</CardTitle>
              <CardDescription>
                {`IST ${selectedDate} • Peak ${peakHour?.hour ?? "00:00"} (${peakHour?.orders ?? 0} orders)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] overflow-hidden">
              {dayOrdersQuery.isLoading ? (
                <div className="h-[260px] min-h-[200px] animate-pulse rounded-lg bg-muted" />
              ) : (
                <OrdersPerHourChart
                  data={ordersByHourData}
                  dateLabel={selectedDate}
                />
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Top items for the day</CardTitle>
              <CardDescription>
                {topItem
                  ? `${topItem.name} leads with ${topItem.qty} orders • Avg order value ${formatMoneyFromCents(avgOrderValueCents)}`
                  : "No item sales for this IST business date yet."}
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[200px] overflow-hidden">
              {topItemsQuery.isLoading ? (
                <div className="h-[260px] min-h-[200px] animate-pulse rounded-lg bg-muted" />
              ) : (
                <TopItemsChart
                  data={topItemsChartData.length ? topItemsChartData : [{ name: "—", qty: 0 }]}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:min-h-[480px]">
            <div className="shrink-0 px-6 pt-6 pb-4">
              <SectionHeader
                title="Live orders"
                description="Recent tickets for this location"
                right={
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    View all <ChevronRight className="size-4" />
                  </Link>
                }
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 pb-6">
              {orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No active orders</p>
              ) : (
                <div className="grid max-h-[320px] min-h-0 gap-4 overflow-y-auto md:grid-cols-2">
                  {orders.map((o) => (
                    <Link key={o.id} href="/orders" className="block">
                      <OrderCard order={o} compact />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:min-h-[480px]">
            <div className="shrink-0 px-6 pt-6 pb-4">
              <SectionHeader
                title="Table status"
                description="Floor snapshot"
                right={
                  <Link
                    href="/tables"
                    className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    View all <ChevronRight className="size-4" />
                  </Link>
                }
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
              {tables.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">All tables available</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {tables.slice(0, 4).map((t) => (
                    <Link key={t.id} href="/tables" className="block">
                      <TableCard
                        table={t}
                        waiterName={t.waiterId ? waiterIdToName.get(t.waiterId) ?? null : null}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </QueryState>
    </div>
  );
}
