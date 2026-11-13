"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const screens = [
  {
    id: "service",
    label: "Service",
    title: "The room, right now",
    subtitle: "Orders in progress, how long food is taking, and how the night is going.",
    metrics: [
      { label: "Orders in queue", value: "42" },
      { label: "Avg prep time", value: "13 min" },
      { label: "Table turnover", value: "+29%" },
    ],
    bars: [38, 55, 46, 82, 68, 90, 74],
    mix: [
      { label: "Dine-in", value: 61 },
      { label: "Takeaway", value: 27 },
      { label: "Delivery", value: 12 },
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    title: "The kitchen board",
    subtitle: "Which tickets are cooking, and which ones are running late.",
    metrics: [
      { label: "Ready in 15 min", value: "78%" },
      { label: "Missed window", value: "2%" },
      { label: "Peak load", value: "7:45 PM" },
    ],
    bars: [24, 40, 62, 88, 96, 70, 48],
    mix: [
      { label: "Grill", value: 44 },
      { label: "Tandoor", value: 36 },
      { label: "Pass", value: 20 },
    ],
  },
  {
    id: "revenue",
    label: "Revenue",
    title: "What sold tonight",
    subtitle: "Which dishes carried the night, and which ones did not.",
    metrics: [
      { label: "Top item growth", value: "+41%" },
      { label: "Low-margin items", value: "6" },
      { label: "Average order", value: "+18%" },
    ],
    bars: [30, 36, 44, 52, 61, 70, 84],
    mix: [
      { label: "Mains", value: 58 },
      { label: "Starters", value: 27 },
      { label: "Drinks", value: 15 },
    ],
  },
];

export function ProductScreensShowcase() {
  const [active, setActive] = useState(0);
  const screen = screens[active];

  return (
    <section id="screens" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Product</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              The same shift, three screens.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Tap one. Service, kitchen, or what sold tonight.
            </p>
          </div>
          <div role="tablist" aria-label="Product screens" className="flex w-full gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:w-auto">
            {screens.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active === index}
                onClick={() => setActive(index)}
                className={cn(
                  "h-9 flex-1 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:flex-none sm:px-4",
                  active === index ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <article role="tabpanel" className="mt-8 min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
          <div key={screen.id} className="landing-motion motion-safe:animate-[landing-rise_0.4s_ease_both]">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h3 className="text-lg font-semibold tracking-tight">{screen.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{screen.subtitle}</p>
          </div>
          <div className="grid min-w-0 gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <div className="min-w-0 rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Tonight</p>
              <div className="mt-4 flex h-28 items-end gap-2">
                {screen.bars.map((height, index) => (
                  <div key={`${screen.id}-${index}`} className="flex h-full min-w-0 flex-1 items-end">
                    <div
                      className="landing-motion w-full origin-bottom rounded-t bg-primary/75 motion-safe:animate-[landing-grow-y_0.55s_ease_both]"
                      style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Mix</p>
              <ul className="mt-4 space-y-3">
                {screen.mix.map((row) => (
                  <li key={row.label}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{row.label}</span>
                      <span className="shrink-0 font-medium tabular-nums">{row.value}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/15">
                      <div
                        className="landing-motion h-1.5 origin-left rounded-full bg-primary motion-safe:animate-[landing-grow_0.7s_ease_both]"
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <dl className="grid border-t border-border sm:grid-cols-3">
            {screen.metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-l sm:first:border-l-0">
                <dt className="truncate text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="mt-1 text-xl font-semibold tracking-tight">{metric.value}</dd>
              </div>
            ))}
          </dl>
          </div>
        </article>
      </div>
    </section>
  );
}
