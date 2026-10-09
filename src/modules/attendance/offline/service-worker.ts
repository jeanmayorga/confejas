/// <reference lib="webworker" />
import { synchronizeAttendance } from "./sync";
declare const self: ServiceWorkerGlobalScope;
declare const PRECACHE: string[];
declare const CACHE_VERSION: string;
const cacheName = `confejas-attendance-${CACHE_VERSION}`;
const shell = "/attendance-shell.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      // Installation is atomic: a failed download leaves the previous worker usable.
      await cache.addAll([
        shell,
        "/pwa-192.png",
        "/pwa-512.png",
        "/logo.png",
        "/manifest.webmanifest",
        ...PRECACHE,
      ]);
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // No skipWaiting: activate only after old clients close, then remove old builds.
      for (const key of await caches.keys()) {
        if (key.startsWith("confejas-attendance-") && key !== cacheName)
          await caches.delete(key);
      }
      // Only public assets are cached; private API responses never are.
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin)
    return;
  if (
    event.request.mode === "navigate" &&
    ["/asistencia", "/asistencia/", "/dashboard/attendance"].includes(
      url.pathname,
    )
  ) {
    event.respondWith(
      caches
        .open(cacheName)
        .then(
          async (cache) => (await cache.match(shell)) ?? fetch(event.request),
        ),
    );
  } else if (
    PRECACHE.includes(url.pathname) ||
    ["/logo.png", "/pwa-192.png", "/pwa-512.png"].includes(url.pathname)
  ) {
    event.respondWith(
      caches
        .open(cacheName)
        .then(
          async (cache) =>
            (await cache.match(url.pathname)) ?? fetch(event.request),
        ),
    );
  }
});
self.addEventListener("sync", ((event: ExtendableEvent & { tag: string }) => {
  if (event.tag !== "attendance-pending") return;
  event.waitUntil(
    synchronizeAttendance().then((result) => {
      if (result.state === "offline" || result.state === "busy")
        throw new Error("Retry when connectivity returns");
    }),
  );
}) as EventListener);
