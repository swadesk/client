"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DaySegRow = {
  date: string;
  Pending: number;
  Preparing: number;
  Ready: number;
  Completed: number;
  total: number;
};

const STATUS_COLORS: Record<keyof Omit<DaySegRow, "date" | "total">, string> = {
  Pending: "hsl(var(--chart-4))",
  Preparing: "hsl(var(--chart-2))",
  Ready: "hsl(var(--chart-1))",
  Completed: "hsl(var(--chart-3))",
};

export function DayWiseSegregationChart({ data }: { data: DaySegRow[] }) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as DaySegRow | undefined;
              if (!row) return null;
              return (
                <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-md backdrop-blur">
                  <p className="text-xs font-medium text-muted-foreground">{`${label ?? row.date} IST`}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{`Total ${row.total} orders`}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    <p>{`Pending: ${row.Pending}`}</p>
                    <p>{`Preparing: ${row.Preparing}`}</p>
                    <p>{`Ready: ${row.Ready}`}</p>
                    <p>{`Completed: ${row.Completed}`}</p>
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          <Bar dataKey="Pending" stackId="status" fill={STATUS_COLORS.Pending} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Preparing" stackId="status" fill={STATUS_COLORS.Preparing} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Ready" stackId="status" fill={STATUS_COLORS.Ready} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Completed" stackId="status" fill={STATUS_COLORS.Completed} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
