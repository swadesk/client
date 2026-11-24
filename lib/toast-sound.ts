"use client";

let sharedCtx: AudioContext | null = null;
let lastChimeAt = 0;

/** Collapse the toast wrapper + bridge firing the same alert twice. */
const CHIME_DEDUP_MS = 280;
/** Push echo arriving just after the in-app alert should not ring again. */
const ORDER_ECHO_MS = 2200;

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
 * Order alerts are operational, so reduced-motion does not mute them.
 */
export function unlockToastAudio(): void {
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
    osc.type = "triangle";
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

/** Near full scale. Triangle stays clean; a short attack keeps it from clicking. */
function pulse(ctx: AudioContext, start: number, freq: number, dur: number, peak: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.03);
}

/** One loud two-note chime — used for ordinary toasts so they are actually audible. */
function scheduleBeep(ctx: AudioContext, toastType: string): void {
  const t0 = ctx.currentTime + 0.01;
  if (toastType === "error") {
    pulse(ctx, t0, 392, 0.2, 0.82);
    pulse(ctx, t0 + 0.16, 294, 0.28, 0.88);
    return;
  }
  pulse(ctx, t0, 784, 0.16, 0.82);
  pulse(ctx, t0 + 0.14, 1046, 0.24, 0.9);
}

/** Repeating doorbell for new orders and added items. Loud enough for a dining room. */
function scheduleOrderAlert(ctx: AudioContext): void {
  const t0 = ctx.currentTime + 0.01;
  const ring = (offset: number) => {
    pulse(ctx, t0 + offset, 784, 0.16, 0.92);
    pulse(ctx, t0 + offset + 0.14, 1174, 0.24, 0.98);
  };
  ring(0);
  ring(0.5);
}

function runWhenAudible(ctx: AudioContext, play: () => void): void {
  const run = () => {
    try {
      play();
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

/** True when an alert just played, so a late push echo can stay quiet. */
export function orderAlertPlayedRecently(windowMs = ORDER_ECHO_MS): boolean {
  return Date.now() - lastChimeAt < windowMs;
}

/** Plays a short chime. Call from user input handlers when possible; otherwise relies on prior unlock. */
export function playToastSound(toastType?: string): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastChimeAt < CHIME_DEDUP_MS) return;
  lastChimeAt = now;

  const ctx = getCtx();
  if (!ctx) return;
  const type = toastType ?? "normal";
  runWhenAudible(ctx, () => scheduleBeep(ctx, type));
}

/** Loud repeating chime for order and team alerts managers must not miss. */
export function playOrderAlert(): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (now - lastChimeAt < CHIME_DEDUP_MS) return;
  lastChimeAt = now;

  const ctx = getCtx();
  if (!ctx) return;
  runWhenAudible(ctx, () => scheduleOrderAlert(ctx));
}
