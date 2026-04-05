"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function RevenueChart({
  data,
}: {
  data: { day: string; revenue: number; date?: string }[];
}) {
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `₹${v}`} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload as {
                day?: string;
                date?: string;
                revenue?: number;
              };
              const revenue = Number(point?.revenue ?? 0);
              const share = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
              return (
                <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-md backdrop-blur">
                  <p className="text-xs font-medium text-muted-foreground">
                    {point?.date ? `${point.date} (IST day)` : point?.day ?? "Revenue"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {formatInr(revenue)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Contribution: {share.toFixed(1)}% of selected range
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
