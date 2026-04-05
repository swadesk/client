"use client";

import * as React from "react";
import { useSonner } from "sonner";
import type { ToastT } from "sonner";
import { playToastSound, unlockToastAudio } from "@/lib/toast-sound";

function extractText(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "function") {
    try {
      return extractText((node as () => unknown)());
    } catch {
      return null;
    }
  }
  return null;
}

function toastSummary(t: ToastT): string {
  const title = extractText(t.title);
  const desc = extractText(t.description);
  if (title && desc) return `${title} · ${desc}`;
  if (title) return title;
  if (desc) return desc;
  return "New activity";
}

function notifyIfBackground(toast: ToastT): void {
  if (typeof window === "undefined") return;
  if (window.document.visibilityState !== "hidden") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const body = toastSummary(toast);
  try {
    new Notification("qRyte", {
      body: body.slice(0, 220),
      tag: `qryte-toast-${String(toast.id)}`,
      silent: false,
    });
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(36);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Plays a short sound for every Sonner toast (except loading) and shows a system notification
 * when the tab is in the background so alerts are noticeable when toast UI is not visible.
 */
export function ToastSoundBridge() {
  const { toasts } = useSonner();
  const typeByIdRef = React.useRef<Map<string | number, string>>(new Map());

  React.useEffect(() => {
    const unlock = () => unlockToastAudio();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  React.useEffect(() => {
    const map = typeByIdRef.current;
    const alive = new Set<string | number>();

    for (const t of toasts) {
      alive.add(t.id);
      const type = t.type ?? "normal";

      if (type === "loading") {
        map.set(t.id, type);
        continue;
      }

      const prev = map.get(t.id);
      const isNew = prev === undefined;
      const fromLoading = prev === "loading";

      if (isNew || fromLoading) {
        playToastSound(type);
        notifyIfBackground(t);
      }

      map.set(t.id, type);
    }

    for (const id of [...map.keys()]) {
      if (!alive.has(id)) map.delete(id);
    }
  }, [toasts]);

  return null;
}
