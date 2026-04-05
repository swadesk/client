const STATIC_CACHE = "qryte-static-v3";
const RUNTIME_CACHE = "qryte-runtime-v3";

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
    self.registration.showNotification(payload.title || "NamasQr", {
      body: payload.body || "",
      icon: payload.icon || "/icons/pwa-192.svg",
      badge: payload.badge || "/icons/pwa-192.svg",
      tag: String(payload.tag || "qryte-push"),
      data: { url: targetUrl },
      vibrate: [80],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const url =
    typeof raw === "string" && raw.length > 0
      ? raw
      : new URL("/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("navigate" in client && typeof client.navigate === "function") {
          return client.navigate(url).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
