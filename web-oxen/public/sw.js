/* SAFARIO Service Worker — offline-first cache, background sync, auto-update.
 * Strategy:
 *  - Precache app shell (HTML, JS, CSS, icons).
 *  - Cache-first for static assets (fonts, images, icons).
 *  - Stale-while-revalidate for same-origin GET requests.
 *  - Network-first for navigation (HTML) with offline fallback.
 *  - Bypass for Supabase / auth / API POST requests.
 */
const CACHE_VERSION = "safario-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(?:png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|css|js|wasm)$/i.test(url.pathname)
  );
}

function isApiRequest(url) {
  return (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("rork.app") ||
    url.hostname.includes("rork.live") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin && isApiRequest(url)) return;
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (isStaticAsset(url) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(request));
    return;
  }
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

async function networkFirstNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, fresh.clone()).catch(() => undefined);
    }
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((fresh) => {
      if (fresh.ok) cache.put(request, fresh.clone()).catch(() => undefined);
      return fresh;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
