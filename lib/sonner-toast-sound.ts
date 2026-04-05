"use client";

import { toast } from "sonner";
import { playToastSound } from "@/lib/toast-sound";

const PATCHED = "__qryteToastSoundPatched";

type SoundKind = NonNullable<Parameters<typeof playToastSound>[0]>;

/** Wrap Sonner entry points so beeps run in the same turn as user gestures (click → toast.success). */
export function installSonnerToastSound(): void {
  if (typeof window === "undefined") return;
  const mark = toast as unknown as Record<string, unknown>;
  if (mark[PATCHED]) return;
  mark[PATCHED] = true;

  const wrap = (key: "success" | "error" | "info" | "warning" | "message", kind: SoundKind) => {
    const t = toast as unknown as Record<string, (msg: unknown, data?: unknown) => unknown>;
    const original = t[key].bind(toast);
    t[key] = (msg, data) => {
      playToastSound(kind);
      return original(msg, data);
    };
  };

  wrap("success", "success");
  wrap("error", "error");
  wrap("info", "info");
  wrap("warning", "warning");
  wrap("message", "normal");
}
