// Retire previously installed attendance workers without deleting local records.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("confejas-attendance-")).map((key) => caches.delete(key)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: "window" });
    await Promise.all(windows.map((client) => {
      const path = new URL(client.url).pathname;
      if (["/asistencia", "/asistencia/", "/dashboard/attendance"].includes(path)) {
        return client.navigate("/dashboard/companies");
      }
    }));
  })());
});
