// Sharenote service worker: instant repeat visits and offline tools.
// Pages: network first, cached copy when offline. Fonts, art, scripts, styles: cache first (they are content-hashed or versioned).
const VERSION = "sn-v2-1";
const PRECACHE = ["/", "/tools/", "/tools/mint/", "/tools/zbit/", "/tools/sum/", "/tools/planner/", "/specs/", "/learn/", "/assets/bill-blank.webp", "/assets/logo.webp", "/assets/rosette.svg", "/fonts/SharenoteZ.woff2", "/manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return r; }).catch(() => caches.match(req).then((r) => r || caches.match("/"))));
    return;
  }
  if (/^\/(_astro|assets|fonts|icons)\//.test(url.pathname) || url.pathname === "/search.json") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return r; })));
  }
});
