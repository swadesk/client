"use client";

import { getApiAccessToken } from "@/lib/api-access-token";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` from `npx web-push generate-vapid-keys` (URL-safe base64). */
export function getVapidPublicKey(): string | null {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

/**
 * When true, the app registers `public/sw.js` and may show the Push alerts control (if VAPID is set).
 * - Normal: `NODE_ENV === "production"` on deploy.
 * - Preview/staging (or local HTTPS push tests): set `NEXT_PUBLIC_ENABLE_PUSH=1`.
 */
export function isPwaPushRuntimeEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_ENABLE_PUSH?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  return process.env.NODE_ENV === "production";
}

export function canSubscribeWebPush(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(getVapidPublicKey())
  );
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeWebPush(): Promise<PushSubscription | null> {
  const key = getVapidPublicKey();
  if (!key) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const keyBuffer = urlBase64ToUint8Array(key);
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBuffer as BufferSource,
  });
}

export async function unregisterWebPush(): Promise<boolean> {
  const sub = await getExistingPushSubscription();
  if (!sub) return true;
  await sub.unsubscribe();
  return true;
}

export type PushRegisterPayload = {
  subscription: PushSubscriptionJSON;
  restaurantId?: string | null;
};

/** POST subscription JSON to Next (proxies to API). */
export async function registerPushSubscriptionWithServer(
  payload: PushRegisterPayload,
): Promise<Response> {
  const token = getApiAccessToken();
  return fetch("/api/push/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}
