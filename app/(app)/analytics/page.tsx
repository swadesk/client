"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { useActiveRestaurant } from "@/store/restaurant-store";
import { api } from "@/lib/api";
import { normalizeTablesResponse } from "@/lib/tables-normalize";
import { formatMoneyFromCents } from "@/lib/format";
import { computeOrderMoneyTotals } from "@/lib/order-pricing";
import { qk } from "@/lib/query-keys";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { Order } from "@/types/order";

const RevenueChart = dynamic(
  () => import("@/components/features/charts/revenue-chart").then((m) => m.RevenueChart),
  { ssr: false },
);
const TopItemsChart = dynamic(
  () =>
    import("@/components/features/charts/top-items-chart").then((m) => m.TopItemsChart),
  { ssr: false },
);
const OrdersPerHourChart = dynamic(
  () =>
    import("@/components/features/charts/orders-hour-chart").then((m) => m.OrdersPerHourChart),
  { ssr: false },
);
const DayWiseSegregationChart = dynamic(
  () =>
    import("@/components/features/charts/day-wise-segregation-chart").then(
      (m) => m.DayWiseSegregationChart,
    ),
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
const IST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kolkata",
});
const IST_HOUR_MIN_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
});
const IST_HOUR_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
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

function clampDateToToday(dateKey: string): string {
  const today = getIstTodayDateKey();
  return dateKey > today ? today : dateKey;
}

function getIstDayWindowIso(dateKey: string): { fromIso: string; toIso: string } {
  const [y, m, d] = dateKey.split("-").map((v) => Number(v));
  const startUtcMs = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0) - IST_OFFSET_MS;
  const endUtcMs = Date.UTC(y, (m || 1) - 1, d || 1, 23, 59, 59, 999) - IST_OFFSET_MS;
  return { fromIso: new Date(startUtcMs).toISOString(), toIso: new Date(endUtcMs).toISOString() };
}

function getIstRangeWindowIso(dateKey: string, days: 1 | 7 | 30): { fromIso: string; toIso: string } {
  const end = parseDateKeyUtcCalendar(dateKey);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startKey = `${start.getUTCFullYear()}-${as2(start.getUTCMonth() + 1)}-${as2(start.getUTCDate())}`;
  const endKey = `${end.getUTCFullYear()}-${as2(end.getUTCMonth() + 1)}-${as2(end.getUTCDate())}`;
  const from = getIstDayWindowIso(startKey).fromIso;
  const to = getIstDayWindowIso(endKey).toIso;
  return { fromIso: from, toIso: to };
}

function getStartDateKey(dateKey: string, days: 1 | 7 | 30): string {
  const end = parseDateKeyUtcCalendar(dateKey);
  end.setUTCDate(end.getUTCDate() - (days - 1));
  return `${end.getUTCFullYear()}-${as2(end.getUTCMonth() + 1)}-${as2(end.getUTCDate())}`;
}

function formatIstTime(date: Date): string {
  return `${IST_TIME_FORMATTER.format(date)} IST`;
}

function formatIstDateFromIso(iso: string): string {
  return IST_DATE_FORMATTER.format(new Date(iso));
}

function formatIstHmFromIso(iso: string): string {
  return `${IST_HOUR_MIN_FORMATTER.format(new Date(iso))} IST`;
}

function getIstHourFromIso(iso: string): number {
  const hourText = IST_HOUR_FORMATTER.format(new Date(iso));
  const hour = Number.parseInt(hourText, 10);
  return Number.isNaN(hour) ? 0 : Math.min(23, Math.max(0, hour));
}

function orderTotals(order: Order) {
  const m = computeOrderMoneyTotals(order);
  return {
    subtotalCents: m.subtotalCents,
    discountCents: m.discountCents,
    gstAmountCents: m.gstAmountCents,
    totalCents: m.totalCents,
  };
}

function formatDateForChart(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  const utc = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
    ? Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0, 0)
    : Date.parse(dateStr);
  const ist = new Date(utc + IST_OFFSET_MS);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[ist.getUTCDay()] ?? dateStr;
}

