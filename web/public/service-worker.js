// Bump the version on every palette/asset refresh so installed PWAs flush
// their cache on next load. The `activate` handler purges old caches.
const CACHE_VERSION = "ente-nadu-v3";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const REPORTS_CACHE = `${CACHE_VERSION}-reports`;
const APP_FALLBACK = "/app";
const STATIC_ASSETS = [
  APP_FALLBACK,
  "/manifest.webmanifest",
  "/icons/logo.svg",
  "/icons/logo-mark.svg",
  "/icons/maskable-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => Promise.resolve()),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

function isReportListRequest(url) {
  return url.pathname === "/v1/reports" || url.pathname.startsWith("/v1/reports?");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(APP_FALLBACK)));
    return;
  }

  if (isReportListRequest(requestUrl)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(REPORTS_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response("{}", { status: 200 }))),
    );
    return;
  }

  if (requestUrl.origin === self.location.origin && isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
      }),
    );
  }
});

