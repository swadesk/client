"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TopItemsChart({
  data,
}: {
  data: { name: string; qty: number }[];
}) {
  const totalQty = data.reduce((sum, row) => sum + row.qty, 0);
  const ranked = [...data]
    .sort((a, b) => b.qty - a.qty)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const qty = Number(payload[0]?.value ?? 0);
              const name = typeof label === "string" ? label : "Item";
              const share = totalQty > 0 ? (qty / totalQty) * 100 : 0;
              const itemRank = ranked.find((row) => row.name === name && row.qty === qty)?.rank ?? 0;
              return (
                <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-md backdrop-blur">
                  <p className="text-xs font-medium text-muted-foreground">{name}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{qty} orders</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {itemRank > 0 ? `Rank #${itemRank}` : "Rank unavailable"} • {share.toFixed(1)}% contribution
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="qty" fill="hsl(var(--chart-3))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
