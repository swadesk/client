"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function OrdersPerHourChart({
  data,
  dateLabel,
}: {
  data: { hour: string; orders: number }[];
  dateLabel?: string;
}) {
  const totalOrders = data.reduce((sum, row) => sum + row.orders, 0);

  function getHourRange(hourLabel: string): string {
    const hour = Number.parseInt(hourLabel.slice(0, 2), 10);
    if (Number.isNaN(hour)) return `${hourLabel} IST`;
    return `${hourLabel} - ${hour.toString().padStart(2, "0")}:59 IST`;
  }

  function trafficLabel(orders: number): string {
    if (orders >= 10) return "Very busy";
    if (orders >= 6) return "Busy";
    if (orders >= 3) return "Moderate";
    if (orders > 0) return "Low";
    return "No activity";
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="hour" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const orders = Number(payload[0]?.value ?? 0);
              const share = totalOrders > 0 ? (orders / totalOrders) * 100 : 0;
              const hour = typeof label === "string" ? label : "00:00";
              const dateTimeText = dateLabel
                ? `${dateLabel} - ${getHourRange(hour)}`
                : getHourRange(hour);
              return (
                <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-md backdrop-blur">
                  <p className="text-xs font-medium text-muted-foreground">{dateTimeText}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{orders} orders</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {trafficLabel(orders)} • {share.toFixed(1)}% of day volume
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="hsl(var(--chart-1))"
            fill="hsl(var(--chart-1))"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
