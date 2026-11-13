"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import { serviceStory, storyItems, storyTable, storyTotal } from "./landing-story";

const floorTables = [
  { id: "04", label: "Eating" },
  { id: "07", label: "Eating" },
  { id: "12", label: "Order", hot: true },
  { id: "09", label: "Kitchen" },
  { id: "02", label: "Free", free: true },
  { id: "15", label: "Paying" },
];

function moduleOn(x: number, y: number) {
  const finder = (ox: number, oy: number) => {
    if (x < ox || y < oy || x >= ox + 7 || y >= oy + 7) return null;
    const lx = x - ox;
    const ly = y - oy;
    const edge = lx === 0 || ly === 0 || lx === 6 || ly === 6;
    const core = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
    return edge || core;
  };
  if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
  if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
  if (y === 6 && x > 7 && x < 13) return x % 2 === 0;
  if (x === 6 && y > 7 && y < 13) return y % 2 === 0;
  return (x * 3 + y * 5) % 4 !== 0;
}

function QrMark() {
  const cells: string[] = [];
  for (let y = 0; y < 21; y += 1) {
    for (let x = 0; x < 21; x += 1) {
      if (moduleOn(x, y)) cells.push(`${x}-${y}`);
    }
  }
  return (
    <svg viewBox="0 0 21 21" className="mx-auto size-[6.75rem]" aria-hidden>
      {cells.map((id) => {
        const [x, y] = id.split("-").map(Number);
        return <rect key={id} x={x} y={y} width="1" height="1" rx="0.15" fill="hsl(222 47% 16%)" />;
      })}
    </svg>
  );
}

function OrderLines() {
  return (
    <ul className="space-y-1.5">
      {storyItems.map((item) => (
        <li key={item.name} className="flex items-baseline justify-between gap-3 text-xs">
          <span>{item.name}</span>
          <span className="shrink-0 tabular-nums text-[hsl(222_12%_42%)]">{item.price}</span>
        </li>
      ))}
    </ul>
  );
}

function ScanScene() {
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div className="w-40 rounded-2xl bg-[hsl(40_33%_98%)] px-4 py-5 text-center text-[hsl(222_47%_11%)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.75)]">
        <QrMark />
        <p className="mt-3 text-sm font-semibold">Scan to order</p>
        <p className="mt-0.5 text-[11px] text-[hsl(222_12%_42%)]">No app needed</p>
      </div>
      <div className="h-8 w-px bg-white/20 sm:h-px sm:w-12" aria-hidden />
      <div className="landing-motion w-[13.25rem] rounded-[1.6rem] border border-white/10 bg-[hsl(222_40%_18%)] p-1.5 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.85)] motion-safe:animate-[landing-rise_0.55s_ease_both]">
        <div className="rounded-[1.2rem] bg-[hsl(40_33%_98%)] px-3.5 py-3.5 text-[hsl(222_47%_11%)]">
          <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-[hsl(222_47%_14%/0.12)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(222_12%_42%)]">Menu</p>
          <div className="mt-3">
            <OrderLines />
          </div>
          <div className="mt-3.5 rounded-lg bg-primary py-2 text-center text-[11px] font-semibold text-white">
            Place order
          </div>
        </div>
      </div>
    </div>
  );
}

function KitchenScene() {
  return (
    <div className="grid w-full max-w-lg gap-3 sm:grid-cols-2">
      <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white/70">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-white">T09</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5">Preparing</span>
        </div>
        <p className="mt-4 text-sm text-white">Filter coffee</p>
        <p className="mt-1 text-xs text-white/50">In the kitchen</p>
      </article>
      <article className="landing-motion rounded-2xl bg-[hsl(40_33%_98%)] p-4 text-[hsl(222_47%_11%)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)] ring-1 ring-primary/40 motion-safe:animate-[landing-slide_0.55s_ease_both]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">T{storyTable}</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
        </div>
        <div className="mt-3">
          <OrderLines />
        </div>
        <p className="mt-3 text-[11px] text-[hsl(222_12%_42%)]">Just arrived</p>
      </article>
    </div>
  );
}

