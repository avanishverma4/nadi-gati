"use client";

import { useEffect } from "react";

/**
 * In production, @serwist/next registers /sw.js by itself (its `register` option defaults to
 * true), so this component doesn't register anything. Registering here as well did the same job
 * twice, and only after the window `load` event, which had often already fired.
 *
 * In development Serwist is disabled, so this removes any service worker left over from a
 * production build that would otherwise keep serving stale dev assets.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) {
      return;
    }
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }, []);

  return null;
}
