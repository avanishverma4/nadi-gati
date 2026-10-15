// Firebase Cloud Messaging (FCM) Service Worker fallback
// Serwist compiles /public/sw.js from /app/sw.ts to handle Web Push and offline caching; this file
// only handles push messages if it is ever registered instead.
//
// It used to load the Firebase compat SDK from gstatic.com without ever initialising it. That did
// nothing useful, and if the download failed (offline, blocked CDN) the whole worker failed to
// install. Showing a push needs nothing beyond the standard service worker APIs used below.

self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || data.data?.title || "Nadi-Gati Flood Alert";
      const options = {
        body: data.notification?.body || data.data?.body || "Water level warning updated for your district.",
        icon: "/pwa-192x192.png",
        badge: "/icon.svg",
        data: data.data || {},
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (_err) {
      // Non-JSON payload
      event.waitUntil(
        self.registration.showNotification("Nadi-Gati Flood Alert", {
          body: event.data.text(),
          icon: "/pwa-192x192.png",
        })
      );
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const clickAction = event.notification.data?.click_action || event.notification.data?.url || "/districts";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(clickAction) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