function FloorScene() {
  return (
    <div className="w-full max-w-md">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {floorTables.map((table) => (
          <div
            key={table.id}
            className={cn(
              "relative flex aspect-square flex-col items-center justify-center rounded-full px-1 text-center",
              table.free
                ? "border border-dashed border-white/25 text-white/45"
                : "bg-[hsl(40_33%_98%)] text-[hsl(222_47%_11%)]",
              table.hot && "ring-2 ring-primary ring-offset-2 ring-offset-[hsl(222_42%_13%)]"
            )}
          >
            {table.hot ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-3" aria-hidden>
                <span className="landing-motion absolute inline-flex size-full rounded-full bg-primary/70 motion-safe:animate-ping" />
                <span className="relative size-3 rounded-full bg-primary" />
              </span>
            ) : null}
            <span className="text-sm font-semibold">T{table.id}</span>
            <span className={cn("mt-0.5 text-[10px] leading-tight", table.free ? "text-white/45" : "text-[hsl(222_12%_42%)]")}>
              {table.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillScene() {
  return (
    <div className="w-full max-w-[17rem]">
      <div className="landing-motion rounded-2xl bg-[hsl(40_33%_98%)] px-5 py-5 text-[hsl(222_47%_11%)] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)] motion-safe:animate-[landing-rise_0.45s_ease_both]">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(222_12%_42%)]">Bill</p>
          <p className="text-[11px] text-[hsl(222_12%_42%)]">Table {storyTable}</p>
        </div>
        <div className="mt-4">
          <OrderLines />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[hsl(40_18%_88%)] pt-3 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{storyTotal}</span>
        </div>
        <div
          className="landing-motion mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white motion-safe:animate-[landing-pop_0.45s_ease_both]"
          style={{ animationDelay: "280ms" }}
        >
          <Check className="size-3.5" aria-hidden />
          Paid · table is free
        </div>
      </div>
    </div>
  );
}

const scenes = [ScanScene, KitchenScene, FloorScene, BillScene];

export function LandingWorkflow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const playingRef = useRef(playing);
  const reducedRef = useRef(reduced);

  useEffect(() => {
    playingRef.current = playing;
    reducedRef.current = reduced;
  }, [playing, reduced]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const beat = serviceStory[step];
  const Scene = scenes[step];

  function choose(index: number) {
    setStep(index);
    setPlaying(false);
  }

  function handleEnd(event: React.AnimationEvent<HTMLSpanElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.animationName !== "landing-grow") return;
    if (!playingRef.current || reducedRef.current) return;
    setStep((current) => (current + 1) % serviceStory.length);
  }

  function onTabsKeyDown(event: React.KeyboardEvent<HTMLOListElement>) {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    const next = (step + direction + serviceStory.length) % serviceStory.length;
    choose(next);
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs[next]?.focus();
  }

  return (
    <section id="workflow" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">How it works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          From the QR to a paid bill.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          It plays on its own. Tap a step to look closer.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-5 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:gap-8">
        <div className="order-2 lg:order-1">
          <ol
            role="tablist"
            aria-label="How a table works"
            onKeyDown={onTabsKeyDown}
            className="grid grid-cols-2 gap-2 lg:flex lg:flex-col"
          >
            {serviceStory.map((item, index) => {
              const active = index === step;
              const done = index < step;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="tab"
                    id={`workflow-tab-${item.id}`}
                    aria-selected={active}
                    aria-controls="workflow-stage"
                    tabIndex={active ? 0 : -1}
                    onClick={() => choose(index)}
                    className={cn(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      active
                        ? "border-primary/40 bg-card shadow-card"
                        : "border-border bg-card/80 hover:border-primary/25 hover:bg-card"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {done && !active ? <Check className="size-3.5" aria-hidden /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold tracking-tight lg:hidden">{item.short}</span>
                      <span className="hidden text-sm font-semibold tracking-tight lg:block">{item.title}</span>
                      <span className="mt-0.5 hidden text-xs leading-snug text-muted-foreground lg:block">{item.detail}</span>
                    </span>
                    {active ? (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/15">
                        {playing && !reduced ? (
                          <span
                            className="block h-full origin-left scale-x-0 bg-primary motion-safe:animate-[landing-grow_7s_linear_forwards]"
                            onAnimationEnd={handleEnd}
                          />
                        ) : (
                          <span className="block h-full w-full bg-primary" />
                        )}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div
          id="workflow-stage"
          role="tabpanel"
          aria-labelledby={`workflow-tab-${beat.id}`}
          className="order-1 overflow-hidden rounded-[1.6rem] bg-[hsl(222_47%_10%)] text-white shadow-[0_28px_70px_-36px_hsl(222_47%_11%/0.55)] ring-1 ring-white/10 lg:order-2"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <p className="truncate text-sm font-medium">{beat.title}</p>
              <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
                {serviceStory.map((item, index) => (
                  <span
                    key={item.id}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      index === step ? "w-6 bg-primary" : "w-1.5 bg-white/30"
                    )}
                  />
                ))}
              </div>
            </div>
            {reduced ? (
              <p className="shrink-0 text-xs text-white/60">Tap a step</p>
            ) : (
              <button
                type="button"
                aria-pressed={playing}
                onClick={() => setPlaying((value) => !value)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-medium text-white/85 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {playing ? <Pause className="size-3.5" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
                {playing ? "Pause" : "Play"}
              </button>
            )}
          </div>

          <div className="mx-3 overflow-hidden rounded-2xl border border-white/10 bg-[hsl(222_42%_13%)] sm:mx-4">
            <div key={beat.id} className="flex min-h-[24rem] items-center justify-center px-4 py-8 sm:min-h-[22rem] sm:px-8">
              <Scene />
            </div>
          </div>

          <div className="px-5 py-4 sm:px-6">
            <p className="max-w-xl text-sm leading-relaxed text-white/75 sm:text-base" aria-live="polite">
              {beat.line}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
