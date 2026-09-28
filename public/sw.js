// Service Worker for Bravura AI PWA
const CACHE_NAME = "bravura-ai-cache-v1";
const PRECACHE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
  "/ai-logo.jpg",
  "/ai-chat.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("Pre-caching partial failure (normal in dev):", err);
        });
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Do not intercept non-GET requests or API requests (especially AI streaming / LLM / auth)
  if (
    request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Network-first strategy for navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match("/") || caches.match(request);
      }),
    );
    return;
  }

  // Cache-first strategy with background revalidation for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidate in background
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic"
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      });
    }),
  );
});
