"use client";

import { useState } from "react";
import { Check, QrCode } from "lucide-react";

import { cn } from "@/lib/utils";

type MenuItem = { name: string; price: string };

type TablePreview = {
  id: string;
  item: string;
  status: "New" | "Preparing" | "Ready";
  menu: MenuItem[];
};

const tables: TablePreview[] = [
  {
    id: "T12",
    item: "Butter chicken, garlic naan",
    status: "Preparing",
    menu: [
      { name: "Butter chicken", price: "₹420" },
      { name: "Garlic naan", price: "₹80" },
      { name: "Filter coffee", price: "₹90" },
    ],
  },
  {
    id: "T04",
    item: "Veg thali",
    status: "Ready",
    menu: [
      { name: "Veg thali", price: "₹280" },
      { name: "Masala chaas", price: "₹60" },
    ],
  },
  {
    id: "T09",
    item: "Filter coffee",
    status: "New",
    menu: [
      { name: "Filter coffee", price: "₹90" },
      { name: "Masala dosa", price: "₹180" },
    ],
  },
];

const statusTone: Record<TablePreview["status"], string> = {
  Preparing: "text-amber-700 bg-amber-500/10 dark:text-amber-300",
  Ready: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300",
  New: "text-primary bg-primary/10",
};

export function LandingDemo() {
  const [selectedId, setSelectedId] = useState(tables[0].id);
  const [sent, setSent] = useState(false);
  const selected = tables.find((table) => table.id === selectedId) ?? tables[0];

  function selectTable(id: string) {
    setSelectedId(id);
    setSent(false);
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-32px_hsl(222_47%_11%/0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative size-2 rounded-full bg-emerald-500" />
          </span>
          <p className="truncate text-sm font-medium">Live service</p>
        </div>
        <p className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          +29% turnover
        </p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        {[
          { label: "In progress", value: "42" },
          { label: "Avg prep", value: "13m" },
          { label: "Today", value: "₹1.84L" },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0 px-3 py-3 sm:px-4">
            <p className="truncate text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
      <div role="group" aria-label="Open tables" className="divide-y divide-border">
        {tables.map((table) => {
          const active = table.id === selected.id;
          return (
            <button
              key={table.id}
              type="button"
              aria-pressed={active}
              onClick={() => selectTable(table.id)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5",
                active ? "bg-primary/10" : "hover:bg-muted/60"
              )}
            >
              <span className="w-9 shrink-0 font-mono text-xs text-muted-foreground">{table.id}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{table.item}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", statusTone[table.status])}>
                {table.status}
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-t border-border bg-muted/30 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Guest menu</p>
            <p className="mt-0.5 text-sm font-medium">Table {selected.id.slice(1)}</p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <QrCode className="size-4" aria-hidden />
          </span>
        </div>
        <ul key={selected.id} className="landing-motion mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card motion-safe:animate-[landing-rise_0.35s_ease_both]">
          {selected.menu.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span>{item.name}</span>
              <span className="shrink-0 font-medium tabular-nums">{item.price}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setSent(true)}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {sent ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Sent to the kitchen
            </>
          ) : (
            "Place order"
          )}
        </button>
      </div>
    </div>
  );
}
