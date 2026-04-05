"use client";

import * as React from "react";

export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In local dev, stale SW/cache can serve outdated chunk URLs and cause ChunkLoadError.
    // Keep dev SW-free and clear old registrations/caches proactively.
    if (process.env.NODE_ENV !== "production") {
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
