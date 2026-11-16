import type { APIRoute } from "astro";
// The service worker, generated at build so its cache version changes with every deploy.
// Hashed bundles (/_astro/) are immutable: cache first. Art, fonts, icons and the search index keep stable
// names, so they are served from cache and refreshed in the background (stale-while-revalidate).
// Pages: network first, the cached copy when offline.
const VERSION = "sn-" + Date.now().toString(36);
const PRECACHE = ["/", "/tools/", "/tools/mint/", "/tools/zbit/", "/tools/sum/", "/tools/planner/", "/specs/", "/learn/", "/assets/bill-600.webp", "/assets/logo.webp", "/assets/rosette.svg", "/fonts/SharenoteZ.woff2", "/manifest.webmanifest"];
const body = `const VERSION = ${JSON.stringify(VERSION)};
const PRECACHE = ${JSON.stringify(PRECACHE)};
const put = (req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; };
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === "navigate") { e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match(req).then((r) => r || caches.match("/")))); return; }
  if (url.pathname.startsWith("/_astro/")) { e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => put(req, r)))); return; }
  if (/^\\/(assets|fonts|icons)\\//.test(url.pathname) || url.pathname === "/search.json" || url.pathname === "/manifest.webmanifest") {
    e.respondWith(caches.match(req).then((hit) => { const fresh = fetch(req).then((r) => put(req, r)).catch(() => hit); if (hit) { e.waitUntil(fresh); return hit; } return fresh; }));
  }
});
`;
export const GET: APIRoute = () => new Response(body, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
