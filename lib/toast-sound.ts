"use client";

import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new ctor();
  }
  return sharedCtx;
}

/**
 * Run during a pointer/key gesture so WebAudio is allowed to start (autoplay policy).
 */
export function unlockToastAudio(): void {
  if (prefersReducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignore */
  }
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 440;
    gain.gain.setValueAtTime(0.00001, t0);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.001);
  } catch {
    /* ignore: primes graph on Safari */
  }
}

const NOTE_BY_TYPE: Record<string, number> = {
  success: 880,
  error: 220,
  warning: 587,
  info: 659,
  default: 740,
  normal: 740,
};

function scheduleBeep(ctx: AudioContext, toastType: string): void {
  const type = toastType || "normal";
  const freq = NOTE_BY_TYPE[type] ?? NOTE_BY_TYPE.normal;
  const peak = type === "error" ? 0.18 : 0.14;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.linearRampToValueAtTime(0.001, t0 + 0.22);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.23);
}

let lastChimeAt = 0;
const CHIME_DEDUP_MS = 140;

/** Plays a short chime. Call from user input handlers when possible; otherwise relies on prior unlock. */
export function playToastSound(toastType?: string): void {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  const now = Date.now();
  if (now - lastChimeAt < CHIME_DEDUP_MS) return;
  lastChimeAt = now;

  const ctx = getCtx();
  if (!ctx) return;

  const run = () => {
    try {
      scheduleBeep(ctx, toastType ?? "normal");
    } catch {
      /* ignore */
    }
  };

  if (ctx.state === "running") {
    run();
    return;
  }

  try {
    void ctx.resume().then(run).catch(run);
  } catch {
    run();
  }
}
