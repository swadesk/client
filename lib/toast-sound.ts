"use client";

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

/** Call after a user gesture so the first toast can play in strict browser policies. */
export function unlockToastAudio(): void {
  const ctx = getCtx();
  if (ctx?.state === "suspended") void ctx.resume();
}

const NOTE_BY_TYPE: Record<string, number> = {
  success: 784,
  error: 196,
  warning: 587,
  info: 659,
  default: 587,
  normal: 587,
};

export function playToastSound(toastType?: string): void {
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => {});

  const type = toastType ?? "normal";
  const freq = NOTE_BY_TYPE[type] ?? NOTE_BY_TYPE.normal;
  const peak = type === "error" ? 0.11 : 0.075;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  const t0 = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.17);
}
