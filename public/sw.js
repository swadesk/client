const STATIC_CACHE = "qryte-static-v4";
const RUNTIME_CACHE = "qryte-runtime-v4";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(["/", "/manifest.webmanifest"]);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Never cache or intercept Next.js assets/HMR — avoids ChunkLoadError and malformed /_next/ URLs.
  if (url.pathname.startsWith("/_next/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});

/** Web Push while PWA is backgrounded or closed (payload from your server). */
self.addEventListener("push", (event) => {
  let payload = {
    title: "NamasQr",
    body: "You have a new notification",
    url: "/dashboard",
    tag: "qryte-push",
  };
  if (event.data) {
    try {
      const json = event.data.json();
      if (json && typeof json === "object") {
        payload = { ...payload, ...json };
      }
    } catch {
      const text = event.data.text();
      if (text) payload = { ...payload, body: text };
    }
  }

  const targetUrl = new URL(payload.url || "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const tag = String(payload.tag || "qryte-push");
      await self.registration.showNotification(payload.title || "NamasQr", {
        body: payload.body || "",
        icon: payload.icon || "/icons/pwa-192.svg",
        badge: payload.badge || "/icons/pwa-192.svg",
        tag,
        renotify: true,
        requireInteraction: true,
        silent: false,
        data: { url: targetUrl },
        vibrate: [200, 80, 200, 80, 280],
      });
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        client.postMessage({ type: "qryte-alert", tag });
      }
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let raw = typeof data.url === "string" ? data.url : "";
  if (!raw) raw = "/dashboard";
  let target;
  try {
    target = new URL(raw, self.location.origin).href;
  } catch {
    target = new URL("/dashboard", self.location.origin).href;
  }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (typeof client.url !== "string" || !client.url.startsWith(self.location.origin)) {
          continue;
        }

        try {
          if ("navigate" in client && typeof client.navigate === "function") {
            const navResult = client.navigate(target);
            if (navResult != null && typeof navResult.then === "function") {
              await navResult.catch(() => {});
            }
          }
          if ("focus" in client && typeof client.focus === "function") {
            return await client.focus();
          }
        } catch {
          /* try next client */
        }
      }

      if (self.clients.openWindow) {
        const w = await self.clients.openWindow(target);
        if (w) return w;
      }
    })(),
  );
});