export default function AnalyticsPage() {
  const active = useActiveRestaurant();
  const restaurantId = active?.id ?? "";
  const [selectedDate, setSelectedDate] = React.useState(() => getIstTodayDateKey());
  const [rangeDays, setRangeDays] = React.useState<1 | 7 | 30>(7);
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const rangeStartDate = React.useMemo(
    () => getStartDateKey(selectedDate, rangeDays),
    [selectedDate, rangeDays],
  );
  const rangeWindow = React.useMemo(
    () => getIstRangeWindowIso(selectedDate, rangeDays),
    [selectedDate, rangeDays],
  );

  const revenueQuery = useQuery({
    queryKey: ["analytics.revenue", restaurantId, selectedDate, rangeDays],
    queryFn: () => api.admin.analytics.revenue(restaurantId, rangeWindow.fromIso, rangeWindow.toIso),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const topItemsQuery = useQuery({
    queryKey: ["analytics.topItems", restaurantId, selectedDate, rangeDays],
    queryFn: () =>
      api.admin.analytics.topItems(restaurantId, rangeWindow.fromIso, rangeWindow.toIso, 8),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const tablesQuery = useQuery({
    queryKey: qk.adminTables(restaurantId),
    queryFn: async () => {
      const raw = await api.admin.tables(restaurantId);
      return normalizeTablesResponse(raw);
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });
  const waitersQuery = useQuery({
    queryKey: qk.adminWaiters(restaurantId),
    queryFn: () => api.admin.waiters(restaurantId),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });
  const ordersRangeQuery = useQuery({
    queryKey: ["analytics.orders.range", restaurantId, selectedDate, rangeDays],
    queryFn: () => api.admin.orders(restaurantId, { from: rangeWindow.fromIso, to: rangeWindow.toIso }),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const dayWindow = React.useMemo(() => getIstDayWindowIso(selectedDate), [selectedDate]);
  const dayOrdersQuery = useQuery({
    queryKey: ["analytics.orders.day", restaurantId, selectedDate],
    queryFn: () =>
      api.admin.orders(restaurantId, {
        from: dayWindow.fromIso,
        to: dayWindow.toIso,
      }),
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  const revenue = (revenueQuery.data?.data ?? []).map((d) => ({
    day: formatDateForChart(d.date),
    revenue: Math.round(d.revenue / 100),
    date: d.date,
  }));
  const topItems = (topItemsQuery.data?.data ?? []).map((d) => ({
    name: d.name,
    qty: d.qty,
  }));
  const dayOrders = dayOrdersQuery.data ?? [];
  const rangeOrders = ordersRangeQuery.data ?? [];
  const waiterIdToName = React.useMemo(
    () => new Map((waitersQuery.data ?? []).map((w) => [w.id, w.name])),
    [waitersQuery.data],
  );
  const tableNumberToWaiterId = React.useMemo(
    () => new Map((tablesQuery.data ?? []).map((t) => [t.number, t.waiterId ?? null])),
    [tablesQuery.data],
  );

  const resolveOrderAttendant = React.useCallback(
    (order: Order): string => {
      const record = order as unknown as Record<string, unknown>;
      const possibleNameKeys = ["attendedByName", "servedByName", "waiterName", "completedByName"];
      for (const key of possibleNameKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value;
      }
      const possibleIdKeys = ["attendedByWaiterId", "servedByWaiterId", "waiterId", "completedByWaiterId"];
      for (const key of possibleIdKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
          return waiterIdToName.get(value) ?? value;
        }
      }
      const tableWaiterId = tableNumberToWaiterId.get(order.tableNumber);
      if (tableWaiterId) {
        return `${waiterIdToName.get(tableWaiterId) ?? tableWaiterId} (table assignment)`;
      }
      return "Not available from API";
    },
    [waiterIdToName, tableNumberToWaiterId],
  );

  const ordersForHourlyGraph = rangeDays === 1 ? dayOrders : rangeOrders;
  const perHour = React.useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour: `${as2(hour)}:00`, orders: 0 }));
    for (const order of ordersForHourlyGraph) {
      const hour = getIstHourFromIso(order.createdAt);
      buckets[hour].orders += 1;
    }
    return buckets;
  }, [ordersForHourlyGraph]);

  const isLoading =
    revenueQuery.isLoading ||
    topItemsQuery.isLoading ||
    ordersRangeQuery.isLoading ||
    (rangeDays === 1 && dayOrdersQuery.isLoading);
  const isRefreshing =
    revenueQuery.isRefetching ||
    topItemsQuery.isRefetching ||
    dayOrdersQuery.isRefetching ||
    ordersRangeQuery.isRefetching;
  const totalRevenueCents = (revenueQuery.data?.data ?? []).reduce((sum, row) => sum + row.revenue, 0);
  const avgRevenuePerDayCents =
    (revenueQuery.data?.data ?? []).length > 0
      ? Math.round(totalRevenueCents / (revenueQuery.data?.data?.length ?? 1))
      : 0;
  const peakRevenueDay = (revenueQuery.data?.data ?? []).reduce<{ date: string; revenue: number } | null>(
    (best, row) => (best == null || row.revenue > best.revenue ? row : best),
    null,
  );
  const topItem = topItems[0] ?? null;
  const totalTopQty = topItems.reduce((sum, row) => sum + row.qty, 0);
  const peakHour = perHour.reduce<{ hour: string; orders: number } | null>(
    (best, row) => (best == null || row.orders > best.orders ? row : best),
    null,
  );
  const auditRows = React.useMemo(() => {
    return rangeOrders
      .map((order) => {
        const totals = orderTotals(order);
        return {
          dateIst: formatIstDateFromIso(order.createdAt),
          timeIst: formatIstHmFromIso(order.createdAt),
          orderId: order.id,
          invoiceNumber: order.invoiceNumber ?? "-",
          tableNumber: order.tableNumber,
          status: order.status,
          itemQty: order.items.reduce((sum, item) => sum + item.qty, 0),
          lineItems: order.items.map((item) => `${item.qty}x ${item.name}`).join(", "),
          subtotalCents: totals.subtotalCents,
          discountCents: totals.discountCents,
          gstCents: totals.gstAmountCents,
          totalCents: totals.totalCents,
          attendedBy: resolveOrderAttendant(order),
          notes: order.notes ?? "",
        };
      })
      .sort((a, b) =>
        a.dateIst === b.dateIst
          ? a.timeIst.localeCompare(b.timeIst)
          : a.dateIst.localeCompare(b.dateIst),
      );
  }, [rangeOrders, resolveOrderAttendant]);
  const dayWiseLog = React.useMemo(() => {
    const grouped = new Map<string, { orders: number; revenueCents: number; attendants: Map<string, number> }>();
    for (const row of auditRows) {
      const bucket = grouped.get(row.dateIst) ?? {
        orders: 0,
        revenueCents: 0,
        attendants: new Map<string, number>(),
      };
      bucket.orders += 1;
      bucket.revenueCents += row.totalCents;
      const current = bucket.attendants.get(row.attendedBy) ?? 0;
      bucket.attendants.set(row.attendedBy, current + 1);
      grouped.set(row.dateIst, bucket);
    }
    return Array.from(grouped.entries())
      .map(([dateIst, data]) => {
        const topAttendant = Array.from(data.attendants.entries()).sort((a, b) => b[1] - a[1])[0];
        return {
          dateIst,
          orders: data.orders,
          revenueCents: data.revenueCents,
          avgOrderValueCents: data.orders > 0 ? Math.round(data.revenueCents / data.orders) : 0,
          topAttendant: topAttendant ? `${topAttendant[0]} (${topAttendant[1]})` : "-",
        };
      })
      .sort((a, b) => a.dateIst.localeCompare(b.dateIst));
  }, [auditRows]);
  const dayWiseSegregationData = React.useMemo(() => {
    const grouped = new Map<
      string,
      { Pending: number; Preparing: number; Ready: number; Completed: number; total: number }
    >();
    for (const order of rangeOrders) {
      const date = formatIstDateFromIso(order.createdAt);
      const bucket = grouped.get(date) ?? {
        Pending: 0,
        Preparing: 0,
        Ready: 0,
        Completed: 0,
        total: 0,
      };
      if (order.status === "Pending") bucket.Pending += 1;
      else if (order.status === "Preparing") bucket.Preparing += 1;
      else if (order.status === "Ready") bucket.Ready += 1;
      else bucket.Completed += 1;
      bucket.total += 1;
      grouped.set(date, bucket);
    }
    return Array.from(grouped.entries())
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [rangeOrders]);

  React.useEffect(() => {
    if (
      revenueQuery.isSuccess &&
      topItemsQuery.isSuccess &&
      dayOrdersQuery.isSuccess &&
      ordersRangeQuery.isSuccess
    ) {
      setLastSyncedAt(new Date());
    }
  }, [
    revenueQuery.isSuccess,
    topItemsQuery.isSuccess,
    dayOrdersQuery.isSuccess,
    ordersRangeQuery.isSuccess,
    selectedDate,
    rangeDays,
  ]);

  const refreshAll = React.useCallback(() => {
    void revenueQuery.refetch();
    void topItemsQuery.refetch();
    void dayOrdersQuery.refetch();
    void ordersRangeQuery.refetch();
    void tablesQuery.refetch();
    void waitersQuery.refetch();
  }, [revenueQuery, topItemsQuery, dayOrdersQuery, ordersRangeQuery, tablesQuery, waitersQuery]);

  const downloadAuditExcel = React.useCallback(async () => {
    if (auditRows.length === 0) {
      toast.info("No audit rows found for selected range.");
      return;
    }
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "qRyte";
      workbook.created = new Date();

      const summarySheet = workbook.addWorksheet("Day Wise Summary");
      summarySheet.columns = [
        { header: "Date (IST)", key: "dateIst", width: 14 },
        { header: "Orders", key: "orders", width: 10 },
        { header: "Revenue (INR)", key: "revenueInr", width: 16 },
        { header: "Avg Order Value (INR)", key: "avgInr", width: 20 },
        { header: "Top Attendant", key: "topAttendant", width: 28 },
      ];
      for (const row of dayWiseLog) {
        summarySheet.addRow({
          dateIst: row.dateIst,
          orders: row.orders,
          revenueInr: Number((row.revenueCents / 100).toFixed(2)),
          avgInr: Number((row.avgOrderValueCents / 100).toFixed(2)),
          topAttendant: row.topAttendant,
        });
      }

      const detailsSheet = workbook.addWorksheet("Order Audit Details");
      detailsSheet.columns = [
        { header: "Date (IST)", key: "dateIst", width: 14 },
        { header: "Time (IST)", key: "timeIst", width: 12 },
        { header: "Order ID", key: "orderId", width: 26 },
        { header: "Invoice", key: "invoiceNumber", width: 14 },
        { header: "Table", key: "tableNumber", width: 10 },
        { header: "Status", key: "status", width: 12 },
        { header: "Items Qty", key: "itemQty", width: 10 },
        { header: "Line Items", key: "lineItems", width: 45 },
        { header: "Subtotal (INR)", key: "subtotalInr", width: 14 },
        { header: "Discount (INR)", key: "discountInr", width: 14 },
        { header: "GST (INR)", key: "gstInr", width: 12 },
        { header: "Total (INR)", key: "totalInr", width: 14 },
        { header: "Attended By", key: "attendedBy", width: 28 },
        { header: "Notes", key: "notes", width: 30 },
      ];
      for (const row of auditRows) {
        detailsSheet.addRow({
          dateIst: row.dateIst,
          timeIst: row.timeIst,
          orderId: row.orderId,
          invoiceNumber: row.invoiceNumber,
          tableNumber: row.tableNumber,
          status: row.status,
          itemQty: row.itemQty,
          lineItems: row.lineItems,
          subtotalInr: Number((row.subtotalCents / 100).toFixed(2)),
          discountInr: Number((row.discountCents / 100).toFixed(2)),
          gstInr: Number((row.gstCents / 100).toFixed(2)),
          totalInr: Number((row.totalCents / 100).toFixed(2)),
          attendedBy: row.attendedBy,
          notes: row.notes,
        });
      }

      for (const sheet of [summarySheet, detailsSheet]) {
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: "FF1F2937" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        headerRow.alignment = { vertical: "middle", horizontal: "left" };
        headerRow.height = 20;
        sheet.views = [{ state: "frozen", ySplit: 1 }];
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qRyte-audit-${selectedDate}-${rangeDays}d.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Audit Excel downloaded.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate Excel report.");
    }
  }, [auditRows, dayWiseLog, selectedDate, rangeDays]);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Analytics"
        description={
          active
            ? `Revenue, bestsellers, and rush hours for ${active.name}.`
            : "Revenue trends, top items, and ordering peaks."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
            <Button size="sm" variant={rangeDays === 1 ? "default" : "ghost"} onClick={() => setRangeDays(1)}>
              1D
            </Button>
            <Button size="sm" variant={rangeDays === 7 ? "default" : "ghost"} onClick={() => setRangeDays(7)}>
              7D
            </Button>
            <Button size="sm" variant={rangeDays === 30 ? "default" : "ghost"} onClick={() => setRangeDays(30)}>
              30D
            </Button>
            <Button size="sm" variant="outline" onClick={refreshAll} disabled={isRefreshing}>
              <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button size="sm" onClick={downloadAuditExcel} disabled={auditRows.length === 0}>
              Download audit Excel
            </Button>
            <Badge variant="outline">
              {lastSyncedAt ? `Last synced ${formatIstTime(lastSyncedAt)}` : "Syncing..."}
            </Badge>
          </div>
        }
      />

      {!restaurantId ? (
        <p className="text-sm text-muted-foreground">Select a restaurant to view analytics.</p>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Daily revenue (₹)</CardTitle>
            <CardDescription>
              {`IST range ${rangeDays}D ending ${selectedDate} • Total ${formatMoneyFromCents(totalRevenueCents)} • Avg/day ${formatMoneyFromCents(avgRevenuePerDayCents)}`}
              {peakRevenueDay ? ` • Peak day ${formatDateForChart(peakRevenueDay.date)}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] overflow-hidden">
            {isLoading ? (
              <div className="h-[280px] min-h-[200px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <RevenueChart data={revenue.length ? revenue : [{ day: "—", revenue: 0 }]} />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03]">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top selling items</CardTitle>
            <CardDescription>
              {topItem
                ? `${topItem.name} is leading with ${topItem.qty} orders • Top-8 volume ${totalTopQty}`
                : "No item sales found for this IST range yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] overflow-hidden">
            {isLoading ? (
              <div className="h-[280px] min-h-[200px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <TopItemsChart data={topItems.length ? topItems : [{ name: "—", qty: 0 }]} />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Orders per hour</CardTitle>
            <CardDescription>
              {rangeDays === 1
                ? `IST day ${selectedDate} • Peak ${peakHour?.hour ?? "—"} (${peakHour?.orders ?? 0} orders) • Total orders ${perHour.reduce((sum, slot) => sum + slot.orders, 0)}`
                : `IST ${rangeDays}D range ending ${selectedDate} • Peak ${peakHour?.hour ?? "—"} (${peakHour?.orders ?? 0} orders) • Total orders ${perHour.reduce((sum, slot) => sum + slot.orders, 0)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px] overflow-hidden">
            {isLoading ? (
              <div className="h-[280px] min-h-[200px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <OrdersPerHourChart
                data={perHour.length ? perHour : [{ hour: "12p", orders: 0 }]}
                dateLabel={
                  rangeDays === 1
                    ? selectedDate
                    : `${rangeStartDate} to ${selectedDate}`
                }
              />
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Day-wise segregation</CardTitle>
            <CardDescription>
              {`IST ${rangeDays}D range ending ${selectedDate} split by status (Pending, Preparing, Ready, Completed).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[240px] overflow-hidden">
            {isLoading ? (
              <div className="h-[300px] min-h-[240px] animate-pulse rounded-lg bg-muted" />
            ) : (
              <DayWiseSegregationChart
                data={
                  dayWiseSegregationData.length
                    ? dayWiseSegregationData
                    : [
                        {
                          date: selectedDate,
                          Pending: 0,
                          Preparing: 0,
                          Ready: 0,
                          Completed: 0,
                          total: 0,
                        },
                      ]
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.06] dark:bg-white/[0.03] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Audit log and reports</CardTitle>
            <CardDescription>
              {`Day-wise summary + order-level audit for IST range ${rangeDays}D ending ${selectedDate}. Attendant uses backend fields when available; otherwise table assignment fallback.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date (IST)</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Avg order</TableHead>
                    <TableHead>Top attendant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayWiseLog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No day-wise rows for selected range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dayWiseLog.map((row) => (
                      <TableRow key={row.dateIst}>
                        <TableCell>{row.dateIst}</TableCell>
                        <TableCell>{row.orders}</TableCell>
                        <TableCell>{formatMoneyFromCents(row.revenueCents)}</TableCell>
                        <TableCell>{formatMoneyFromCents(row.avgOrderValueCents)}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{row.topAttendant}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Order items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Attended by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No order audit details for selected range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditRows.slice(0, 20).map((row) => (
                      <TableRow key={row.orderId}>
                        <TableCell>{row.dateIst}</TableCell>
                        <TableCell>{row.timeIst}</TableCell>
                        <TableCell className="max-w-[220px] truncate">{row.orderId}</TableCell>
                        <TableCell>{row.tableNumber}</TableCell>
                        <TableCell className="max-w-[340px] truncate" title={row.lineItems}>
                          {row.lineItems || "-"}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{formatMoneyFromCents(row.totalCents)}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{row.attendedBy}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
