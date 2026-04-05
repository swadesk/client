"use client";

import * as React from "react";
import { isPwaPushRuntimeEnabled } from "@/lib/web-push-client";

export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Without SW: avoid stale SW/cache in dev (ChunkLoadError). Enable SW when production or NEXT_PUBLIC_ENABLE_PUSH.
    if (!isPwaPushRuntimeEnabled()) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        void Promise.all(registrations.map((registration) => registration.unregister()));
      });

      if ("caches" in window) {
        void caches.keys().then((keys) => {
          void Promise.all(
            keys
              .filter((key) => key.startsWith("qryte-") || key.startsWith("workbox-"))
              .map((key) => caches.delete(key)),
          );
        });
      }
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return null;
}
