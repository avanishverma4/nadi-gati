/// <reference lib="webworker" />
// Service worker source. Serwist compiles it to public/sw.js at build time (see next.config.ts);
// it is disabled in development.
/* eslint-disable no-unused-vars */
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Precaches the app shell and applies the caching rules below, checked in order (first match wins)
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // 0. Unsubscribe links carry a secret token in the URL. Never store them on the device, where
    // anyone with the phone (or the browser's cache) could read the token back.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/alerts/unsubscribe") ||
        url.pathname.startsWith("/unsubscribe") ||
        url.searchParams.has("token"),
      handler: new NetworkOnly(),
    },
    // 1. Navigation / App-Shell requests - Network-first with fast timeout, falling back to cached shell.
    // Kept for a day only: on a slow connection the 3 s timeout often falls back to the cache,
    // and a week-old page would show week-old river levels as if they were current.
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "nadi-pages-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          }),
        ],
      }),
    },
    // 2. Next.js Static Chunks (JS/CSS)
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new StaleWhileRevalidate({
        cacheName: "nadi-static-chunks",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 80,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          }),
        ],
      }),
    },
    // 3. Static Icons, Images & Web Assets
    {
      matcher: ({ request, url }) =>
        request.destination === "image" ||
        url.pathname.endsWith(".svg") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".webp") ||
        url.pathname.endsWith(".ico"),
      handler: new StaleWhileRevalidate({
        cacheName: "nadi-media-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 80,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    // 4. Web Fonts (Google Fonts stylesheets & font binaries)
    {
      matcher: ({ url }) =>
        url.origin === "https://fonts.googleapis.com" ||
        url.origin === "https://fonts.gstatic.com",
      handler: new CacheFirst({
        cacheName: "nadi-fonts-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          }),
        ],
      }),
    },
    // 5. Read-only API queries - Network-first with 3s timeout. Only successful answers are kept
    // (a "busy, try again" 429/503 must not be replayed from the cache), and only for a few hours,
    // since river flow and place lookups are the kind of data that goes stale.
    {
      matcher: ({ url, request }) =>
        url.pathname.startsWith("/api/") &&
        request.method === "GET" &&
        !url.pathname.startsWith("/api/health"),
      handler: new NetworkFirst({
        cacheName: "nadi-api-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 40,
            maxAgeSeconds: 6 * 60 * 60,
          }),
        ],
      }),
    },
    // 6. Default fallback cache from Serwist for other assets
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Shows flood alert push messages. Nothing sends them yet (ALERTS_ENABLED in lib/features.ts is
// off); the handler is ready for when alert delivery is built.
self.addEventListener("push", (event: any) => {
  let title = "Nadi-Gati Flood Alert";
  let body = "Hydrological threshold updated in your monitored district.";
  let data: Record<string, any> = {};

  try {
    if (event.data) {
      const payload = event.data.json();
      title = payload.notification?.title || payload.data?.title || title;
      body = payload.notification?.body || payload.data?.body || body;
      data = payload.data || {};
    }
  } catch (_err) {
    if (event.data) {
      body = event.data.text() || body;
    }
  }

  const options: any = {
    body,
    icon: "/pwa-192x192.png",
    badge: "/icon.svg",
    tag: data.tag || "flood-alert",
    renotify: true,
    data: {
      url: data.click_action || data.url || "/districts",
      unsubscribeUrl: data.unsubscribeUrl || null,
      ...data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping a notification focuses an open tab already on the alert's page, or opens one
self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/districts";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList: readonly Client[]) => {
      for (const client of clientList) {
        if ("navigate" in client && (client as WindowClient).url.includes(targetUrl)) {
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

